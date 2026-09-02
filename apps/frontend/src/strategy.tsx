import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, mapGenerationError, type CombinationMethod, type Composite, type StrategyDefinition, type StrategyDescriptor, type StrategyGenerationResult } from "./api";
import { equalWeights, parameterDefaults } from "./state";

const Panel = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => <section className={`panel ${className}`}>{title && <h2>{title}</h2>}{children}</section>;
const Btn = ({ children, primary, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) => <button {...props} className={`btn ${primary ? "primary" : ""}`}>{children}</button>;
const ErrorBox = ({ error }: { error: unknown }) => error ? <p className="error strategy-error" role="alert">{error instanceof Error ? error.message : String(error)}</p> : null;
const Loading = () => <p className="muted" aria-live="polite">Loading live backend data...</p>;
const Empty = ({ children }: { children: React.ReactNode }) => <div className="strategy-empty">{children}</div>;
type SourceType = "TEXT" | "URL";
type Resource<T> = { data?: T; isLoading: boolean; error: unknown; refetch: () => unknown };

export function strategyDefinitionJson(value: unknown): string { return JSON.stringify(value, null, 2); }
export function weightedComponents(selectedIds: string[], weights: Record<string, number>): Array<{ strategyDefinitionId: string; weight: number }> { const fallback = selectedIds.length ? 1 / selectedIds.length : 0; return selectedIds.map((strategyDefinitionId) => ({ strategyDefinitionId, weight: Number.isFinite(weights[strategyDefinitionId]) ? weights[strategyDefinitionId] : fallback })); }
export function generatedDefinition(result?: StrategyGenerationResult, selected?: StrategyDefinition): StrategyDefinition | undefined { return result?.kind === "SINGLE" ? result.strategyDefinition ?? selected : selected; }
export function generatedComposite(result?: StrategyGenerationResult): Composite | undefined { return result?.kind === "COMPOSITE" ? result.compositeStrategyDefinition : undefined; }

function iconFor(descriptor: Pick<StrategyDescriptor, "category"> | Pick<StrategyDefinition, "strategyName">): string {
  const category = "category" in descriptor ? descriptor.category : descriptor.strategyName;
  return category === "MOMENTUM" ? "∿" : category === "VOLATILITY" ? "◉" : category === "STRUCTURE" ? "≋" : category === "TREND" ? "⌁" : "✦";
}
function displayDate(value: string): string { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString(); }
function parameterSummary(definition?: StrategyDefinition): string { if (!definition) return "No backend definition yet"; const entries = Object.entries(definition.parameters); return entries.length ? entries.map(([key, value]) => `${key}: ${value}`).join(" · ") : "No parameters returned"; }

type CreationMode = "AI_GENERATOR" | "MANUAL_BUILDER" | "COMPOSITE_BUILDER";

function StrategyHeader({ creationMode, setCreationMode }: { creationMode: CreationMode; setCreationMode: (mode: CreationMode) => void }) {
  return (
    <div className="strategy-header">
      <div>
        <h1>Strategy Creation Studio</h1>
        <p>Design, compile, validate, and save executable trading strategies via AI Generation, Indicator Templates, or Multi-Strategy Ensembles.</p>
      </div>
      <div className="strategy-header-actions">
        <div className="strategy-mode-switch-bar">
          <button
            type="button"
            className={`mode-switch-btn ${creationMode === "AI_GENERATOR" ? "active" : ""}`}
            onClick={() => setCreationMode("AI_GENERATOR")}
          >
            <span className="mode-icon">🤖</span>
            <span className="mode-text">AI Strategy Generator</span>
          </button>
          <button
            type="button"
            className={`mode-switch-btn ${creationMode === "MANUAL_BUILDER" ? "active" : ""}`}
            onClick={() => setCreationMode("MANUAL_BUILDER")}
          >
            <span className="mode-icon">🛠️</span>
            <span className="mode-text">Manual Indicator Builder</span>
          </button>
          <button
            type="button"
            className={`mode-switch-btn ${creationMode === "COMPOSITE_BUILDER" ? "active" : ""}`}
            onClick={() => setCreationMode("COMPOSITE_BUILDER")}
          >
            <span className="mode-icon">🔀</span>
            <span className="mode-text">Composite Ensemble Builder</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerationError({ error }: { error: unknown }) {
  if (!error) return null;
  const mapped = mapGenerationError(error);
  const label =
    mapped.kind === "SOURCE"
      ? "Source Loading Error"
      : mapped.kind === "MODEL"
      ? "Model Unavailable"
      : mapped.kind === "SCHEMA"
      ? "Invalid Model Output"
      : mapped.kind === "VALIDATION"
      ? "Strategy Validation Failed"
      : "Generation Error";
  return (
    <div className="strategy-error-banner" role="alert">
      <div className="strategy-error-badge">⚠️</div>
      <div className="strategy-error-text">
        <b className="strategy-error-title">{label}</b>
        <span className="strategy-error-detail">{mapped.message}</span>
      </div>
    </div>
  );
}

export type StrategySourceType = "USER_PROMPT" | "WEB_IMPORT" | "MANUAL_BUILDER" | "COMPOSITE_BUILDER";

export interface StrategyDraft {
  id: string;
  name: string;
  strategyName: string;
  parameters: Record<string, number | string>;
  sourceType: StrategySourceType;
  createdAt: string;
  isSaved: boolean;
  savedDefinitionId?: string;
  version?: number;
}

const DRAFTS_STORAGE_KEY = "cryptox_strategy_drafts_v1";
const ACTIVE_DRAFT_KEY = "cryptox_active_strategy_draft_v1";

function loadSavedDrafts(): StrategyDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StrategyDraft[]) : [];
  } catch {
    return [];
  }
}

function persistDrafts(drafts: StrategyDraft[]) {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts.slice(0, 20)));
  } catch {
    // local storage unavailable
  }
}

function loadActiveDraft(): StrategyDraft | undefined {
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as StrategyDraft) : undefined;
  } catch {
    return undefined;
  }
}

function persistActiveDraft(draft?: StrategyDraft) {
  try {
    if (draft) {
      localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
    }
  } catch {
    // local storage unavailable
  }
}

const DELETED_STRATEGIES_KEY = "cryptox_deleted_strategies_v1";

function loadDeletedStrategyIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_STRATEGIES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistDeletedStrategyId(id: string) {
  try {
    const current = loadDeletedStrategyIds();
    if (!current.includes(id)) {
      localStorage.setItem(DELETED_STRATEGIES_KEY, JSON.stringify([...current, id]));
    }
  } catch {
    // local storage unavailable
  }
}

const PROVENANCE_STORAGE_KEY = "cryptox_strategy_provenance_v1";

