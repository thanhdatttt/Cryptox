import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, mapGenerationError, type CombinationMethod, type Composite, type StrategyDefinition, type StrategyDescriptor, type StrategyGenerationResult } from "./api";
import { equalWeights, parameterDefaults, launchStrategyBacktest } from "./state";

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
  kind?: "SINGLE" | "COMPOSITE";
  name: string;
  strategyName: string;
  parameters: Record<string, number | string>;
  composite?: {
    method: CombinationMethod;
    components: Array<{ strategyDefinitionId: string; weight: number }>;
    thresholds?: { buy: number; sell: number };
  };
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

function unpersistDeletedStrategyId(id: string): string[] {
  try {
    const current = loadDeletedStrategyIds();
    const next = current.filter((item) => item !== id);
    localStorage.setItem(DELETED_STRATEGIES_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
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

const CUSTOM_NAMES_STORAGE_KEY = "cryptox_strategy_custom_names_v1";

function loadCustomNamesMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_NAMES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistCustomName(id: string, name: string) {
  try {
    const current = loadCustomNamesMap();
    if (name.trim()) {
      current[id] = name.trim();
    } else {
      delete current[id];
    }
    localStorage.setItem(CUSTOM_NAMES_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // local storage unavailable
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
  definitions,
}: {
  definition?: StrategyDefinition;
  composite?: Composite;
  result?: StrategyGenerationResult;
  sourceType: SourceType;
  activeDraft?: StrategyDraft;
  definitions?: Resource<StrategyDefinition[]>;
}) {
  const currentComposite: Composite | undefined = composite ?? (activeDraft?.composite ? {
    id: activeDraft.savedDefinitionId ?? activeDraft.id,
    userId: "current",
    logicalFamilyKey: `composite:${activeDraft.composite.method}`,
    version: activeDraft.version ?? 1,
    method: activeDraft.composite.method,
    components: activeDraft.composite.components,
    thresholds: activeDraft.composite.thresholds,
    createdAt: activeDraft.createdAt,
  } : (result?.compositeStrategyDefinition ? result.compositeStrategyDefinition : undefined));

  const currentDef: StrategyDefinition | undefined = definition ?? (!currentComposite && activeDraft ? {
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

  if (!currentDef && !currentComposite) {
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

  if (currentComposite) {
    const customNames = loadCustomNamesMap();
    const compHeroName = activeDraft?.name
      ?? customNames[currentComposite.id]
      ?? (currentComposite.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble");

    return (
      <Panel title="Strategy analyzed" className="strategy-summary-panel">
        {/* Header Hero Card */}
        <div className="summary-hero-card">
          <div className="summary-hero-top">
            <span className="summary-hero-icon">🔀</span>
            <div className="summary-hero-meta">
              <span className="summary-type-tag">COMPOSITE ENSEMBLE</span>
              <h3 className="summary-hero-name">{compHeroName}</h3>
            </div>
            <div className="summary-verified-badge">✓ Validated</div>
          </div>
          <p className="summary-hero-desc">
            Multi-strategy ensemble combining {currentComposite.components.length} quantitative components.
          </p>
        </div>

        {/* Member Components */}
        <div className="summary-section-card">
          <div className="summary-section-title">
            <span>🧩 Member Strategy Components</span>
            <span className="summary-count-badge">{currentComposite.components.length} components</span>
          </div>
          <div className="summary-components-grid">
            {currentComposite.components.map((c, i) => {
              const memberDef = definitions?.data?.find((d) => d.id === c.strategyDefinitionId)
                ?? (result?.strategyDefinition?.id === c.strategyDefinitionId ? result.strategyDefinition : undefined);
              const displayName = memberDef?.strategyName ?? (
                c.strategyDefinitionId.toLowerCase().includes("rsi") ? "RSI"
                : c.strategyDefinitionId.toLowerCase().includes("bollinger") ? "Bollinger Bands"
                : c.strategyDefinitionId.toLowerCase().includes("sentiment") ? "News Sentiment"
                : c.strategyDefinitionId.toLowerCase().includes("ma") ? "Moving Average"
                : c.strategyDefinitionId.toLowerCase().includes("support") ? "Support & Resistance"
                : (c.strategyDefinitionId.startsWith("strategy-definition-") ? `Strategy (${c.strategyDefinitionId.slice(20, 26)})` : c.strategyDefinitionId)
              );
              const version = memberDef?.version ? `v${memberDef.version}` : "v1";

              return (
                <div className="summary-component-row" key={i}>
                  <span className="comp-bullet">●</span>
                  <div className="comp-name-group">
                    <b className="comp-name">{displayName}</b>
                    <span className="comp-version-pill">{version}</span>
                  </div>
                  {currentComposite.method === "WEIGHTED_SCORE" && (
                    <span className="comp-weight">Weight: <b>{(c.weight * 100).toFixed(0)}%</b></span>
                  )}
                </div>
              );
            })}
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
              <span className="param-v">{currentComposite.method}</span>
            </div>
            <div className="summary-param-tile">
              <span className="param-k">Buy Signal</span>
              <span className="param-v">{currentComposite.method === "WEIGHTED_SCORE" && currentComposite.thresholds ? `≥ ${currentComposite.thresholds.buy}` : "Majority (>50%)"}</span>
            </div>
            <div className="summary-param-tile">
              <span className="param-k">Sell Signal</span>
              <span className="param-v">{currentComposite.method === "WEIGHTED_SCORE" && currentComposite.thresholds ? `≤ ${currentComposite.thresholds.sell}` : "Majority (>50%)"}</span>
            </div>
            <div className="summary-param-tile">
              <span className="param-k">Engine Version</span>
              <span className="param-v">v{currentComposite.version}</span>
            </div>
          </div>
        </div>

        {/* Provenance Card */}
        <div className="summary-provenance-card">
          <div className="provenance-item">
            <span className="prov-k">Generation Source</span>
            <span className="prov-v">{sourceLabel}</span>
          </div>
          <div className="provenance-item">
            <span className="prov-k">Database Record</span>
            <code className="prov-v-code">{activeDraft?.isSaved ? (activeDraft.savedDefinitionId ?? currentComposite.id) : "Draft (Unsaved)"}</code>
          </div>
        </div>
      </Panel>
    );
  }

  // Single Strategy Definition
  const paramEntries = Object.entries(currentDef!.parameters);
  const customNames = loadCustomNamesMap();
  const singleStrategyName = activeDraft?.name ?? customNames[currentDef!.id] ?? currentDef!.familyName ?? currentDef!.strategyName;

  return (
    <Panel title="Strategy analyzed" className="strategy-summary-panel">
      {/* Header Hero Card */}
      <div className="summary-hero-card">
        <div className="summary-hero-top">
          <span className="summary-hero-icon">{iconFor(currentDef!)}</span>
          <div className="summary-hero-meta">
            <span className="summary-type-tag">SINGLE QUANT INDICATOR</span>
            <h3 className="summary-hero-name">{singleStrategyName}</h3>
          </div>
          <div className="summary-verified-badge">✓ Schema Valid</div>
        </div>
        <p className="summary-hero-desc">
          Automated quantitative trading algorithm configured with {paramEntries.length} parameter{paramEntries.length === 1 ? "" : "s"}.
        </p>
      </div>

      {/* Numerical Parameters Grid */}
      <div className="summary-section-card">
        <div className="summary-section-title">
          <span>⚙️ Indicator Parameters</span>
          <span className="summary-count-badge">{paramEntries.length} configured</span>
        </div>
        <div className="summary-params-grid">
          {paramEntries.map(([k, v]) => (
            <div className="summary-param-tile" key={k}>
              <span className="param-k">{k}</span>
              <span className="param-v">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Logic Card */}
      <div className="summary-section-card">
        <div className="summary-section-title">
          <span>⚖️ Signal Generation Rules</span>
        </div>
        <div className="summary-params-grid">
          <div className="summary-param-tile">
            <span className="param-k">Indicator Plugin</span>
            <span className="param-v">{currentDef!.strategyName}</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Plugin Version</span>
            <span className="param-v">{currentDef!.implementationVersion}</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Definition Version</span>
            <span className="param-v">v{currentDef!.version}</span>
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
          <code className="prov-v-code">{activeDraft?.isSaved ? (activeDraft.savedDefinitionId ?? currentDef!.id) : "Draft (Unsaved)"}</code>
        </div>
      </div>
    </Panel>
  );
}

function JsonPreview({ payload }: { payload?: unknown }) { const [message, setMessage] = useState(""); const value = payload === undefined ? "" : strategyDefinitionJson(payload); const copy = async () => { if (!value) return; try { await navigator.clipboard?.writeText(value); setMessage("Copied"); } catch { setMessage("Copy unavailable in this browser"); } }; return <Panel title="Strategy definition (JSON)" className="strategy-json-panel"><div className="strategy-json-toolbar"><span>Actual backend response</span><button type="button" onClick={() => void copy()} disabled={!value}>▣ Copy</button></div>{value ? <pre>{value}</pre> : <Empty><span className="strategy-empty-icon">⌁</span><b>Waiting for backend output</b><small>Generated or selected library data will appear as readable JSON.</small></Empty>}{message && <span className="strategy-copy-message">{message}</span>}</Panel>; }

function ValidationSave({
  definition,
  composite,
  result,
  sourceType,
  descriptors,
  activeDraft,
  onSaveToDatabase,
  onUpdateName,
  isSaving,
  error,
  message,
}: {
  definition?: StrategyDefinition;
  composite?: Composite;
  result?: StrategyGenerationResult;
  sourceType: SourceType;
  descriptors: Resource<StrategyDescriptor[]>;
  activeDraft?: StrategyDraft;
  onSaveToDatabase: (customName: string) => Promise<void>;
  onUpdateName?: (id: string, newName: string) => void;
  isSaving?: boolean;
  error?: unknown;
  message: string;
}) {
  const isCompositeDraft = Boolean(composite || result?.compositeStrategyDefinition || activeDraft?.composite || activeDraft?.kind === "COMPOSITE");
  const isComplete = Boolean(definition || composite || result?.compositeStrategyDefinition || activeDraft);
  const targetId = activeDraft?.id ?? definition?.id ?? composite?.id;
  const customNamesMap = loadCustomNamesMap();
  const currentSavedName = (targetId ? customNamesMap[targetId] : undefined)
    ?? activeDraft?.name
    ?? definition?.familyName
    ?? definition?.strategyName
    ?? (composite ? (composite.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble") : undefined)
    ?? (result?.compositeStrategyDefinition ? (result.compositeStrategyDefinition.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble") : "");

  const strategyName = currentSavedName || (isCompositeDraft ? "Composite Ensemble" : "Strategy");
  const supported = isCompositeDraft ? true : (definition ? (descriptors.data?.some((item) => item.name === definition.strategyName) ?? true) : Boolean(activeDraft));
  const logicValid = Boolean(definition || composite || result?.compositeStrategyDefinition || activeDraft);

  const [customName, setCustomName] = useState(currentSavedName);

  useEffect(() => {
    setCustomName(currentSavedName);
  }, [currentSavedName, targetId]);

  const isNameModified = Boolean(targetId && customName.trim() && customName.trim() !== currentSavedName);

  const tags = useMemo(() => {
    if (!definition && !composite && !result?.compositeStrategyDefinition && !activeDraft) return [];
    if (composite || result?.compositeStrategyDefinition || activeDraft?.composite || activeDraft?.kind === "COMPOSITE") {
      const meth = activeDraft?.composite?.method ?? composite?.method ?? result?.compositeStrategyDefinition?.method ?? "Ensemble";
      return ["Composite", meth === "MAJORITY_VOTE" ? "Majority Vote" : "Weighted Score", "Multi-Indicator"];
    }
    const t = [strategyName];
    if (definition?.familyName) t.push(definition.familyName);
    const params = definition?.parameters ?? activeDraft?.parameters ?? {};
    if (params.rsiPeriod || params.period) t.push("RSI");
    if (params.emaPeriod || params.fastPeriod) t.push("Trend");
    if (params.bollingerPeriod) t.push("Bollinger");
    return Array.from(new Set(t)).slice(0, 4);
  }, [definition, composite, result, activeDraft, strategyName]);

  const versionDisplay = activeDraft?.version ?? definition?.version ?? composite?.version ?? result?.compositeStrategyDefinition?.version ?? 1;
  const isSavedInDb = activeDraft ? activeDraft.isSaved : Boolean(definition?.id || composite?.id);

  const resolvedSource = definition
    ? resolveStrategySource(definition, loadProvenanceMap())
    : composite
    ? "COMPOSITE_BUILDER"
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
            onChange={(e) => {
              const val = e.target.value;
              setCustomName(val);
              if (targetId && val.trim()) {
                onUpdateName?.(targetId, val.trim());
                if (activeDraft?.savedDefinitionId && activeDraft.savedDefinitionId !== targetId) {
                  onUpdateName?.(activeDraft.savedDefinitionId, val.trim());
                }
              }
            }}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {isNameModified && (
                <button
                  type="button"
                  className="btn-save-database-primary"
                  style={{ background: "#2563eb", cursor: "pointer" }}
                  onClick={() => {
                    if (targetId && customName.trim()) {
                      onUpdateName?.(targetId, customName.trim());
                    }
                  }}
                >
                  💾 Save New Name
                </button>
              )}
              <button
                type="button"
                className="btn-backtest-link"
                onClick={() => {
                  const savedDbId = activeDraft?.savedDefinitionId ?? definition?.id ?? composite?.id ?? (targetId && !targetId.startsWith("draft-") ? targetId : undefined);
                  if (savedDbId) {
                    const isComp = Boolean(composite || result?.compositeStrategyDefinition || activeDraft?.composite || activeDraft?.kind === "COMPOSITE" || savedDbId.startsWith("composite-"));
                    launchStrategyBacktest(isComp ? "composite" : "single", savedDbId);
                  }
                }}
              >
                🚀 Run Backtest with this Strategy →
              </button>
            </div>
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

  const isDraft = target.type === "DRAFT";
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
            <h3>{isDraft ? "Discard Draft" : "Delete Strategy"}</h3>
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

          {isDraft ? (
            <div className="delete-notice-box">
              <span className="notice-icon">ℹ️</span>
              <span>This will discard this unsaved draft from your browser.</span>
            </div>
          ) : (
            <div className="delete-cascade-warning-box">
              <span className="notice-icon">⚠️</span>
              <div>
                <b>Permanent Cascade Deletion:</b>
                <div style={{ marginTop: "2px" }}>
                  Deleting this strategy will permanently erase it from the database, along with:
                </div>
                <ul className="cascade-list">
                  <li>All historical <b>Backtest candidates & run logs</b> referencing this strategy.</li>
                  <li>All recorded <b>Trades & Attempt metrics</b>.</li>
                  <li>All evaluation results & scores on the <b>Leaderboard</b>.</li>
                  {target.type === "DEFINITION" && (
                    <li>Any <b>Composite ensembles</b> that include this strategy as a component.</li>
                  )}
                </ul>
                <div style={{ marginTop: "6px", fontWeight: 700, fontSize: "11px", color: "#7f1d1d" }}>
                  ⛔ This action cannot be undone.
                </div>
              </div>
            </div>
          )}
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
            🗑️ {isDraft ? "Discard Draft" : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getPaginationRange(current: number, total: number): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

interface UnifiedStrategyItem {
  id: string;
  kind: "DRAFT" | "DEFINITION" | "COMPOSITE";
  name: string;
  subName: string;
  sourceType: string;
  sourceBadge: string;
  badgeClass: string;
  createdAt: string;
  versionLabel: string;
  parametersSummary: string;
  status: "DRAFT" | "SAVED";
  rawDraft?: StrategyDraft;
  rawDefinition?: StrategyDefinition;
  rawComposite?: Composite;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const provenanceMap = useMemo(() => loadProvenanceMap(), [definitions.data, drafts]);
  const customNamesMap = useMemo(() => loadCustomNamesMap(), [definitions.data, composites.data, drafts]);

  const unsavedDrafts = drafts.filter((d) => !d.isSaved);
  const totalSingle = definitions.data?.length ?? 0;
  const totalComposite = composites.data?.length ?? 0;
  const totalDrafts = unsavedDrafts.length;
  const totalCount = totalSingle + totalComposite + totalDrafts;

  const allItems = useMemo<UnifiedStrategyItem[]>(() => {
    const list: UnifiedStrategyItem[] = [];

    // 1. Unsaved Drafts
    for (const draft of unsavedDrafts) {
      const isCompDraft = draft.kind === "COMPOSITE" || Boolean(draft.composite);
      const sourceBadge =
        draft.sourceType === "WEB_IMPORT"
          ? "↗ Web Import"
          : draft.sourceType === "MANUAL_BUILDER"
          ? "🛠️ Manual Builder"
          : draft.sourceType === "COMPOSITE_BUILDER"
          ? "🔀 Composite Builder"
          : "✦ User Prompt";
      const badgeClass =
        draft.sourceType === "WEB_IMPORT"
          ? "badge-web-import"
          : draft.sourceType === "MANUAL_BUILDER"
          ? "badge-manual-builder"
          : draft.sourceType === "COMPOSITE_BUILDER"
          ? "badge-composite-builder"
          : "badge-user-prompt";
      const draftTitle = customNamesMap[draft.id] ?? (draft.name || (isCompDraft ? "Composite Ensemble" : draft.strategyName));
      const draftSub = isCompDraft ? "Multi-Indicator Ensemble · Active Draft" : `${draft.strategyName} · Active Draft`;
      const logicSummary = isCompDraft && draft.composite
        ? (draft.composite.thresholds
            ? `${draft.composite.components.length} components · Buy ≥ ${draft.composite.thresholds.buy}, Sell ≤ ${draft.composite.thresholds.sell}`
            : `${draft.composite.components.length} components · Strict majority consensus`)
        : Object.entries(draft.parameters)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ") || "Standard Parameters";

      list.push({
        id: draft.id,
        kind: "DRAFT",
        name: draftTitle,
        subName: draftSub,
        sourceType: draft.sourceType,
        sourceBadge,
        badgeClass,
        createdAt: draft.createdAt,
        versionLabel: "Draft",
        parametersSummary: logicSummary,
        status: "DRAFT",
        rawDraft: draft,
      });
    }

    // 2. Persisted Single Strategies
    if (definitions.data) {
      for (const item of definitions.data) {
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
        const stratName = customNamesMap[item.id] ?? item.familyName ?? item.strategyName;

        list.push({
          id: item.id,
          kind: "DEFINITION",
          name: stratName,
          subName: item.strategyName,
          sourceType: source,
          sourceBadge: sourceLabel,
          badgeClass,
          createdAt: item.createdAt,
          versionLabel: `v${item.version}`,
          parametersSummary: parameterSummary(item),
          status: "SAVED",
          rawDefinition: item,
        });
      }
    }

    // 3. Persisted Composite Strategies
    if (composites.data) {
      for (const comp of composites.data) {
        const methodLabel = customNamesMap[comp.id] ?? (comp.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble");
        const compNames = comp.components
          .map((c) => {
            const found = definitions.data?.find((d) => d.id === c.strategyDefinitionId);
            return found?.strategyName ?? "Strategy";
          })
          .join(" + ");
        const logicSummary = comp.method === "WEIGHTED_SCORE" && comp.thresholds
          ? `${comp.components.length} components (${compNames}) · Buy ≥ ${comp.thresholds.buy}, Sell ≤ ${comp.thresholds.sell}`
          : `${comp.components.length} components (${compNames}) · Strict majority consensus`;

        list.push({
          id: comp.id,
          kind: "COMPOSITE",
          name: `🔀 ${methodLabel}`,
          subName: "Multi-Indicator Ensemble",
          sourceType: "COMPOSITE_BUILDER",
          sourceBadge: "🔀 Composite Builder",
          badgeClass: "badge-composite-builder",
          createdAt: comp.createdAt,
          versionLabel: `v${comp.version}`,
          parametersSummary: logicSummary,
          status: "SAVED",
          rawComposite: comp,
        });
      }
    }

    // Sort newest first
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [unsavedDrafts, definitions.data, composites.data, provenanceMap, customNamesMap]);

  const filteredItems = useMemo(() => {
    let result = allItems;

    // 1. Tab Filter
    if (filter === "DRAFTS") {
      result = result.filter((item) => item.status === "DRAFT");
    } else if (filter === "COMPOSITE_BUILDER") {
      result = result.filter((item) => item.kind === "COMPOSITE" || item.sourceType === "COMPOSITE_BUILDER");
    } else if (filter !== "ALL") {
      result = result.filter((item) => item.sourceType === filter && item.status === "SAVED");
    }

    // 2. Search Query Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.subName.toLowerCase().includes(q) ||
          item.parametersSummary.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allItems, filter, searchQuery]);

  // Pagination
  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(pageIndex, totalPages);
  const startIdx = totalFiltered > 0 ? (currentPage - 1) * pageSize : 0;
  const endIdx = Math.min(startIdx + pageSize, totalFiltered);
  const displayedItems = filteredItems.slice(startIdx, endIdx);

  const handleInspect = (item: UnifiedStrategyItem) => {
    if (item.rawDraft) {
      onSelectDraft(item.rawDraft);
    } else if (item.rawDefinition) {
      onSelectDefinition(item.rawDefinition);
    } else if (item.rawComposite) {
      onSelectComposite(item.rawComposite);
    }
    // Smooth scroll to top of page to view strategy details
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Panel title="Saved Strategies & Drafts" className="strategy-library-panel">
      {/* Table Filter & Search Bar */}
      <div className="table-filter-bar">
        <div className="table-filter-tabs">
          <button
            type="button"
            className={`filter-tab-btn ${filter === "ALL" ? "active" : ""}`}
            onClick={() => {
              setFilter("ALL");
              setPageIndex(1);
            }}
          >
            All <span className="tab-count-badge">{totalCount}</span>
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "USER_PROMPT" ? "active" : ""}`}
            onClick={() => {
              setFilter("USER_PROMPT");
              setPageIndex(1);
            }}
          >
            ✦ User Prompt
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "WEB_IMPORT" ? "active" : ""}`}
            onClick={() => {
              setFilter("WEB_IMPORT");
              setPageIndex(1);
            }}
          >
            ↗ Web Import
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "MANUAL_BUILDER" ? "active" : ""}`}
            onClick={() => {
              setFilter("MANUAL_BUILDER");
              setPageIndex(1);
            }}
          >
            🛠️ Manual Builder
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === "COMPOSITE_BUILDER" ? "active" : ""}`}
            onClick={() => {
              setFilter("COMPOSITE_BUILDER");
              setPageIndex(1);
            }}
          >
            🔀 Composite Builder <span className="tab-count-badge">{totalComposite}</span>
          </button>
          {totalDrafts > 0 && (
            <button
              type="button"
              className={`filter-tab-btn tab-drafts ${filter === "DRAFTS" ? "active" : ""}`}
              onClick={() => {
                setFilter("DRAFTS");
                setPageIndex(1);
              }}
            >
              ○ Drafts <span className="tab-count-badge draft">{totalDrafts}</span>
            </button>
          )}
        </div>

        {/* Search Input Box */}
        <div className="table-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="table-search-input"
            placeholder="Search strategy by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIndex(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => {
                setSearchQuery("");
                setPageIndex(1);
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {definitions.isLoading || composites.isLoading ? (
        <Loading />
      ) : definitions.error || composites.error ? (
        <ErrorBox error={definitions.error ?? composites.error} />
      ) : totalCount === 0 ? (
        <Empty>
          <b>No strategies found in this category.</b>
          <small>Generate a strategy with AI, import from URL, or use the builders above.</small>
        </Empty>
      ) : totalFiltered === 0 ? (
        <div className="strategy-empty" style={{ minHeight: "140px", padding: "24px" }}>
          <span className="strategy-empty-icon">🔍</span>
          <b>No strategies match "{searchQuery}"</b>
          <small>Try a different search term or clear the search filter.</small>
        </div>
      ) : (
        <>
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
                {displayedItems.map((item) => {
                  const isSelected = selected?.id === item.id;
                  const isDraft = item.status === "DRAFT";

                  return (
                    <tr
                      key={item.id}
                      className={`${isDraft ? "draft-row" : ""} ${item.kind === "COMPOSITE" ? "composite-row" : ""} ${isSelected ? "selected" : ""}`}
                    >
                      <td>
                        <div className="table-strat-cell">
                          <span className="table-strat-name">{item.name}</span>
                          <span className="table-strat-sub">{item.subName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`table-source-badge ${item.badgeClass}`}>
                          {item.sourceBadge}
                        </span>
                      </td>
                      <td className="table-date-cell">{displayDate(item.createdAt)}</td>
                      <td>
                        {isDraft ? (
                          <span className="draft-version-badge">Draft</span>
                        ) : (
                          <span className="version-pill">{item.versionLabel}</span>
                        )}
                      </td>
                      <td className="strategy-parameters">{item.parametersSummary}</td>
                      <td>
                        {isDraft ? (
                          <span className="status-pill status-pill-draft">○ Draft</span>
                        ) : (
                          <span className="status-pill status-pill-saved">● Saved</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions-cluster">
                          <button
                            type="button"
                            className="btn-table-inspect"
                            onClick={() => handleInspect(item)}
                            title="Inspect strategy (scroll to top)"
                          >
                            Inspect
                          </button>
                          {isDraft ? (
                            <button
                              type="button"
                              className="btn-table-save"
                              onClick={() => void onSaveDraft(item.rawDraft!)}
                            >
                              💾 Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-table-backtest"
                              onClick={() => {
                                const stratType = item.kind === "COMPOSITE" ? "composite" : "single";
                                launchStrategyBacktest(stratType, item.id);
                              }}
                            >
                              Backtest →
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-table-delete"
                            title={isDraft ? "Delete draft" : "Delete strategy"}
                            onClick={() =>
                              setDeleteTarget({
                                id: item.id,
                                name: `${item.name} (${item.versionLabel})`,
                                type: item.kind,
                                details: item.parametersSummary,
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

          {/* Table Pagination Controls */}
          <div className="trades-pagination-footer" style={{ marginTop: "12px", borderRadius: "0 0 8px 8px" }}>
            <div className="pagination-left">
              <span>Show</span>
              <select
                className="pagination-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>
                {totalFiltered > 0
                  ? `${startIdx + 1}–${endIdx} of ${totalFiltered} ${totalFiltered === 1 ? "strategy" : "strategies"}`
                  : "0 strategies"}
              </span>
            </div>

            <div className="pagination-right">
              <button
                type="button"
                className="btn-page-nav"
                disabled={currentPage <= 1}
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                ‹
              </button>
              {getPaginationRange(currentPage, totalPages).map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`btn-page-number ${item === currentPage ? "active" : ""}`}
                    onClick={() => setPageIndex(Number(item))}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                className="btn-page-nav"
                disabled={currentPage >= totalPages}
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        </>
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

function PluginEditor({ descriptors, onSaved, error, setError }: { descriptors: Resource<StrategyDescriptor[]>; onSaved: (unblockedId?: string) => void; error?: unknown; setError: (error?: unknown) => void }) {
  const [selected, setSelected] = useState<StrategyDescriptor>();
  const [parameters, setParameters] = useState<Record<string, number | string>>({});
  const [customName, setCustomName] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ id: string; name: string } | null>(null);

  const save = useMutation({
    mutationFn: () => {
      if (!selected) return Promise.reject(new Error("Select an indicator."));
      return api.define(selected.name, parameters);
    },
    onSuccess: (saved) => {
      const finalName = customName.trim() || selected?.displayName || selected?.name || "Strategy";
      if (saved?.id) {
        recordProvenance(saved.id, "MANUAL_BUILDER");
        unpersistDeletedStrategyId(saved.id);
        persistCustomName(saved.id, finalName);
        setSuccessInfo({ id: saved.id, name: finalName });
      }
      onSaved(saved?.id);
    },
    onError: setError,
  });

  useEffect(() => {
    if (!selected && descriptors.data?.[0]) {
      setSelected(descriptors.data[0]);
      setParameters(parameterDefaults(descriptors.data[0].parameters));
      setCustomName(descriptors.data[0].displayName);
    }
  }, [descriptors.data, selected]);

  const select = (item: StrategyDescriptor) => {
    setSelected(item);
    setParameters(parameterDefaults(item.parameters));
    setCustomName(item.displayName);
    setError(undefined);
    setSuccessInfo(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setSuccessInfo(null);
    if (!selected) {
      setError(new Error("Please select an indicator template."));
      return;
    }
    if (!customName.trim()) {
      setError(new Error("Please enter a strategy name."));
      return;
    }
    for (const param of selected.parameters) {
      const val = parameters[param.key];
      if (param.required && (val === undefined || val === "" || (typeof val === "number" && Number.isNaN(val)))) {
        setError(new Error(`Please provide a valid value for "${param.label}".`));
        return;
      }
      if (param.type === "INTEGER" || param.type === "NUMBER") {
        const num = Number(val);
        if (param.minimum !== undefined && num < param.minimum) {
          setError(new Error(`"${param.label}" must be at least ${param.minimum}.`));
          return;
        }
        if (param.maximum !== undefined && num > param.maximum) {
          setError(new Error(`"${param.label}" cannot exceed ${param.maximum}.`));
          return;
        }
      }
    }
    save.mutate();
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
          noValidate
          className="manual-studio-card"
          onSubmit={handleSubmit}
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

          {/* Strategy Name Input Field */}
          <div className="studio-name-box">
            <label className="param-label" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="param-name" style={{ fontWeight: 800, fontSize: "13px", color: "#0f172a" }}>
                  🏷️ Strategy Name <span style={{ color: "#ef4444" }}>*</span>
                </span>
                <small style={{ color: "#64748b", fontSize: "11px" }}>(Required)</small>
              </div>
              <input
                className="param-control studio-name-input"
                type="text"
                required
                value={customName}
                onChange={(event) => {
                  setCustomName(event.target.value);
                  setSuccessInfo(null);
                }}
                placeholder={`e.g. My Custom ${selected.displayName}`}
              />
              <small className="studio-name-hint">
                Give this strategy definition a recognizable name for your library, backtest dropdowns, and discovery searches.
              </small>
            </label>
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
                      onChange={(event) => {
                        setParameters({ ...parameters, [parameter.key]: event.target.value });
                        setSuccessInfo(null);
                      }}
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
                      step={parameter.type === "INTEGER" ? 1 : (parameter.step ?? "any")}
                      onChange={(event) => {
                        setParameters({ ...parameters, [parameter.key]: Number(event.target.value) });
                        setSuccessInfo(null);
                      }}
                    />
                  )}
                </label>
              </div>
            ))}
          </div>

          <ErrorBox error={error ?? save.error} />

          {successInfo && (
            <div className="manual-save-success-box">
              <div className="save-success-icon">✓</div>
              <div className="save-success-details">
                <b>Strategy "{successInfo.name}" saved to database!</b>
                <p>The strategy is now live in your Saved Strategies library below and ready for Backtesting or Composite Building.</p>
              </div>
              <button
                type="button"
                className="btn-backtest-link"
                style={{ width: "auto", padding: "6px 14px", alignSelf: "center", cursor: "pointer", border: "none" }}
                onClick={() => launchStrategyBacktest("single", successInfo.id)}
              >
                🚀 Backtest Now →
              </button>
            </div>
          )}

          <div className="studio-footer-actions">
            <div className="studio-hint">
              <span>💾 Saves an executable definition into PostgreSQL for use in Backtesting and Composite Building.</span>
            </div>
            <button
              type="submit"
              className="btn-save-manual-strategy"
              disabled={save.isPending || !customName.trim()}
            >
              {save.isPending
                ? "⏳ Saving to Database..."
                : successInfo
                ? `✓ Saved "${successInfo.name}"`
                : !customName.trim()
                ? "Please enter a strategy name"
                : `💾 Save ${selected.displayName} Strategy`}
            </button>
          </div>
        </form>
      ) : (
        <Empty>Select an indicator from the templates above to configure its parameters.</Empty>
      )}
    </Panel>
  );
}

function getStratCategory(item: StrategyDefinition): "RSI" | "MA" | "BOLLINGER" | "SENTIMENT" | "OTHER" {
  const text = `${item.strategyName} ${item.familyName ?? ""}`.toUpperCase();
  if (text.includes("RSI")) return "RSI";
  if (text.includes("BOLLINGER") || text.includes("BB")) return "BOLLINGER";
  if (text.includes("SENTIMENT") || text.includes("NEWS")) return "SENTIMENT";
  if (text.includes("MA") || text.includes("AVERAGE") || text.includes("EMA") || text.includes("SMA")) return "MA";
  return "OTHER";
}

const defaultCompositeName = (m: CombinationMethod) =>
  m === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble";

function CompositeLibrary({ definitions, composites: _composites, refresh, error, setError }: { definitions: Resource<StrategyDefinition[]>; composites: Resource<Composite[]>; refresh: () => void; error?: unknown; setError: (error?: unknown) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<CombinationMethod>("MAJORITY_VOTE");
  const [buy, setBuy] = useState("0.5");
  const [sell, setSell] = useState("-0.5");
  const [compositeName, setCompositeName] = useState(() => defaultCompositeName("MAJORITY_VOTE"));
  const [successInfo, setSuccessInfo] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "RSI" | "MA" | "BOLLINGER" | "SENTIMENT" | "SELECTED">("ALL");

  const customNamesMap = useMemo(() => loadCustomNamesMap(), [definitions.data]);

  const handleMethodChange = (newMethod: CombinationMethod) => {
    setMethod(newMethod);
    if (!compositeName.trim() || compositeName === defaultCompositeName(method)) {
      setCompositeName(defaultCompositeName(newMethod));
    }
    setSuccessInfo(null);
  };

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
      const finalName = compositeName.trim() || defaultCompositeName(method);
      if (saved?.id) {
        recordProvenance(saved.id, "COMPOSITE_BUILDER");
        unpersistDeletedStrategyId(saved.id);
        persistCustomName(saved.id, finalName);
        setSuccessInfo({ id: saved.id, name: finalName });
      }
      refresh();
      setSelectedIds([]);
      setWeights({});
      setCompositeName(defaultCompositeName(method));
    },
    onError: setError,
  });

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
    setSelectedIds(next);
    setWeights(equalWeights(next));
    setError(undefined);
  };

  const categoryCounts = useMemo(() => {
    const counts = { ALL: 0, RSI: 0, MA: 0, BOLLINGER: 0, SENTIMENT: 0, SELECTED: 0 };
    if (!definitions.data) return counts;
    counts.ALL = definitions.data.length;
    counts.SELECTED = selectedIds.length;
    definitions.data.forEach((d) => {
      const cat = getStratCategory(d);
      if (cat in counts) {
        counts[cat as keyof typeof counts]++;
      }
    });
    return counts;
  }, [definitions.data, selectedIds]);

  const filteredDefinitions = useMemo(() => {
    if (!definitions.data) return [];
    return definitions.data.filter((item) => {
      const isChecked = selectedIds.includes(item.id);
      if (categoryFilter === "SELECTED" && !isChecked) return false;
      if (categoryFilter !== "ALL" && categoryFilter !== "SELECTED") {
        if (getStratCategory(item) !== categoryFilter) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const custom = (customNamesMap[item.id] ?? "").toLowerCase();
      const family = (item.familyName ?? "").toLowerCase();
      const strat = item.strategyName.toLowerCase();
      const params = parameterSummary(item).toLowerCase();
      return custom.includes(q) || family.includes(q) || strat.includes(q) || params.includes(q);
    });
  }, [definitions.data, selectedIds, categoryFilter, searchQuery, customNamesMap]);

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredDefinitions.map((d) => d.id);
    const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
    setSelectedIds(combined);
    setWeights(equalWeights(combined));
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdSet = new Set(filteredDefinitions.map((d) => d.id));
    const next = selectedIds.filter((id) => !filteredIdSet.has(id));
    setSelectedIds(next);
    setWeights(equalWeights(next));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setWeights({});
  };

  const weightSum = Object.values(weightedComponents(selectedIds, weights)).reduce((sum, item) => sum + item.weight, 0);
  const buyNum = Number(buy);
  const sellNum = Number(sell);
  const thresholdsValid = Number.isFinite(buyNum) && Number.isFinite(sellNum) && buyNum > sellNum && buyNum >= -1 && buyNum <= 1 && sellNum >= -1 && sellNum <= 1;
  const weightedValid = method === "MAJORITY_VOTE" || (Math.abs(weightSum - 1) < 0.0001 && thresholdsValid);
  const isNameValid = Boolean(compositeName.trim());
  const canSave = selectedIds.length >= 2 && weightedValid && isNameValid && !save.isPending;

  return (
    <Panel title="🔀 Composite Strategy Builder (Multi-Indicator Ensemble)" className="strategy-composite-panel">
      <div className="composite-builder-header">
        <p className="composite-builder-sub">
          Combine 2 or more saved strategies into a single decision engine. Ensemble strategies filter out false signals by requiring consensus across multiple indicators.
        </p>
      </div>

      <div className="composite-builder-layout">
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
              onClick={() => handleMethodChange("MAJORITY_VOTE")}
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
              onClick={() => handleMethodChange("WEIGHTED_SCORE")}
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

        {/* Step 2: Component Strategies Checklist with Search & Filters */}
        <div className="composite-step-card">
          <div className="composite-step-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="step-badge">2</span>
              <div>
                <h4>Select 2 or More Saved Strategies to Combine</h4>
                <small className="step-sub-hint">({selectedIds.length} strategies selected)</small>
              </div>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="btn-filter-quick"
                style={{ color: "#dc2626", border: "1px solid #fca5a5" }}
                onClick={handleClearSelection}
              >
                Clear Selection ({selectedIds.length})
              </button>
            )}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="composite-filter-toolbar">
            <div className="composite-search-row">
              <div className="composite-search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="composite-search-input"
                  placeholder="Search strategies by name, indicator, or parameters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="composite-search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="composite-quick-actions">
                <button
                  type="button"
                  className="btn-filter-quick"
                  onClick={handleSelectAllFiltered}
                  disabled={filteredDefinitions.length === 0}
                  title="Select all currently visible strategies"
                >
                  ✓ Select All
                </button>
                <button
                  type="button"
                  className="btn-filter-quick"
                  onClick={handleDeselectAllFiltered}
                  disabled={filteredDefinitions.length === 0 || !filteredDefinitions.some((d) => selectedIds.includes(d.id))}
                  title="Deselect visible strategies"
                >
                  ✕ Deselect
                </button>
              </div>
            </div>

            <div className="composite-filter-pills-row">
              <div className="composite-pills-group">
                <button
                  type="button"
                  className={`composite-filter-pill ${categoryFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("ALL")}
                >
                  All <span className="pill-count">{categoryCounts.ALL}</span>
                </button>
                <button
                  type="button"
                  className={`composite-filter-pill ${categoryFilter === "SELECTED" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("SELECTED")}
                >
                  Selected <span className="pill-count">{categoryCounts.SELECTED}</span>
                </button>
                <button
                  type="button"
                  className={`composite-filter-pill ${categoryFilter === "RSI" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("RSI")}
                >
                  RSI <span className="pill-count">{categoryCounts.RSI}</span>
                </button>
                <button
                  type="button"
                  className={`composite-filter-pill ${categoryFilter === "MA" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("MA")}
                >
                  Trend (MA) <span className="pill-count">{categoryCounts.MA}</span>
                </button>
                <button
                  type="button"
                  className={`composite-filter-pill ${categoryFilter === "BOLLINGER" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("BOLLINGER")}
                >
                  Bollinger <span className="pill-count">{categoryCounts.BOLLINGER}</span>
                </button>
                <button
                  type="button"
                  className={`composite-filter-pill ${categoryFilter === "SENTIMENT" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("SENTIMENT")}
                >
                  Sentiment <span className="pill-count">{categoryCounts.SENTIMENT}</span>
                </button>
              </div>
              <span className="composite-filter-count">
                Showing {filteredDefinitions.length} of {definitions.data?.length ?? 0} strategies
              </span>
            </div>
          </div>

          <div className="composite-strategy-picker">
            {definitions.isLoading ? (
              <Loading />
            ) : definitions.error ? (
              <ErrorBox error={definitions.error} />
            ) : definitions.data?.length ? (
              filteredDefinitions.length > 0 ? (
                <div className="composite-checkbox-list">
                  {filteredDefinitions.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    const displayName = customNamesMap[item.id] ?? item.familyName ?? item.strategyName;
                    const cat = getStratCategory(item);
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
                              <b className="item-name">{displayName}</b>
                              <span className={`composite-category-tag cat-${cat.toLowerCase()}`}>{cat}</span>
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
                              step="any"
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
                <div className="composite-no-match">
                  <span>🔍 No strategies match your search or filter criteria.</span>
                  <button
                    type="button"
                    className="btn-filter-quick"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("ALL");
                    }}
                  >
                    Clear Search &amp; Filters
                  </button>
                </div>
              )
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
                  min={-1}
                  max={1}
                  step="any"
                  value={buy}
                  onChange={(event) => setBuy(event.target.value)}
                />
                <small className="threshold-help">Minimum score to execute BUY (range: -1.0 to 1.0).</small>
              </label>
              <label className="threshold-field">
                <span>Sell Signal Threshold (Score &le;)</span>
                <input
                  className="threshold-input"
                  type="number"
                  min={-1}
                  max={1}
                  step="any"
                  value={sell}
                  onChange={(event) => setSell(event.target.value)}
                />
                <small className="threshold-help">Maximum score to execute SELL (range: -1.0 to 1.0).</small>
              </label>
            </div>
          </div>
        )}

        {/* Step: Custom Composite Strategy Name */}
        <div className="composite-step-card">
          <div className="composite-step-header">
            <span className="step-badge">{method === "WEIGHTED_SCORE" ? "4" : "3"}</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <h4>🏷️ Composite Strategy Name <span style={{ color: "#ef4444" }}>*</span></h4>
              <small style={{ color: "#64748b", fontSize: "11px" }}>(Required)</small>
            </div>
          </div>
          <div className="composite-name-input-group">
            <input
              className="param-control composite-name-input"
              type="text"
              required
              value={compositeName}
              onChange={(event) => {
                setCompositeName(event.target.value);
                setSuccessInfo(null);
              }}
              placeholder={defaultCompositeName(method)}
            />
            <small className="composite-name-hint">
              Specify a recognizable name for this composite ensemble to display in your library, backtest dropdowns, and discovery searches.
            </small>
          </div>
        </div>

        {/* Action Button */}
        <div className="composite-action-box">
          <button
            type="button"
            className="btn-create-composite"
            disabled={!canSave}
            onClick={() => {
              setError(undefined);
              setSuccessInfo(null);
              if (!compositeName.trim()) {
                setError(new Error("Please enter a composite strategy name before saving."));
                return;
              }
              save.mutate();
            }}
          >
            {save.isPending
              ? "⏳ Saving Ensemble to Database..."
              : selectedIds.length < 2
              ? "Select at least 2 strategies to combine"
              : !isNameValid
              ? "Please enter a composite strategy name"
              : `💾 Save "${compositeName.trim()}" Composite`}
          </button>
        </div>

        {successInfo && (
          <div className="manual-save-success-box">
            <div className="save-success-icon">✓</div>
            <div className="save-success-details">
              <b>Composite Strategy "{successInfo.name}" saved to database!</b>
              <p>The ensemble is registered in PostgreSQL and ready for Backtest Lab.</p>
            </div>
            <button
              type="button"
              className="btn-backtest-link"
              style={{ width: "auto", padding: "6px 14px", alignSelf: "center", cursor: "pointer", border: "none" }}
              onClick={() => launchStrategyBacktest("composite", successInfo.id)}
            >
              🚀 Backtest Ensemble →
            </button>
          </div>
        )}

        <ErrorBox error={error ?? save.error} />
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

  // Sync / Purge: On mount, ensure any IDs stored in deletedIds are permanently deleted in backend
  useEffect(() => {
    const deleted = loadDeletedStrategyIds();
    if (deleted.length > 0) {
      Promise.allSettled(
        deleted.map((id) =>
          id.startsWith("composite-strategy-")
            ? api.deleteComposite(id)
            : api.deleteStrategyDefinition(id)
        )
      ).then(() => {
        localStorage.removeItem(DELETED_STRATEGIES_KEY);
        setDeletedIds([]);
        void queryClient.invalidateQueries({ queryKey: ["strategies"] });
      });
    }
  }, []);

  const unsavedDraftIds = useMemo(() => {
    const ids = new Set<string>();
    drafts.filter((d) => !d.isSaved).forEach((d) => {
      if (d.savedDefinitionId) ids.add(d.savedDefinitionId);
      if (d.composite?.components) {
        d.composite.components.forEach((c) => ids.add(c.strategyDefinitionId));
      }
    });
    return ids;
  }, [drafts]);

  const visibleDefinitions = useMemo(() => {
    return (definitions.data ?? []).filter((d) => !deletedIds.includes(d.id) && !unsavedDraftIds.has(d.id));
  }, [definitions.data, deletedIds, unsavedDraftIds]);

  const visibleComposites = useMemo(() => {
    return (composites.data ?? []).filter((c) => !deletedIds.includes(c.id) && !unsavedDraftIds.has(c.id));
  }, [composites.data, deletedIds, unsavedDraftIds]);

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
      const isComposite = generated.kind === "COMPOSITE";
      const stratDef = generated.kind === "SINGLE" ? generated.strategyDefinition : undefined;
      const compDef = generated.kind === "COMPOSITE" ? generated.compositeStrategyDefinition : undefined;

      const sourceTag: StrategySourceType = sourceType === "TEXT" ? "USER_PROMPT" : "WEB_IMPORT";
      if (stratDef?.id) {
        recordProvenance(stratDef.id, sourceTag);
      }
      if (compDef?.id) {
        recordProvenance(compDef.id, sourceTag);
      }

      let draftName = "Strategy";
      let stratName = "Strategy";
      let params: Record<string, number | string> = {};

      if (stratDef) {
        stratName = stratDef.strategyName;
        draftName = stratDef.familyName ?? stratName;
        params = stratDef.parameters ?? {};
      } else if (compDef) {
        stratName = compDef.method;
        draftName = compDef.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble";
      }

      const newDraft: StrategyDraft = {
        id: `draft-${Date.now()}`,
        kind: isComposite ? "COMPOSITE" : "SINGLE",
        name: draftName,
        strategyName: stratName,
        parameters: params,
        composite: compDef ? {
          method: compDef.method,
          components: compDef.components,
          thresholds: compDef.thresholds,
        } : undefined,
        sourceType: sourceTag,
        createdAt: new Date().toISOString(),
        isSaved: false,
        savedDefinitionId: stratDef?.id ?? compDef?.id,
        version: stratDef?.version ?? compDef?.version ?? 1,
      };

      setActiveDraft(newDraft);
      persistActiveDraft(newDraft);
      setDrafts((prev) => {
        const nextDrafts = [newDraft, ...prev.filter((d) => d.id !== newDraft.id)];
        persistDrafts(nextDrafts);
        return nextDrafts;
      });
      setSelected(newDraft);
      setMessage(isComposite ? "AI composite ensemble draft generated! Review logic and click 'Save Strategy' below." : "AI strategy draft generated! Review parameters and click 'Save Strategy' below.");
    },
  });

  const definition = (selected && "implementationSha256" in selected)
    ? (selected as StrategyDefinition)
    : generatedDefinition(result, undefined);
  const composite = (selected && "method" in selected && "components" in selected)
    ? (selected as Composite)
    : generatedComposite(result);
  const preview = result ?? (selected ? { source: "Draft / Database Record", strategy: selected } : (activeDraft ? { source: "Active Draft", draft: activeDraft } : undefined));

  const refreshSavedStrategies = (unblockedId?: string) => {
    if (unblockedId) {
      setDeletedIds((prev) => prev.filter((id) => id !== unblockedId));
    }
    setMessage("Database strategies refreshed.");
    void queryClient.invalidateQueries({ queryKey: ["strategies"] });
    void definitions.refetch();
    void composites.refetch();
  };

  const handleDeleteDraft = (draftId: string) => {
    const target = drafts.find((d) => d.id === draftId);
    if (target?.savedDefinitionId) {
      persistDeletedStrategyId(target.savedDefinitionId);
      setDeletedIds((prev) => [...prev, target.savedDefinitionId!]);
    }
    if (target?.composite?.components) {
      target.composite.components.forEach((c) => {
        persistDeletedStrategyId(c.strategyDefinitionId);
        setDeletedIds((prev) => [...prev, c.strategyDefinitionId]);
      });
    }
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

  const handleDeleteSavedStrategy = async (id: string) => {
    try {
      if (id.startsWith("composite-strategy-")) {
        await api.deleteComposite(id);
      } else {
        await api.deleteStrategyDefinition(id);
      }
    } catch {
      // Backend error fallback
    }
    persistDeletedStrategyId(id);
    setDeletedIds((prev) => [...prev, id]);
    const nextDrafts = drafts.filter((d) => d.savedDefinitionId !== id && d.id !== id);
    setDrafts(nextDrafts);
    persistDrafts(nextDrafts);
    if (selected?.id === id) {
      setSelected(undefined);
      setActiveDraft(undefined);
    }
    setMessage("Strategy permanently deleted from database.");
    void queryClient.invalidateQueries({ queryKey: ["strategies"] });
  };

  const handleSaveToDatabase = async (customName: string) => {
    const targetDraft = activeDraft ?? (selected && !("implementationSha256" in selected) && !("method" in selected) ? (selected as StrategyDraft) : undefined);
    if (!targetDraft) return;

    setIsSaving(true);
    try {
      let savedId = targetDraft.savedDefinitionId;
      if (targetDraft.kind === "COMPOSITE" && targetDraft.composite) {
        if (!savedId) {
          const saved = await api.defineComposite(targetDraft.composite.method, targetDraft.composite.components, targetDraft.composite.thresholds);
          savedId = saved.id;
        }
      } else {
        if (!savedId) {
          const saved = await api.define(targetDraft.strategyName, targetDraft.parameters);
          savedId = saved.id;
        }
      }

      if (savedId) {
        recordProvenance(savedId, targetDraft.sourceType);
        if (customName || targetDraft.name) {
          persistCustomName(savedId, customName || targetDraft.name);
        }
        const nextDeleted = unpersistDeletedStrategyId(savedId);
        setDeletedIds(nextDeleted);
        if (targetDraft.composite?.components) {
          targetDraft.composite.components.forEach((c) => {
            unpersistDeletedStrategyId(c.strategyDefinitionId);
          });
        }
      }

      const updatedDraft: StrategyDraft = {
        ...targetDraft,
        name: customName || targetDraft.name,
        isSaved: true,
        savedDefinitionId: savedId,
      };
      setActiveDraft(updatedDraft);
      persistActiveDraft(updatedDraft);
      setDrafts((prev) => {
        const nextDrafts = prev.map((d) =>
          (d.id === targetDraft.id || (savedId && d.savedDefinitionId === savedId))
            ? { ...d, isSaved: true, name: customName || d.name, savedDefinitionId: savedId }
            : d
        );
        persistDrafts(nextDrafts);
        return nextDrafts;
      });
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

  const handleUpdateCustomName = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const cleanName = newName.trim();
    persistCustomName(id, cleanName);

    setDrafts((prev) => {
      const nextDrafts = prev.map((d) =>
        (d.id === id || d.savedDefinitionId === id) ? { ...d, name: cleanName } : d
      );
      persistDrafts(nextDrafts);
      return nextDrafts;
    });

    if (activeDraft && (activeDraft.id === id || activeDraft.savedDefinitionId === id)) {
      const updated = { ...activeDraft, name: cleanName };
      setActiveDraft(updated);
      persistActiveDraft(updated);
    }

    setMessage(`✓ Strategy name updated to "${cleanName}"!`);
    void queryClient.invalidateQueries({ queryKey: ["strategies"] });
    void definitions.refetch();
    void composites.refetch();
  };

  const handleQuickSaveDraft = async (draft: StrategyDraft) => {
    setIsSaving(true);
    try {
      let savedId = draft.savedDefinitionId;
      if (draft.kind === "COMPOSITE" && draft.composite) {
        if (!savedId) {
          const saved = await api.defineComposite(draft.composite.method, draft.composite.components, draft.composite.thresholds);
          savedId = saved.id;
        }
      } else {
        if (!savedId) {
          const saved = await api.define(draft.strategyName, draft.parameters);
          savedId = saved.id;
        }
      }

      const customNames = loadCustomNamesMap();
      const effectiveName = customNames[draft.id]
        ?? (draft.savedDefinitionId ? customNames[draft.savedDefinitionId] : undefined)
        ?? draft.name;

      if (savedId) {
        recordProvenance(savedId, draft.sourceType);
        persistCustomName(savedId, effectiveName);
        const nextDeleted = unpersistDeletedStrategyId(savedId);
        setDeletedIds(nextDeleted);
        if (draft.composite?.components) {
          draft.composite.components.forEach((c) => {
            unpersistDeletedStrategyId(c.strategyDefinitionId);
          });
        }
      }

      const updatedDraft: StrategyDraft = {
        ...draft,
        name: effectiveName,
        isSaved: true,
        savedDefinitionId: savedId,
      };
      if (activeDraft?.id === draft.id) {
        setActiveDraft(updatedDraft);
        persistActiveDraft(updatedDraft);
      }
      setDrafts((prev) => {
        const nextDrafts = prev.map((d) =>
          (d.id === draft.id || (savedId && d.savedDefinitionId === savedId))
            ? { ...d, name: effectiveName, isSaved: true, savedDefinitionId: savedId }
            : d
        );
        persistDrafts(nextDrafts);
        return nextDrafts;
      });
      setMessage(`✓ Strategy "${effectiveName}" saved to PostgreSQL!`);
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
            definitions={definitions}
          />
          <JsonPreview payload={preview} />
          <ValidationSave
            definition={definition}
            composite={composite}
            result={result}
            sourceType={sourceType}
            descriptors={descriptors}
            activeDraft={activeDraft}
            onSaveToDatabase={handleSaveToDatabase}
            onUpdateName={handleUpdateCustomName}
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
          setCreationMode("AI_GENERATOR");
          setMessage("");
        }}
        onSelectComposite={(comp) => {
          setSelected(comp);
          setActiveDraft(undefined);
          setResult(undefined);
          setCreationMode("AI_GENERATOR");
          setMessage("");
        }}
        onSelectDraft={(draft) => {
          setSelected(draft);
          setActiveDraft(draft);
          setResult(undefined);
          setSourceType(draft.sourceType === "WEB_IMPORT" ? "URL" : "TEXT");
          setCreationMode("AI_GENERATOR");
          setMessage("");
        }}
        onSaveDraft={handleQuickSaveDraft}
        onDeleteDraft={handleDeleteDraft}
        onDeleteSavedStrategy={handleDeleteSavedStrategy}
      />
    </div>
  );
}
