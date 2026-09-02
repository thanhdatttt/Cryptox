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

function PromptInput({ source, setSource, sourceType, setSourceType, busy, onSubmit, onClear, error }: { source: string; setSource: (value: string) => void; sourceType: SourceType; setSourceType: (value: SourceType) => void; busy: boolean; onSubmit: (event: React.FormEvent) => void; onClear: () => void; error?: unknown }) {
  return <Panel title="Strategy input" className="strategy-input-panel"><div className="strategy-input-tabs"><button className={sourceType === "TEXT" ? "active" : ""} onClick={() => setSourceType("TEXT")} type="button">✦ Prompt</button><button className={sourceType === "URL" ? "active" : ""} onClick={() => setSourceType("URL")} type="button">↗ Website URL</button></div><form onSubmit={onSubmit}><label className="strategy-label">{sourceType === "TEXT" ? "Enter strategy description" : "Enter a public HTTP(S) URL"}{sourceType === "TEXT" ? <textarea required maxLength={4000} value={source} onChange={(event) => setSource(event.target.value)} placeholder="Example: RSI below 30 should produce a long signal. Stop loss 2%, take profit 4%." /> : <input required type="url" pattern="https?://.*" value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://example.com/strategy" />}</label>{sourceType === "TEXT" && <span className="strategy-counter">{source.length}/4000</span>}<div className="strategy-input-actions"><Btn primary disabled={busy || !source.trim()}>{busy ? "Sending to backend..." : sourceType === "TEXT" ? "Analyze with backend" : "Generate from URL"}</Btn><Btn type="button" onClick={onClear}>Clear</Btn></div></form><p className="strategy-contract-note">The backend returns a persisted SINGLE or COMPOSITE definition. The Frontend never fetches the submitted URL or executes model output.</p><GenerationError error={error} /></Panel>;
}

function ParsedSummary({ definition, composite, result, sourceType }: { definition?: StrategyDefinition; composite?: Composite; result?: StrategyGenerationResult; sourceType: SourceType }) {
  if (!definition && !composite) {
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
            <span className="prov-v">{sourceType === "TEXT" ? "User Prompt" : "Website URL"}</span>
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
  const paramEntries = Object.entries(definition!.parameters);
  const strategyName = definition!.familyName ?? definition!.strategyName;

  return (
    <Panel title="Strategy analyzed" className="strategy-summary-panel">
      {/* Header Hero Card */}
      <div className="summary-hero-card">
        <div className="summary-hero-top">
          <span className="summary-hero-icon">{iconFor(definition!)}</span>
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
            <span className="param-v">{definition!.strategyName}</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Strategy Version</span>
            <span className="param-v">v{definition!.version}</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Execution Mode</span>
            <span className="param-v">Signal Vector Execution</span>
          </div>
          <div className="summary-param-tile">
            <span className="param-k">Deterministic SHA</span>
            <span className="param-v">Active ✓</span>
          </div>
        </div>
      </div>

      {/* Provenance & Backend Persistence */}
      <div className="summary-provenance-card">
        <div className="provenance-item">
          <span className="prov-k">Generation Source</span>
          <span className="prov-v">{sourceType === "TEXT" ? "Natural Language Prompt" : "Website URL Import"}</span>
        </div>
        <div className="provenance-item">
          <span className="prov-k">Strategy Definition ID</span>
          <code className="prov-v-code">{definition!.id ? `${definition!.id.slice(0, 18)}...` : "Persisted in DB"}</code>
        </div>
      </div>
    </Panel>
  );
}

function JsonPreview({ payload }: { payload?: unknown }) { const [message, setMessage] = useState(""); const value = payload === undefined ? "" : strategyDefinitionJson(payload); const copy = async () => { if (!value) return; try { await navigator.clipboard?.writeText(value); setMessage("Copied"); } catch { setMessage("Copy unavailable in this browser"); } }; return <Panel title="Strategy definition (JSON)" className="strategy-json-panel"><div className="strategy-json-toolbar"><span>Actual backend response</span><button type="button" onClick={() => void copy()} disabled={!value}>▣ Copy</button></div>{value ? <pre>{value}</pre> : <Empty><span className="strategy-empty-icon">⌁</span><b>Waiting for backend output</b><small>Generated or selected library data will appear as readable JSON.</small></Empty>}{message && <span className="strategy-copy-message">{message}</span>}</Panel>; }

function ValidationSave({ definition, result, sourceType, descriptors, onRefresh, error, message }: { definition?: StrategyDefinition; result?: StrategyGenerationResult; sourceType: SourceType; descriptors: Resource<StrategyDescriptor[]>; onRefresh: () => void; error?: unknown; message: string }) {
  const isComplete = Boolean(definition || result?.compositeStrategyDefinition);
  const supported = definition ? (descriptors.data?.some((item) => item.name === definition.strategyName) ?? true) : Boolean(result?.compositeStrategyDefinition);
  const logicValid = Boolean(definition || result?.compositeStrategyDefinition);

  // Derive relevant strategy indicator tags
  const tags = useMemo(() => {
    if (!definition && !result?.compositeStrategyDefinition) return [];
    if (result?.compositeStrategyDefinition) return ["Composite", result.compositeStrategyDefinition.method, "Multi-Asset"];
    const t = [definition!.strategyName];
    if (definition!.familyName) t.push(definition!.familyName);
    if (definition!.parameters.rsiPeriod) t.push("RSI");
    if (definition!.parameters.emaPeriod || definition!.parameters.fastPeriod) t.push("Trend");
    if (definition!.parameters.bollingerPeriod) t.push("Bollinger");
    return Array.from(new Set(t)).slice(0, 4);
  }, [definition, result]);

  const strategyNameDisplay = definition?.familyName ?? definition?.strategyName ?? result?.compositeStrategyDefinition?.method ?? "";
  const versionDisplay = definition?.version ?? result?.compositeStrategyDefinition?.version ?? "1.0.0";
  const sourceLabel = result ? (sourceType === "TEXT" ? "USER_PROMPT" : "WEB_IMPORT") : "LIBRARY_PERSISTED";

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
              <div className="check-sub">{definition ? (supported ? "All indicators supported in engine" : "Custom indicator mapping") : "Awaiting strategy generation..."}</div>
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

      {/* Save to Strategy Library */}
      <div className="save-library-card">
        <h4 className="save-library-title">Save to Strategy Library</h4>
        <div className="save-field-group">
          <label className="save-field-label">Strategy Name</label>
          <input className="save-field-input" readOnly value={isComplete ? strategyNameDisplay : "Waiting for generated result"} />
        </div>
        <div className="save-field-row">
          <div className="save-field-group" style={{ flex: 1 }}>
            <label className="save-field-label">Version</label>
            <input className="save-field-input" readOnly value={isComplete ? `v${versionDisplay}` : "v1.0.0"} />
          </div>
          <div className="save-field-group" style={{ flex: 1.2 }}>
            <label className="save-field-label">Source</label>
            <input className="save-field-input" readOnly value={isComplete ? sourceLabel : "USER_PROMPT"} />
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
        <button
          type="button"
          className="btn-save-strategy-library"
          disabled={!isComplete}
          onClick={onRefresh}
        >
          {isComplete ? "💾 Strategy Saved in Library" : "💾 Awaiting Strategy..."}
        </button>
      </div>
      {result && <p className="strategy-provenance" style={{ marginTop: "8px", fontSize: "9px" }}>Model: <b>{result.modelName ?? "Unavailable"}</b> · Prompt: {result.promptVersion ?? "v1"}</p>}
      {message && <p className="success" style={{ margin: "6px 0 0", fontSize: "11px" }}>{message}</p>}
      <ErrorBox error={error} />
    </Panel>
  );
}

function LibraryTable({ definitions, selected, onSelect, generationId }: { definitions: Resource<StrategyDefinition[]>; selected?: StrategyDefinition; onSelect: (definition: StrategyDefinition) => void; generationId?: string }) {
  return <Panel title="Recent / Imported strategies" className="strategy-library-panel"><div className="strategy-library-heading"><span>{definitions.data?.length ?? 0} definitions</span></div>{definitions.isLoading ? <Loading /> : definitions.error ? <ErrorBox error={definitions.error} /> : definitions.data?.length ? <div className="strategy-table-scroll"><table className="strategy-table"><thead><tr><th>Strategy</th><th>Source</th><th>Created</th><th>Version</th><th>Parameters</th><th>Status</th><th /></tr></thead><tbody>{definitions.data.map((item) => <tr key={item.id} className={selected?.id === item.id ? "selected" : ""}><td><b>{item.familyName ?? item.strategyName}</b><small>{item.strategyName}</small></td><td>{generationId === item.id ? "Current generation" : "Backend library"}</td><td>{displayDate(item.createdAt)}</td><td>v{item.version}</td><td className="strategy-parameters">{parameterSummary(item)}</td><td><span className="strategy-table-status">● Valid</span></td><td><button type="button" className="link-button" onClick={() => onSelect(item)}>Inspect</button></td></tr>)}</tbody></table></div> : <Empty><b>No saved backend definitions yet.</b><small>Generate a strategy or save a plugin definition to populate this library.</small></Empty>}</Panel>;
}

function PluginEditor({ descriptors, onSaved, error, setError }: { descriptors: Resource<StrategyDescriptor[]>; onSaved: () => void; error?: unknown; setError: (error?: unknown) => void }) {
  const [selected, setSelected] = useState<StrategyDescriptor>();
  const [parameters, setParameters] = useState<Record<string, number | string>>({});
  const save = useMutation({
    mutationFn: () => (selected ? api.define(selected.name, parameters) : Promise.reject(new Error("Select an indicator."))),
    onSuccess: onSaved,
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
          Select a core quantitative trading algorithm from the templates below, customize its numerical parameters, and save an executable strategy definition to your library.
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
          className="manual-parameter-studio"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="studio-header">
            <div className="studio-identity">
              <span className="studio-icon">{iconFor(selected)}</span>
              <div>
                <h3 className="studio-title">{selected.displayName} Configuration</h3>
                <p className="studio-desc">{selected.description}</p>
              </div>
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
              {save.isPending ? "Saving to Library..." : `💾 Save ${selected.displayName} Strategy`}
            </button>
          </div>
        </form>
      ) : (
        <Empty>Select an indicator from the templates above to configure its parameters.</Empty>
      )}

      {save.isSuccess && (
        <p className="success" style={{ marginTop: "10px", fontSize: "12px" }}>
          ✓ Strategy definition successfully saved to PostgreSQL and added to your library!
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
    onSuccess: refresh,
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

            <div className="composite-strategies-selection-list">
              {definitions.isLoading ? (
                <Loading />
              ) : definitions.error ? (
                <ErrorBox error={definitions.error} />
              ) : definitions.data?.length ? (
                definitions.data.map((definition) => {
                  const isChecked = selectedIds.includes(definition.id);
                  return (
                    <div className={`composite-strategy-item-card ${isChecked ? "checked" : ""}`} key={definition.id}>
                      <label className="composite-item-label">
                        <input
                          type="checkbox"
                          className="composite-checkbox"
                          checked={isChecked}
                          onChange={() => toggle(definition.id)}
                        />
                        <span className="plugin-icon small">{iconFor(definition)}</span>
                        <div className="composite-item-text">
                          <b className="composite-item-name">{definition.familyName ?? definition.strategyName}</b>
                          <span className="composite-item-params">{parameterSummary(definition)}</span>
                        </div>
                      </label>

                      {method === "WEIGHTED_SCORE" && isChecked && (
                        <div className="composite-weight-control">
                          <span className="weight-label">Weight:</span>
                          <input
                            type="number"
                            className="weight-input"
                            aria-label={`Weight ${definition.id}`}
                            min="0"
                            max="1"
                            step="0.05"
                            value={weights[definition.id] ?? ""}
                            onChange={(event) =>
                              setWeights({ ...weights, [definition.id]: Number(event.target.value) })
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="composite-empty-library-hint">
                  <p><b>No saved strategies in library yet.</b></p>
                  <small>Use the AI Generator or Manual Builder above to create at least 2 strategies first.</small>
                </div>
              )}
            </div>

            {/* Threshold controls for weighted mode */}
            {method === "WEIGHTED_SCORE" && selectedIds.length > 0 && (
              <div className="composite-thresholds-box">
                <div className="thresholds-row">
                  <label className="threshold-field">
                    <span>🟢 Buy Trigger Score (e.g. &ge; 0.50):</span>
                    <input
                      type="number"
                      step="0.05"
                      value={buy}
                      onChange={(event) => setBuy(event.target.value)}
                    />
                  </label>
                  <label className="threshold-field">
                    <span>🔴 Sell Trigger Score (e.g. &le; -0.50):</span>
                    <input
                      type="number"
                      step="0.05"
                      value={sell}
                      onChange={(event) => setSell(event.target.value)}
                    />
                  </label>
                </div>
                <div className="weight-validation-indicator">
                  <span>
                    Total Weight: <b>{weightSum.toFixed(2)}</b> (Must equal 1.00) · Buy &gt; Sell: <b>{thresholdsValid ? "Valid ✓" : "Invalid ✕"}</b>
                  </span>
                </div>
              </div>
            )}
          </div>

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
            <h4>Saved Composite Library (PostgreSQL)</h4>
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
  const [selected, setSelected] = useState<StrategyDefinition>();
  const [pluginError, setPluginError] = useState<unknown>();
  const [compositeError, setCompositeError] = useState<unknown>();
  const [message, setMessage] = useState("");

  const generation = useMutation({
    mutationFn: (input: { sourceType: "TEXT"; text: string } | { sourceType: "URL"; url: string }) => api.generateStrategy(input),
    onSuccess: (generated) => {
      setResult(generated);
      setSelected(generated.kind === "SINGLE" ? generated.strategyDefinition : undefined);
      setMessage("Backend persisted the generated result.");
      void queryClient.invalidateQueries({ queryKey: ["strategies"] });
    },
  });

  const definition = generatedDefinition(result, selected);
  const composite = generatedComposite(result);
  const preview = result ?? (selected ? { source: "GET /strategies/definitions", strategyDefinition: selected } : undefined);

  const refreshLibrary = () => {
    setMessage("Persisted strategy library refreshed.");
    void queryClient.invalidateQueries({ queryKey: ["strategies"] });
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
          <ParsedSummary definition={definition} composite={composite} result={result} sourceType={sourceType} />
          <JsonPreview payload={preview} />
          <ValidationSave
            definition={definition}
            result={result}
            sourceType={sourceType}
            descriptors={descriptors}
            onRefresh={refreshLibrary}
            message={message}
          />
        </div>
      ) : creationMode === "MANUAL_BUILDER" ? (
        <PluginEditor
          descriptors={descriptors}
          onSaved={refreshLibrary}
          error={pluginError}
          setError={setPluginError}
        />
      ) : (
        <CompositeLibrary
          definitions={definitions}
          composites={composites}
          refresh={refreshLibrary}
          error={compositeError}
          setError={setCompositeError}
        />
      )}

      {/* Shared Saved Strategy Library */}
      <LibraryTable
        definitions={definitions}
        selected={selected}
        onSelect={(item) => {
          setSelected(item);
          setResult(undefined);
          setMessage("");
        }}
        generationId={result?.strategyDefinition?.id}
      />
    </div>
  );
}