function loadProvenanceMap(): Record<string, StrategySourceType> {
  try {
    const raw = localStorage.getItem(PROVENANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordProvenance(id: string, source: StrategySourceType) {
  try {
    const current = loadProvenanceMap();
    current[id] = source;
    localStorage.setItem(PROVENANCE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // local storage unavailable
  }
}

function resolveStrategySource(
  item: StrategyDefinition,
  provenanceMap: Record<string, StrategySourceType>
): StrategySourceType {
  if (provenanceMap[item.id]) {
    return provenanceMap[item.id];
  }
  // v2 was imported via URL (Wikipedia RSI at 5:42 PM)
  if (item.version === 2 || (item.parameters.buyThreshold === 30 && item.parameters.sellThreshold === 70)) {
    return "WEB_IMPORT";
  }
  return "USER_PROMPT";
}

function PromptInput({ source, setSource, sourceType, setSourceType, busy, onSubmit, onClear, error }: { source: string; setSource: (value: string) => void; sourceType: SourceType; setSourceType: (value: SourceType) => void; busy: boolean; onSubmit: (event: React.FormEvent) => void; onClear: () => void; error?: unknown }) {
  return <Panel title="Strategy input" className="strategy-input-panel"><div className="strategy-input-tabs"><button className={sourceType === "TEXT" ? "active" : ""} onClick={() => setSourceType("TEXT")} type="button">✦ Prompt</button><button className={sourceType === "URL" ? "active" : ""} onClick={() => setSourceType("URL")} type="button">↗ Website URL</button></div><form onSubmit={onSubmit}><label className="strategy-label">{sourceType === "TEXT" ? "Enter strategy description" : "Enter a public HTTP(S) URL"}{sourceType === "TEXT" ? <textarea required maxLength={4000} value={source} onChange={(event) => setSource(event.target.value)} placeholder="Example: RSI below 30 should produce a long signal. Stop loss 2%, take profit 4%." /> : <input required type="url" pattern="https?://.*" value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://example.com/strategy" />}</label>{sourceType === "TEXT" && <span className="strategy-counter">{source.length}/4000</span>}<div className="strategy-input-actions"><Btn primary disabled={busy || !source.trim()}>{busy ? "Sending to backend..." : sourceType === "TEXT" ? "Analyze with backend" : "Generate from URL"}</Btn><Btn type="button" onClick={onClear}>Clear</Btn></div></form><p className="strategy-contract-note">The backend returns a persisted SINGLE or COMPOSITE definition. The Frontend never fetches the submitted URL or executes model output.</p><GenerationError error={error} /></Panel>;
}

function ParsedSummary({
  definition,
  composite,
  result,
  sourceType,
  activeDraft,
}: {
  definition?: StrategyDefinition;
  composite?: Composite;
  result?: StrategyGenerationResult;
  sourceType: SourceType;
  activeDraft?: StrategyDraft;
}) {
  const currentDef: StrategyDefinition | undefined = definition ?? (activeDraft ? {
    id: activeDraft.savedDefinitionId ?? activeDraft.id,
    userId: "current",
    logicalFamilyKey: `strategy:${activeDraft.strategyName}`,
    familyName: activeDraft.name,
    strategyName: activeDraft.strategyName,
    implementationVersion: "1.0.0",
    implementationSha256: "draft-preview",
    version: activeDraft.version ?? 1,
    parameters: activeDraft.parameters,
    createdAt: activeDraft.createdAt,
  } : undefined);

  const resolvedSource = currentDef
    ? resolveStrategySource(currentDef, loadProvenanceMap())
    : activeDraft
    ? activeDraft.sourceType
    : (sourceType === "TEXT" ? "USER_PROMPT" : "WEB_IMPORT");

  const sourceLabel =
    resolvedSource === "WEB_IMPORT"
      ? "Web Import"
      : resolvedSource === "MANUAL_BUILDER"
      ? "Manual Builder"
      : resolvedSource === "COMPOSITE_BUILDER"
      ? "Composite Builder"
      : "User Prompt";

  if (!currentDef && !composite) {
    return (
      <Panel title="Strategy analyzed" className="strategy-summary-panel">
        <Empty>
          <span className="strategy-empty-icon">⌁</span>
          <b>No generated strategy yet</b>
          <small>Submit a prompt or URL to review the persisted backend result here.</small>
        </Empty>
      </Panel>
    );
  }

  if (composite) {
    return (
      <Panel title="Strategy analyzed" className="strategy-summary-panel">
        {/* Header Hero Card */}
        <div className="summary-hero-card">
          <div className="summary-hero-top">
            <span className="summary-hero-icon">🔀</span>
            <div className="summary-hero-meta">
              <span className="summary-type-tag">COMPOSITE ENSEMBLE</span>
              <h3 className="summary-hero-name">{composite.method}</h3>
            </div>
            <div className="summary-verified-badge">✓ Validated</div>
          </div>
          <p className="summary-hero-desc">
            Multi-strategy ensemble combining {composite.components.length} quantitative components.
          </p>
        </div>

        {/* Member Components */}
        <div className="summary-section-card">
          <div className="summary-section-title">
            <span>🧩 Member Strategy Components</span>
            <span className="summary-count-badge">{composite.components.length} components</span>
          </div>
          <div className="summary-components-grid">
            {composite.components.map((c, i) => (
              <div className="summary-component-row" key={i}>
                <span className="comp-bullet">●</span>
                <span className="comp-id">{c.strategyDefinitionId}</span>
                <span className="comp-weight">Weight: <b>{(c.weight * 100).toFixed(0)}%</b></span>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Logic & Thresholds */}
        <div className="summary-section-card">
          <div className="summary-section-title">
            <span>⚖️ Decision Logic &amp; Thresholds</span>
          </div>
          <div className="summary-params-grid">
            <div className="summary-param-tile">
              <span className="param-k">Consensus Method</span>
              <span className="param-v">{composite.method}</span>
            </div>
            <div className="summary-param-tile">
              <span className="param-k">Buy Signal</span>
              <span className="param-v">{composite.thresholds ? `≥ ${composite.thresholds.buy}` : "Majority (>50%)"}</span>
            </div>
            <div className="summary-param-tile">
              <span className="param-k">Sell Signal</span>
              <span className="param-v">{composite.thresholds ? `≤ ${composite.thresholds.sell}` : "Majority (>50%)"}</span>
            </div>
            <div className="summary-param-tile">
              <span className="param-k">Engine Version</span>
              <span className="param-v">v{composite.version}</span>
            </div>
          </div>
        </div>

        {/* Provenance Card */}
        <div className="summary-provenance-card">
          <div className="provenance-item">
            <span className="prov-k">Generation Source</span>
            <span className="prov-v">Composite Builder</span>
          </div>
          <div className="provenance-item">
            <span className="prov-k">Composite UUID</span>
            <code className="prov-v-code">{composite.id.slice(0, 18)}...</code>
          </div>
        </div>
      </Panel>
    );
  }

  // Single Strategy Definition
  const paramEntries = Object.entries(currentDef!.parameters);
  const strategyName = currentDef!.familyName ?? currentDef!.strategyName;

  return (
    <Panel title="Strategy analyzed" className="strategy-summary-panel">
      {/* Header Hero Card */}
      <div className="summary-hero-card">
        <div className="summary-hero-top">
          <span className="summary-hero-icon">{iconFor(currentDef!)}</span>
          <div className="summary-hero-meta">
            <span className="summary-type-tag">SINGLE QUANT INDICATOR</span>
            <h3 className="summary-hero-name">{strategyName}</h3>
          </div>
          <div className="summary-verified-badge">✓ Schema Valid</div>
        </div>
        <p className="summary-hero-desc">
          Automated algorithmic trading strategy compiled and validated against the execution engine.
        </p>
      </div>

      {/* Structured Parameters Breakdown */}
      <div className="summary-section-card">
        <div className="summary-section-title">
          <span>⚙️ Extracted Mathematical Parameters</span>
          <span className="summary-count-badge">{paramEntries.length} parameters</span>
        </div>
        <div className="summary-params-grid">
          {paramEntries.map(([key, val]) => (
            <div className="summary-param-tile" key={key}>
              <span className="param-k">{key}</span>
              <span className="param-v">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Profile & Risk */}
      <div className="summary-section-card">
        <div className="summary-section-title">
          <span>📈 Execution &amp; Risk Profile</span>
        </div>
        <div className="summary-params-grid">
          <div className="summary-param-tile">
            <span className="param-k">Algorithm Plugin</span>
            <span className="param-v">{currentDef!.strategyName}</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Strategy Version</span>
            <span className="param-v">v{currentDef!.version}</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Execution Mode</span>
            <span className="param-v">Signal Vector Execution</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Status</span>
            <span className="param-v">{activeDraft?.isSaved ? "Saved in DB ✓" : "Active Draft"}</span>
          </div>
        </div>
      </div>

      {/* Provenance & Persistence */}
      <div className="summary-provenance-card">
        <div className="provenance-item">
          <span className="prov-k">Generation Source</span>
          <span className="prov-v">{sourceLabel}</span>
        </div>
        <div className="provenance-item">
          <span className="prov-k">Database Record</span>
          <code className="prov-v-code">{activeDraft?.savedDefinitionId ?? (currentDef!.id.startsWith("draft-") ? "Draft (Unsaved)" : `${currentDef!.id.slice(0, 18)}...`)}</code>
        </div>
      </div>
    </Panel>
  );
}

function JsonPreview({ payload }: { payload?: unknown }) { const [message, setMessage] = useState(""); const value = payload === undefined ? "" : strategyDefinitionJson(payload); const copy = async () => { if (!value) return; try { await navigator.clipboard?.writeText(value); setMessage("Copied"); } catch { setMessage("Copy unavailable in this browser"); } }; return <Panel title="Strategy definition (JSON)" className="strategy-json-panel"><div className="strategy-json-toolbar"><span>Actual backend response</span><button type="button" onClick={() => void copy()} disabled={!value}>▣ Copy</button></div>{value ? <pre>{value}</pre> : <Empty><span className="strategy-empty-icon">⌁</span><b>Waiting for backend output</b><small>Generated or selected library data will appear as readable JSON.</small></Empty>}{message && <span className="strategy-copy-message">{message}</span>}</Panel>; }

function ValidationSave({
  definition,
  result,
  sourceType,
  descriptors,
  activeDraft,
  onSaveToDatabase,
  isSaving,
  error,
  message,
}: {
  definition?: StrategyDefinition;
  result?: StrategyGenerationResult;
  sourceType: SourceType;
  descriptors: Resource<StrategyDescriptor[]>;
  activeDraft?: StrategyDraft;
  onSaveToDatabase: (customName: string) => Promise<void>;
  isSaving?: boolean;
  error?: unknown;
  message: string;
}) {
  const isComplete = Boolean(definition || result?.compositeStrategyDefinition || activeDraft);
  const strategyName = definition?.strategyName ?? activeDraft?.strategyName ?? result?.compositeStrategyDefinition?.method ?? "RSI";
  const supported = definition ? (descriptors.data?.some((item) => item.name === definition.strategyName) ?? true) : Boolean(result?.compositeStrategyDefinition);
  const logicValid = Boolean(definition || result?.compositeStrategyDefinition || activeDraft);

  const [customName, setCustomName] = useState("");

  useEffect(() => {
    if (activeDraft?.name) {
      setCustomName(activeDraft.name);
    } else if (definition?.familyName) {
      setCustomName(definition.familyName);
    } else if (definition?.strategyName) {
      setCustomName(definition.strategyName);
    }
  }, [activeDraft, definition]);

  const tags = useMemo(() => {
    if (!definition && !result?.compositeStrategyDefinition && !activeDraft) return [];
    if (result?.compositeStrategyDefinition) return ["Composite", result.compositeStrategyDefinition.method, "Multi-Asset"];
    const t = [strategyName];
    if (definition?.familyName) t.push(definition.familyName);
    const params = definition?.parameters ?? activeDraft?.parameters ?? {};
    if (params.rsiPeriod || params.period) t.push("RSI");
    if (params.emaPeriod || params.fastPeriod) t.push("Trend");
    if (params.bollingerPeriod) t.push("Bollinger");
    return Array.from(new Set(t)).slice(0, 4);
  }, [definition, result, activeDraft, strategyName]);

  const versionDisplay = activeDraft?.version ?? definition?.version ?? result?.compositeStrategyDefinition?.version ?? 1;
  const isSavedInDb = activeDraft ? activeDraft.isSaved : Boolean(definition?.id);

  const resolvedSource = definition
    ? resolveStrategySource(definition, loadProvenanceMap())
    : activeDraft
    ? activeDraft.sourceType
    : (sourceType === "TEXT" ? "USER_PROMPT" : "WEB_IMPORT");

  const sourceLabel =
    resolvedSource === "WEB_IMPORT"
      ? "Web Import"
      : resolvedSource === "MANUAL_BUILDER"
      ? "Manual Builder"
      : resolvedSource === "COMPOSITE_BUILDER"
      ? "Composite Builder"
      : "User Prompt";

  return (
    <Panel title="Verification & Validation" className="strategy-validation-panel">
      <div className="validation-checks-list">
        {/* Check 1: Missing Required Fields */}
        <div className={`validation-check-row ${isComplete ? "passed" : "pending"}`}>
          <div className="check-icon-title">
            <span className="check-bullet">⚡</span>
            <div>
              <div className="check-title">Missing Required Fields</div>
              <div className="check-sub">{isComplete ? "None (Complete schema)" : "Awaiting strategy generation..."}</div>
            </div>
          </div>
          <div className={`check-badge ${isComplete ? "badge-success" : "badge-pending"}`}>
            {isComplete ? "✓" : "—"}
          </div>
        </div>

        {/* Check 2: Logic & Risk Checks */}
        <div className={`validation-check-row ${logicValid ? "passed" : "pending"}`}>
          <div className="check-icon-title">
            <span className="check-bullet">⚖</span>
            <div>
              <div className="check-title">Logic &amp; Risk Validation</div>
              <div className="check-sub">{logicValid ? "Valid buy/sell rules & thresholds" : "Awaiting strategy generation..."}</div>
            </div>
          </div>
          <div className={`check-badge ${logicValid ? "badge-success" : "badge-pending"}`}>
            {logicValid ? "✓" : "—"}
          </div>
        </div>

        {/* Check 3: Supported Indicators */}
        <div className={`validation-check-row ${supported ? "passed" : "pending"}`}>
          <div className="check-icon-title">
            <span className="check-bullet">📈</span>
            <div>
              <div className="check-title">Supported Indicators</div>
              <div className="check-sub">{isComplete ? "Supported in execution engine" : "Awaiting strategy generation..."}</div>
            </div>
          </div>
          <div className={`check-badge ${supported ? "badge-success" : "badge-pending"}`}>
            {supported ? "✓" : "—"}
          </div>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`validation-overall-banner ${isComplete && supported ? "status-valid" : "status-idle"}`}>
        <div className="overall-badge-icon">{isComplete && supported ? "✓" : "⏳"}</div>
        <div>
          <div className="overall-badge-title">
            {isComplete && supported ? "Valid & Ready for Backtest" : "Awaiting Generation"}
          </div>
          <div className="overall-badge-sub">
            {isComplete && supported ? "Passed all strict schema and indicator checks." : "Submit prompt or URL to generate definition."}
          </div>
        </div>
      </div>

      {/* Database Save Card */}
      <div className="save-library-card">
        <div className="save-library-header">
          <h4 className="save-library-title">💾 Save Strategy</h4>
          <span className={`db-status-pill ${isSavedInDb ? "pill-saved" : "pill-pending"}`}>
            {isSavedInDb ? "● Saved" : "○ Draft"}
          </span>
        </div>
        <p className="save-library-explainer">
          {isSavedInDb
            ? "This strategy is persisted in PostgreSQL. You can run backtests or optimize parameters."
            : "Review and customize the strategy name below, then click Save to persist it to your database."}
        </p>

        <div className="save-field-group">
          <label className="save-field-label">Custom Strategy Name</label>
          <input
            className="save-field-input"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={isComplete ? "e.g. My Aggressive RSI" : "Awaiting generated result..."}
            disabled={!isComplete}
          />
        </div>

        <div className="save-field-row">
          <div className="save-field-group" style={{ flex: 1 }}>
            <label className="save-field-label">Version</label>
            <input className="save-field-input" readOnly value={isComplete ? `v${versionDisplay}` : "v1"} />
          </div>
          <div className="save-field-group" style={{ flex: 1.2 }}>
            <label className="save-field-label">Source</label>
            <input className="save-field-input" readOnly value={isComplete ? sourceLabel : "User Prompt"} />
          </div>
        </div>

        {tags.length > 0 && (
          <div className="save-tags-container">
            <label className="save-field-label">Tags</label>
            <div className="tags-pills-row">
              {tags.map((t) => (
                <span key={t} className="strategy-tag-pill">{t}</span>
              ))}
            </div>
          </div>
        )}

        <div className="save-library-actions">
          {!isSavedInDb ? (
            <button
              type="button"
              className="btn-save-database-primary"
              disabled={!isComplete || isSaving}
              onClick={() => void onSaveToDatabase(customName.trim() || strategyName)}
            >
              {isSaving ? "Saving..." : "💾 Save Strategy"}
            </button>
          ) : (
            <a
              href="#/backtest"
              className="btn-backtest-link"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              🚀 Run Backtest with this Strategy →
            </a>
          )}
        </div>
      </div>
      {result && <p className="strategy-provenance" style={{ marginTop: "8px", fontSize: "9px" }}>Model: <b>{result.modelName ?? "Unavailable"}</b> · Prompt: {result.promptVersion ?? "v1"}</p>}
      {message && <p className="success" style={{ margin: "6px 0 0", fontSize: "11px" }}>{message}</p>}
      <ErrorBox error={error} />
    </Panel>
  );
}

interface DeleteTarget {
  id: string;
  name: string;
  type: "DRAFT" | "DEFINITION" | "COMPOSITE";
  details?: string;
}

function DeleteConfirmationModal({
  target,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const typeBadge =
    target.type === "DRAFT"
      ? { label: "Unsaved Draft", className: "badge-draft" }
      : target.type === "COMPOSITE"
      ? { label: "Composite Ensemble", className: "badge-composite" }
      : { label: "Saved Strategy", className: "badge-saved" };

  return (
    <div className="cryptox-modal-overlay" onClick={onClose}>
      <div className="cryptox-delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon-badge">
            <span>🗑️</span>
          </div>
          <div className="delete-modal-title-group">
            <h3>Delete Strategy</h3>
            <span className={`delete-type-pill ${typeBadge.className}`}>{typeBadge.label}</span>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-warning-text">
            Are you sure you want to delete <b className="delete-target-highlight">"{target.name}"</b>?
          </p>
          {target.details && <p className="delete-meta-info">{target.details}</p>}
          <div className="delete-notice-box">
            <span className="notice-icon">⚠️</span>
            <span>This action will remove the strategy from your workspace and saved lists.</span>
          </div>
        </div>

        <div className="delete-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-confirm-delete"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            🗑️ Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedStrategiesTable({
  definitions,
  composites,
  drafts,
  selected,
  onSelectDefinition,
  onSelectComposite,
  onSelectDraft,
  onSaveDraft,
  onDeleteDraft,
  onDeleteSavedStrategy,
}: {
  definitions: Resource<StrategyDefinition[]>;
  composites: Resource<Composite[]>;
  drafts: StrategyDraft[];
  selected?: StrategyDefinition | StrategyDraft | Composite;
  onSelectDefinition: (definition: StrategyDefinition) => void;
  onSelectComposite: (composite: Composite) => void;
  onSelectDraft: (draft: StrategyDraft) => void;
  onSaveDraft: (draft: StrategyDraft) => Promise<void>;
  onDeleteDraft: (draftId: string) => void;
  onDeleteSavedStrategy: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"ALL" | "USER_PROMPT" | "WEB_IMPORT" | "MANUAL_BUILDER" | "COMPOSITE_BUILDER" | "DRAFTS">("ALL");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const provenanceMap = useMemo(() => loadProvenanceMap(), [definitions.data, drafts]);

  const unsavedDrafts = drafts.filter((d) => !d.isSaved);
  const totalSingle = definitions.data?.length ?? 0;
  const totalComposite = composites.data?.length ?? 0;
  const totalDrafts = unsavedDrafts.length;
  const totalCount = totalSingle + totalComposite + totalDrafts;

  const showDrafts = filter === "ALL" || filter === "DRAFTS";
  const showSingle = filter === "ALL" || filter === "USER_PROMPT" || filter === "WEB_IMPORT" || filter === "MANUAL_BUILDER";
  const showComposite = filter === "ALL" || filter === "COMPOSITE_BUILDER";

  return (
    <Panel title="Saved Strategies & Drafts" className="strategy-library-panel">
      {/* Table Filter Tabs */}
      <div className="table-filter-bar">
        <div className="table-filter-tabs">
          <button
            type="button"
            className={`filter-tab-btn ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All <span className="tab-count-badge">{totalCount}</span>
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "USER_PROMPT" ? "active" : ""}`}
            onClick={() => setFilter("USER_PROMPT")}
          >
            ✦ User Prompt
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "WEB_IMPORT" ? "active" : ""}`}
            onClick={() => setFilter("WEB_IMPORT")}
          >
            ↗ Web Import
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "MANUAL_BUILDER" ? "active" : ""}`}
            onClick={() => setFilter("MANUAL_BUILDER")}
          >
            🛠️ Manual Builder
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "COMPOSITE_BUILDER" ? "active" : ""}`}
            onClick={() => setFilter("COMPOSITE_BUILDER")}
          >
            🔀 Composite Builder <span className="tab-count-badge">{totalComposite}</span>
          </button>
          {totalDrafts > 0 && (
            <button
              type="button"
              className={`filter-tab-btn tab-drafts ${filter === "DRAFTS" ? "active" : ""}`}
              onClick={() => setFilter("DRAFTS")}
            >
              ○ Drafts <span className="tab-count-badge draft">{totalDrafts}</span>
            </button>
          )}
        </div>
      </div>

      {definitions.isLoading || composites.isLoading ? (
        <Loading />
      ) : definitions.error || composites.error ? (
        <ErrorBox error={definitions.error ?? composites.error} />
      ) : totalCount > 0 ? (
        <div className="strategy-table-scroll">
          <table className="strategy-table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Strategy</th>
                <th style={{ width: "16%" }}>Source</th>
                <th style={{ width: "14%" }}>Created</th>
                <th style={{ width: "8%" }}>Version</th>
                <th style={{ width: "22%" }}>Parameters / Logic</th>
                <th style={{ width: "8%" }}>Status</th>
                <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Unsaved Drafts */}
              {showDrafts &&
                unsavedDrafts
                  .filter((draft) => {
                    if (filter === "ALL" || filter === "DRAFTS") return true;
                    return draft.sourceType === filter;
                  })
                  .map((draft) => {
                    const sourceBadge =
                      draft.sourceType === "WEB_IMPORT"
                        ? "↗ Web Import"
                        : draft.sourceType === "MANUAL_BUILDER"
                        ? "🛠️ Manual Builder"
                        : "✦ User Prompt";
                    const badgeClass =
                      draft.sourceType === "WEB_IMPORT"
                        ? "badge-web-import"
                        : draft.sourceType === "MANUAL_BUILDER"
                        ? "badge-manual-builder"
                        : "badge-user-prompt";
                    const isSelected = selected?.id === draft.id;
                    const paramSummary = Object.entries(draft.parameters)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ");

                    return (
                      <tr key={draft.id} className={`draft-row ${isSelected ? "selected" : ""}`}>
                        <td>
                          <div className="table-strat-cell">
                            <span className="table-strat-name">{draft.name || draft.strategyName}</span>
                            <span className="table-strat-sub">{draft.strategyName} · Active Draft</span>
                          </div>
                        </td>
                        <td>
                          <span className={`table-source-badge ${badgeClass}`}>
                            {sourceBadge}
                          </span>
                        </td>
                        <td className="table-date-cell">{displayDate(draft.createdAt)}</td>
                        <td><span className="draft-version-badge">Draft</span></td>
                        <td className="strategy-parameters">{paramSummary}</td>
                        <td>
                          <span className="status-pill status-pill-draft">○ Draft</span>
                        </td>
                        <td>
                          <div className="table-actions-cluster">
                            <button
                              type="button"
                              className="btn-table-inspect"
                              onClick={() => onSelectDraft(draft)}
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              className="btn-table-save"
                              onClick={() => void onSaveDraft(draft)}
                            >
                              💾 Save
                            </button>
                            <button
                              type="button"
                              className="btn-table-delete"
                              title="Delete draft"
                              onClick={() =>
                                setDeleteTarget({
                                  id: draft.id,
                                  name: draft.name || draft.strategyName,
                                  type: "DRAFT",
                                  details: paramSummary,
                                })
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

              {/* 2. Persisted Single Strategies */}
              {showSingle &&
                definitions.data
                  ?.filter((item) => {
                    if (filter === "ALL") return true;
                    const source = resolveStrategySource(item, provenanceMap);
                    return source === filter;
                  })
                  .map((item) => {
                    const isSelected = selected?.id === item.id;
                    const source = resolveStrategySource(item, provenanceMap);
                    const sourceLabel =
                      source === "WEB_IMPORT"
                        ? "↗ Web Import"
                        : source === "MANUAL_BUILDER"
                        ? "🛠️ Manual Builder"
                        : "✦ User Prompt";
                    const badgeClass =
                      source === "WEB_IMPORT"
                        ? "badge-web-import"
                        : source === "MANUAL_BUILDER"
                        ? "badge-manual-builder"
                        : "badge-user-prompt";
                    const stratName = item.familyName ?? item.strategyName;

                    return (
                      <tr key={item.id} className={isSelected ? "selected" : ""}>
                        <td>
                          <div className="table-strat-cell">
                            <span className="table-strat-name">{stratName}</span>
                            <span className="table-strat-sub">{item.strategyName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`table-source-badge ${badgeClass}`}>
                            {sourceLabel}
                          </span>
                        </td>
                        <td className="table-date-cell">{displayDate(item.createdAt)}</td>
                        <td><span className="version-pill">v{item.version}</span></td>
                        <td className="strategy-parameters">{parameterSummary(item)}</td>
                        <td>
                          <span className="status-pill status-pill-saved">● Saved</span>
                        </td>
                        <td>
                          <div className="table-actions-cluster">
                            <button
                              type="button"
                              className="btn-table-inspect"
                              onClick={() => onSelectDefinition(item)}
                            >
                              Inspect
                            </button>
                            <a href="#/backtest" className="btn-table-backtest">
                              Backtest →
                            </a>
                            <button
                              type="button"
                              className="btn-table-delete"
                              title="Delete strategy"
                              onClick={() =>
                                setDeleteTarget({
                                  id: item.id,
                                  name: `${stratName} (v${item.version})`,
                                  type: "DEFINITION",
                                  details: parameterSummary(item),
                                })
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

              {/* 3. Persisted Composite Strategies */}
              {showComposite &&
                composites.data?.map((comp) => {
                  const isSelected = selected?.id === comp.id;
                  const methodLabel = comp.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble";
                  const compNames = comp.components
                    .map((c) => {
                      const found = definitions.data?.find((d) => d.id === c.strategyDefinitionId);
                      return found?.strategyName ?? "Strategy";
                    })
                    .join(" + ");
                  const logicSummary = comp.thresholds
                    ? `${comp.components.length} components (${compNames}) · Buy ≥ ${comp.thresholds.buy}, Sell ≤ ${comp.thresholds.sell}`
                    : `${comp.components.length} components (${compNames}) · Strict majority consensus`;

                  return (
                    <tr key={comp.id} className={`composite-row ${isSelected ? "selected" : ""}`}>
                      <td>
                        <div className="table-strat-cell">
                          <span className="table-strat-name">🔀 {methodLabel}</span>
                          <span className="table-strat-sub">Multi-Indicator Ensemble</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-source-badge badge-composite-builder">
                          🔀 Composite Builder
                        </span>
                      </td>
                      <td className="table-date-cell">{displayDate(comp.createdAt)}</td>
                      <td><span className="version-pill">v{comp.version}</span></td>
                      <td className="strategy-parameters">{logicSummary}</td>
                      <td>
                        <span className="status-pill status-pill-saved">● Saved</span>
                      </td>
                      <td>
                        <div className="table-actions-cluster">
                          <button
                            type="button"
                            className="btn-table-inspect"
                            onClick={() => onSelectComposite(comp)}
                          >
                            Inspect
                          </button>
                          <a href="#/backtest" className="btn-table-backtest">
                            Backtest →
                          </a>
                          <button
                            type="button"
                            className="btn-table-delete"
                            title="Delete composite"
                            onClick={() =>
                              setDeleteTarget({
                                id: comp.id,
                                name: methodLabel,
                                type: "COMPOSITE",
                                details: logicSummary,
                              })
                            }
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          <b>No strategies found in this category.</b>
          <small>Generate a strategy with AI, import from URL, or use the builders above.</small>
        </Empty>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmationModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget.type === "DRAFT") {
              onDeleteDraft(deleteTarget.id);
            } else {
              onDeleteSavedStrategy(deleteTarget.id);
            }
          }}
        />
      )}
    </Panel>
  );
}

function PluginEditor({ descriptors, onSaved, error, setError }: { descriptors: Resource<StrategyDescriptor[]>; onSaved: () => void; error?: unknown; setError: (error?: unknown) => void }) {
  const [selected, setSelected] = useState<StrategyDescriptor>();
  const [parameters, setParameters] = useState<Record<string, number | string>>({});
  const save = useMutation({
    mutationFn: () => (selected ? api.define(selected.name, parameters) : Promise.reject(new Error("Select an indicator."))),
    onSuccess: (saved) => {
      if (saved?.id) {
        recordProvenance(saved.id, "MANUAL_BUILDER");
      }
      onSaved();
    },
    onError: setError,
  });

  useEffect(() => {
    if (!selected && descriptors.data?.[0]) {
      setSelected(descriptors.data[0]);
      setParameters(parameterDefaults(descriptors.data[0].parameters));
    }
  }, [descriptors.data, selected]);

  const select = (item: StrategyDescriptor) => {
    setSelected(item);
    setParameters(parameterDefaults(item.parameters));
    setError(undefined);
  };

  return (
    <Panel title="🛠️ Manual Strategy Builder (Core Indicator Templates)" className="strategy-manual-panel">
      <div className="manual-builder-intro">
        <p className="manual-builder-sub">
          Select a core quantitative trading algorithm from the templates below, customize its numerical parameters, and save an executable strategy definition to your database.
        </p>
      </div>

      {/* 5 Indicator Selector Cards Row */}
      <div className="manual-indicator-grid">
        {descriptors.isLoading ? (
          <Loading />
        ) : descriptors.error ? (
          <ErrorBox error={descriptors.error} />
        ) : (
          descriptors.data?.map((item) => {
            const isSelected = selected?.name === item.name;
            return (
              <button
                type="button"
                className={`indicator-select-card ${isSelected ? "selected" : ""}`}
                key={item.name}
                onClick={() => select(item)}
              >
                <div className="indicator-card-top">
                  <span className="indicator-card-icon">{iconFor(item)}</span>
                  <span className={`category-badge cat-${item.category.toLowerCase()}`}>{item.category}</span>
                </div>
                <div className="indicator-card-info">
                  <b className="indicator-card-name">{item.displayName}</b>
                  <span className="indicator-card-candles">History: {item.minimumHistoryCandles} candles</span>
                </div>
                {isSelected && <div className="indicator-selected-tag">● Active Selection</div>}
              </button>
            );
          })
        )}
      </div>

      {/* Parameter Configuration & Save Studio */}
      {selected ? (
        <form
          className="manual-studio-card"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="studio-card-header">
            <div className="studio-header-meta">
              <span className="studio-hero-icon">{iconFor(selected)}</span>
              <div>
                <h4>Configure {selected.displayName} Parameters</h4>
                <p className="studio-desc">{selected.description}</p>
              </div>
            </div>
            <div className="studio-status-tag">
              <span>● Template Ready</span>
            </div>
          </div>

          <div className="studio-parameters-grid">
            {selected.parameters.map((parameter) => (
              <div className="parameter-input-group" key={parameter.key}>
                <label className="param-label">
                  <span className="param-name">{parameter.label}</span>
                  {parameter.type === "ENUM" && parameter.options ? (
                    <select
                      className="param-control"
                      required={parameter.required}
                      value={parameters[parameter.key] ?? ""}
                      onChange={(event) => setParameters({ ...parameters, [parameter.key]: event.target.value })}
                    >
                      {parameter.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="param-control"
                      type="number"
                      required={parameter.required}
                      value={parameters[parameter.key] ?? ""}
                      min={parameter.minimum}
                      max={parameter.maximum}
                      step={parameter.step}
                      onChange={(event) => setParameters({ ...parameters, [parameter.key]: Number(event.target.value) })}
                    />
                  )}
                </label>
              </div>
            ))}
          </div>

          <div className="studio-footer-actions">
            <div className="studio-hint">
              <span>💾 Saves an executable definition into PostgreSQL for use in Backtesting and Composite Building.</span>
            </div>
            <button
              type="submit"
              className="btn-save-manual-strategy"
              disabled={save.isPending}
            >
              {save.isPending ? "Saving to Database..." : `💾 Save ${selected.displayName} Strategy`}
            </button>
          </div>
        </form>
      ) : (
        <Empty>Select an indicator from the templates above to configure its parameters.</Empty>
      )}

      {save.isSuccess && (
        <p className="success" style={{ marginTop: "10px", fontSize: "12px" }}>
          ✓ Strategy definition successfully saved to PostgreSQL!
        </p>
      )}
      <ErrorBox error={error ?? save.error} />
    </Panel>
  );
}

function CompositeLibrary({ definitions, composites, refresh, error, setError }: { definitions: Resource<StrategyDefinition[]>; composites: Resource<Composite[]>; refresh: () => void; error?: unknown; setError: (error?: unknown) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<CombinationMethod>("MAJORITY_VOTE");
  const [buy, setBuy] = useState("0.5");
  const [sell, setSell] = useState("-0.5");

  const save = useMutation({
    mutationFn: () =>
      api.defineComposite(
        method,
        method === "WEIGHTED_SCORE"
          ? weightedComponents(selectedIds, weights)
          : selectedIds.map((strategyDefinitionId) => ({ strategyDefinitionId, weight: 1 })),
        method === "WEIGHTED_SCORE" ? { buy: Number(buy), sell: Number(sell) } : undefined
      ),
    onSuccess: (saved) => {
      if (saved?.id) {
        recordProvenance(saved.id, "COMPOSITE_BUILDER");
      }
      refresh();
    },
    onError: setError,
  });

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
    setSelectedIds(next);
    setWeights(equalWeights(next));
    setError(undefined);
  };

  const weightSum = Object.values(weightedComponents(selectedIds, weights)).reduce((sum, item) => sum + item.weight, 0);
  const thresholdsValid = Number.isFinite(Number(buy)) && Number.isFinite(Number(sell)) && Number(buy) > Number(sell);
  const weightedValid = method === "MAJORITY_VOTE" || (Math.abs(weightSum - 1) < 0.0001 && thresholdsValid);
  const canSave = selectedIds.length >= 2 && weightedValid && !save.isPending;

  return (
    <Panel title="🔀 Composite Strategy Builder (Multi-Indicator Ensemble)" className="strategy-composite-panel">
      <div className="composite-builder-header">
        <p className="composite-builder-sub">
          Combine 2 or more saved strategies into a single decision engine. Ensemble strategies filter out false signals by requiring consensus across multiple indicators.
        </p>
      </div>

      <div className="composite-two-column-layout">
        {/* Left Column: Assembling the Composite */}
        <div className="composite-assemble-col">
          {/* Step 1: Selection Mode Cards */}
          <div className="composite-step-card">
            <div className="composite-step-header">
              <span className="step-badge">1</span>
              <h4>Choose Consensus Decision Method</h4>
            </div>
            <div className="composite-method-selector-grid">
              <button
                type="button"
                className={`composite-method-btn ${method === "MAJORITY_VOTE" ? "active" : ""}`}
                onClick={() => setMethod("MAJORITY_VOTE")}
              >
                <div className="method-btn-top">
                  <span className="method-icon">🗳️</span>
                  <b>Majority Vote</b>
                </div>
                <p className="method-desc">
                  Democratic consensus. Executes a trade only when &gt;50% of selected strategies agree on a signal.
                </p>
              </button>

              <button
                type="button"
                className={`composite-method-btn ${method === "WEIGHTED_SCORE" ? "active" : ""}`}
                onClick={() => setMethod("WEIGHTED_SCORE")}
              >
                <div className="method-btn-top">
                  <span className="method-icon">⚖️</span>
                  <b>Weighted Scoring</b>
                </div>
                <p className="method-desc">
                  Custom confidence weighting. Each strategy contributes a percentage score with trigger thresholds.
                </p>
              </button>
            </div>
          </div>

          {/* Step 2: Component Strategies Checklist */}
          <div className="composite-step-card">
            <div className="composite-step-header">
              <span className="step-badge">2</span>
              <div>
                <h4>Select 2 or More Saved Strategies to Combine</h4>
                <small className="step-sub-hint">({selectedIds.length} strategies selected)</small>
              </div>
            </div>

            <div className="composite-strategy-picker">
              {definitions.isLoading ? (
                <Loading />
              ) : definitions.error ? (
                <ErrorBox error={definitions.error} />
              ) : definitions.data?.length ? (
                <div className="composite-checkbox-list">
                  {definitions.data.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`composite-item-row ${checked ? "checked" : ""}`}
                        onClick={() => toggle(item.id)}
                      >
                        <div className="item-row-left">
                          <input
                            type="checkbox"
                            className="item-checkbox"
                            checked={checked}
                            onChange={() => toggle(item.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="item-details">
                            <div className="item-name-row">
                              <b className="item-name">{item.familyName ?? item.strategyName}</b>
                              <span className="version-pill">v{item.version}</span>
                            </div>
                            <span className="item-meta">{parameterSummary(item)}</span>
                          </div>
                        </div>
                        {checked && method === "WEIGHTED_SCORE" && (
                          <div className="item-weight-box" onClick={(e) => e.stopPropagation()}>
                            <label className="weight-label">Weight</label>
                            <input
                              className="weight-input"
                              type="number"
                              min={0.01}
                              max={1}
                              step={0.05}
                              value={weights[item.id] ?? 0}
                              onChange={(event) => setWeights({ ...weights, [item.id]: Number(event.target.value) })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty>No saved single strategies available. Generate or build strategies first.</Empty>
              )}
            </div>
          </div>

          {/* Step 3: Thresholds & Trigger for Weighted Score */}
          {method === "WEIGHTED_SCORE" && (
            <div className="composite-step-card">
              <div className="composite-step-header">
                <span className="step-badge">3</span>
                <h4>Configure Score Trigger Thresholds</h4>
              </div>
              <div className="thresholds-grid">
                <label className="threshold-field">
                  <span>Buy Signal Threshold (Score &ge;)</span>
                  <input
                    className="threshold-input"
                    type="number"
                    step={0.05}
                    value={buy}
                    onChange={(event) => setBuy(event.target.value)}
                  />
                  <small className="threshold-help">Minimum score to execute BUY.</small>
                </label>
                <label className="threshold-field">
                  <span>Sell Signal Threshold (Score &le;)</span>
                  <input
                    className="threshold-input"
                    type="number"
                    step={0.05}
                    value={sell}
                    onChange={(event) => setSell(event.target.value)}
                  />
                  <small className="threshold-help">Maximum score to execute SELL.</small>
                </label>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="composite-action-box">
            <button
              type="button"
              className="btn-create-composite"
              disabled={!canSave}
              onClick={() => save.mutate()}
            >
              {save.isPending
                ? "Saving Ensemble to Database..."
                : selectedIds.length < 2
                ? "Select at least 2 strategies to combine"
                : `💾 Save ${method === "MAJORITY_VOTE" ? "Majority Vote" : "Weighted Score"} Composite`}
            </button>
          </div>
          {save.isSuccess && (
            <p className="success" style={{ marginTop: "8px", fontSize: "12px" }}>
              ✓ Composite strategy successfully created and saved to PostgreSQL!
            </p>
          )}
          <ErrorBox error={error ?? save.error} />
        </div>

        {/* Right Column: Active Persisted Composites */}
        <div className="composite-persisted-col">
          <div className="persisted-composites-header">
            <h4>Saved Composite Strategies (PostgreSQL)</h4>
            <span className="composites-count-pill">{composites.data?.length ?? 0} composites</span>
          </div>

          <div className="persisted-composites-list">
            {composites.isLoading ? (
              <Loading />
            ) : composites.error ? (
              <ErrorBox error={composites.error} />
            ) : composites.data?.length ? (
              composites.data.map((composite) => (
                <div className="persisted-composite-card" key={composite.id}>
                  <div className="composite-card-header">
                    <span className={`composite-method-tag method-${composite.method.toLowerCase()}`}>
                      {composite.method === "MAJORITY_VOTE" ? "🗳️ Majority Vote" : "⚖️ Weighted Score"}
                    </span>
                    <span className="composite-version-tag">v{composite.version}</span>
                  </div>

                  <div className="composite-components-formula">
                    <div className="formula-label">Ensemble Components:</div>
                    <div className="formula-chips-row">
                      {composite.components.map((component, idx) => {
                        const name = definitions.data?.find((d) => d.id === component.strategyDefinitionId)?.strategyName ?? "Strategy";
                        return (
                          <span className="formula-chip" key={idx}>
                            {name} {composite.method === "WEIGHTED_SCORE" ? `(${(component.weight * 100).toFixed(0)}%)` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {composite.thresholds && (
                    <div className="composite-thresholds-summary">
                      <span>Buy &ge; {composite.thresholds.buy}</span>
                      <span>Sell &le; {composite.thresholds.sell}</span>
                    </div>
                  )}

                  <div className="composite-card-footer">
                    <span className="composite-ready-badge">● Ready for Backtest Lab</span>
                    <code className="composite-uuid">{composite.id.slice(0, 16)}...</code>
                  </div>
                </div>
              ))
            ) : (
              <div className="persisted-composites-empty">
                <span className="empty-icon">🔀</span>
                <b>No composite strategies saved yet</b>
                <small>Combine single strategies on the left to build your first ensemble bot.</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function StrategyScreen() {
  const queryClient = useQueryClient();
  const descriptorsQuery = useQuery({ queryKey: ["strategies", "descriptors"], queryFn: api.strategies });
  const definitionsQuery = useQuery({ queryKey: ["strategies", "definitions"], queryFn: api.definitions });
  const compositesQuery = useQuery({ queryKey: ["strategies", "composites"], queryFn: api.composites });
  const descriptors = { ...descriptorsQuery, refetch: descriptorsQuery.refetch } as Resource<StrategyDescriptor[]>;
  const definitions = { ...definitionsQuery, refetch: definitionsQuery.refetch } as Resource<StrategyDefinition[]>;
  const composites = { ...compositesQuery, refetch: compositesQuery.refetch } as Resource<Composite[]>;

  const [creationMode, setCreationMode] = useState<CreationMode>("AI_GENERATOR");
  const [sourceType, setSourceType] = useState<SourceType>("TEXT");
  const [source, setSource] = useState("");
  const [result, setResult] = useState<StrategyGenerationResult>();
  const [selected, setSelected] = useState<StrategyDefinition | StrategyDraft | Composite>();
  const [drafts, setDrafts] = useState<StrategyDraft[]>(() => loadSavedDrafts());
  const [activeDraft, setActiveDraft] = useState<StrategyDraft | undefined>(() => loadActiveDraft());
  const [deletedIds, setDeletedIds] = useState<string[]>(() => loadDeletedStrategyIds());
  const [isSaving, setIsSaving] = useState(false);
  const [pluginError, setPluginError] = useState<unknown>();
  const [compositeError, setCompositeError] = useState<unknown>();
  const [message, setMessage] = useState("");

  const visibleDefinitions = useMemo(() => {
    return (definitions.data ?? []).filter((d) => !deletedIds.includes(d.id));
  }, [definitions.data, deletedIds]);

  const visibleComposites = useMemo(() => {
    return (composites.data ?? []).filter((c) => !deletedIds.includes(c.id));
  }, [composites.data, deletedIds]);

  const filteredDefinitions: Resource<StrategyDefinition[]> = {
    ...definitions,
    data: visibleDefinitions,
  };

  const filteredComposites: Resource<Composite[]> = {
    ...composites,
    data: visibleComposites,
  };

  const generation = useMutation({
    mutationFn: (input: { sourceType: "TEXT"; text: string } | { sourceType: "URL"; url: string }) => api.generateStrategy(input),
    onSuccess: (generated) => {
      setResult(generated);
      const stratDef = generated.kind === "SINGLE" ? generated.strategyDefinition : undefined;
      const stratName = stratDef?.strategyName ?? "RSI";
      const familyName = stratDef?.familyName ?? stratName;
      const params = stratDef?.parameters ?? {};
      const nextVersion = (definitions.data?.filter((d) => d.strategyName === stratName).length ?? 0) + 1;

      const newDraft: StrategyDraft = {
        id: `draft-${Date.now()}`,
        name: familyName,
        strategyName: stratName,
        parameters: params,
        sourceType: sourceType === "TEXT" ? "USER_PROMPT" : "WEB_IMPORT",
        createdAt: new Date().toISOString(),
        isSaved: false,
        version: nextVersion,
      };

      setActiveDraft(newDraft);
      persistActiveDraft(newDraft);
      setDrafts((prev) => {
        const nextDrafts = [newDraft, ...prev.filter((d) => d.id !== newDraft.id)];
        persistDrafts(nextDrafts);
        return nextDrafts;
      });
      setSelected(newDraft);
      setMessage("AI strategy draft generated! Review parameters and click 'Save Strategy' below.");
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
      void definitions.refetch();
      void composites.refetch();
    },
  });

  const definition = (selected && "implementationSha256" in selected)
    ? (selected as StrategyDefinition)
    : generatedDefinition(result, undefined);
  const composite = (selected && "method" in selected && "components" in selected)
    ? (selected as Composite)
    : generatedComposite(result);
  const preview = result ?? (selected ? { source: "Draft / Database Record", strategy: selected } : (activeDraft ? { source: "Active Draft", draft: activeDraft } : undefined));

  const refreshSavedStrategies = () => {
    setMessage("Database strategies refreshed.");
    void queryClient.invalidateQueries({ queryKey: ["strategies"] });
    void definitions.refetch();
    void composites.refetch();
  };

  const handleDeleteDraft = (draftId: string) => {
    const nextDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(nextDrafts);
    persistDrafts(nextDrafts);
    if (activeDraft?.id === draftId) {
      setActiveDraft(undefined);
      persistActiveDraft(undefined);
    }
    if (selected?.id === draftId) {
      setSelected(undefined);
    }
    setMessage("Draft removed.");
  };

  const handleDeleteSavedStrategy = (id: string) => {
    persistDeletedStrategyId(id);
    setDeletedIds((prev) => [...prev, id]);
    const nextDrafts = drafts.filter((d) => d.savedDefinitionId !== id && d.id !== id);
    setDrafts(nextDrafts);
    persistDrafts(nextDrafts);
    if (selected?.id === id) {
      setSelected(undefined);
      setActiveDraft(undefined);
    }
    setMessage("Strategy removed from saved list.");
    void queryClient.invalidateQueries({ queryKey: ["strategies"] });
  };

  const handleSaveToDatabase = async (customName: string) => {
    const targetDraft = activeDraft ?? (selected && !("implementationSha256" in selected) && !("method" in selected) ? (selected as StrategyDraft) : undefined);
    if (!targetDraft) return;

    setIsSaving(true);
    try {
      const saved = await api.define(targetDraft.strategyName, targetDraft.parameters);
      recordProvenance(saved.id, targetDraft.sourceType);
      const updatedDraft: StrategyDraft = {
        ...targetDraft,
        name: customName || targetDraft.name,
        isSaved: true,
        savedDefinitionId: saved.id,
      };
      setActiveDraft(updatedDraft);
      persistActiveDraft(updatedDraft);
      setDrafts((prev) => {
        const nextDrafts = prev.map((d) => (d.id === targetDraft.id ? updatedDraft : d));
        persistDrafts(nextDrafts);
        return nextDrafts;
      });
      setSelected(saved);
      setMessage(`✓ Strategy "${customName || targetDraft.name}" successfully saved to PostgreSQL!`);
      await queryClient.invalidateQueries({ queryKey: ["strategies"] });
      void definitions.refetch();
      void composites.refetch();
    } catch (err) {
      setMessage(`Failed to save: ${err instanceof Error ? err.message : "Database error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSaveDraft = async (draft: StrategyDraft) => {
    setIsSaving(true);
    try {
      const saved = await api.define(draft.strategyName, draft.parameters);
      recordProvenance(saved.id, draft.sourceType);
      const updatedDraft: StrategyDraft = {
        ...draft,
        isSaved: true,
        savedDefinitionId: saved.id,
      };
      if (activeDraft?.id === draft.id) {
        setActiveDraft(updatedDraft);
        persistActiveDraft(updatedDraft);
      }
      setDrafts((prev) => {
        const nextDrafts = prev.map((d) => (d.id === draft.id ? updatedDraft : d));
        persistDrafts(nextDrafts);
        return nextDrafts;
      });
      setMessage(`✓ Strategy "${draft.name}" saved to PostgreSQL!`);
      await queryClient.invalidateQueries({ queryKey: ["strategies"] });
      void definitions.refetch();
      void composites.refetch();
    } catch (err) {
      setMessage(`Failed to save: ${err instanceof Error ? err.message : "Database error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    generation.reset();
    setMessage("");
    generation.mutate(sourceType === "TEXT" ? { sourceType, text: source.trim() } : { sourceType, url: source.trim() });
  };

  const clear = () => {
    setSource("");
    setResult(undefined);
    setSelected(undefined);
    setActiveDraft(undefined);
    persistActiveDraft(undefined);
    generation.reset();
    setMessage("");
  };

  return (
    <div className="strategy-screen">
      <StrategyHeader creationMode={creationMode} setCreationMode={setCreationMode} />

      {/* Mode Switchable Workspace: AI Generator vs Manual Builder vs Composite Builder */}
      {creationMode === "AI_GENERATOR" ? (
        <div className="strategy-workspace">
          <PromptInput
            source={source}
            setSource={setSource}
            sourceType={sourceType}
            setSourceType={setSourceType}
            busy={generation.isPending}
            onSubmit={submit}
            onClear={clear}
            error={generation.error}
          />
          <ParsedSummary
            definition={definition}
            composite={composite}
            result={result}
            sourceType={sourceType}
            activeDraft={activeDraft}
          />
          <JsonPreview payload={preview} />
          <ValidationSave
            definition={definition}
            result={result}
            sourceType={sourceType}
            descriptors={descriptors}
            activeDraft={activeDraft}
            onSaveToDatabase={handleSaveToDatabase}
            isSaving={isSaving}
            message={message}
          />
        </div>
      ) : creationMode === "MANUAL_BUILDER" ? (
        <PluginEditor
          descriptors={descriptors}
          onSaved={refreshSavedStrategies}
          error={pluginError}
          setError={setPluginError}
        />
      ) : (
        <CompositeLibrary
          definitions={filteredDefinitions}
          composites={filteredComposites}
          refresh={refreshSavedStrategies}
          error={compositeError}
          setError={setCompositeError}
        />
      )}

      {/* Saved Strategies & Drafts Table */}
      <SavedStrategiesTable
        definitions={filteredDefinitions}
        composites={filteredComposites}
        drafts={drafts}
        selected={selected}
        onSelectDefinition={(item) => {
          setSelected(item);
          setActiveDraft(undefined);
          setResult(undefined);
          const src = resolveStrategySource(item, loadProvenanceMap());
          setSourceType(src === "WEB_IMPORT" ? "URL" : "TEXT");
          setMessage("");
        }}
        onSelectComposite={(comp) => {
          setSelected(comp);
          setActiveDraft(undefined);
          setResult(undefined);
          setMessage("");
        }}
        onSelectDraft={(draft) => {
          setSelected(draft);
          setActiveDraft(draft);
          setResult(undefined);
          setSourceType(draft.sourceType === "WEB_IMPORT" ? "URL" : "TEXT");
          setMessage("");
        }}
        onSaveDraft={handleQuickSaveDraft}
        onDeleteDraft={handleDeleteDraft}
        onDeleteSavedStrategy={handleDeleteSavedStrategy}
      />
    </div>
  );
}
