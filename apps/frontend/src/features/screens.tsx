import { useEffect, useMemo, useState } from "react";
import type {
  CompositeStrategyDefinitionDto,
  CreateStrategyAuthoringDraftRequestDto,
  DefineCompositeRequestDto,
  DefineStrategyRequestDto,
  ExperimentDto,
  LeaderboardTopKResponseDto,
  NewsItemDto,
  NewsPageResponseDto,
  SearchGeneratorTypeDto,
  SearchRunRankingEntryDto,
  SearchRunStatusDto,
  StartSearchRequestDto,
  StrategyDefinitionDto,
  StrategyParameterDescriptorDto,
  StrategyPluginDescriptorDto,
  StrategySelectionDto,
} from "@cryptox/contracts/rest";
import { FeatureWorkspaceStore, useFeatureWorkspace } from "./state";
import type { FeatureAuthoringState, FeatureWorkspaceState } from "./types";

const NOT_SUPPLIED = "not supplied/not yet composed";
const SEARCH_GENERATOR_TYPES: readonly SearchGeneratorTypeDto[] = [
  "RANDOM",
  "DOMAIN_GUIDED",
  "GENETIC",
];

export interface FeatureWorkspaceProps {
  readonly section: "strategies" | "experiments";
  readonly email: string;
  readonly store: FeatureWorkspaceStore;
}

function descriptorDefaults(
  descriptor: StrategyPluginDescriptorDto | undefined,
): Record<string, string | number> {
  return Object.fromEntries(
    (descriptor?.parameters ?? []).map((parameter) => [parameter.key, parameter.defaultValue]),
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return NOT_SUPPLIED;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  const serialized = JSON.stringify(value);
  return serialized ?? NOT_SUPPLIED;
}

function formatOptionalValue(value: unknown): string {
  return value === undefined ? NOT_SUPPLIED : formatValue(value);
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatRecord(value: Readonly<Record<string, unknown>> | undefined): string {
  if (!value || Object.keys(value).length === 0) return NOT_SUPPLIED;
  return formatValue(value);
}

function formatOrigin(origin: StrategyDefinitionDto["authoringOrigin"]): string {
  if (!origin) return NOT_SUPPLIED;
  if (origin.kind === "MANUAL") return "MANUAL";
  if (origin.kind === "LLM_DRAFT") {
    return `LLM_DRAFT · draft ${origin.draftId} · provider ${origin.providerId} · model ${origin.modelId}`;
  }
  return `APPROVED_NEWS_ITEM · news item ${origin.newsItemId} · extraction template version ${formatOptionalValue(origin.extractionTemplateVersion)}`;
}

function selectionReference(selection: StrategySelectionDto): string {
  return selection.kind === "STRATEGY"
    ? `STRATEGY · ${selection.strategyDefinitionId}`
    : `COMPOSITE · ${selection.compositeDefinitionId}`;
}

function stopConditionText(stopCondition: SearchRunStatusDto["stopCondition"]): string {
  const fields = Object.entries(stopCondition).filter(([, value]) => value !== undefined);
  return fields.length
    ? fields.map(([key, value]) => `${formatLabel(key)}: ${formatValue(value)}`).join(" · ")
    : NOT_SUPPLIED;
}

function generatorStatus(generatorType: SearchGeneratorTypeDto): string {
  return generatorType === "RANDOM"
    ? "Current request boundary"
    : "Seeded start not yet composed";
}

export function FeatureWorkspace({ section, email, store }: FeatureWorkspaceProps): React.ReactElement {
  const state = useFeatureWorkspace(store);
  const [selection, setSelection] = useState<StrategySelectionDto>();

  useEffect(() => {
    void store.load();
  }, [store]);

  useEffect(() => {
    if (
      selection?.kind === "STRATEGY" &&
      !state.strategyDefinitions.some((item) => item.id === selection.strategyDefinitionId)
    ) {
      setSelection(undefined);
    }
    if (
      selection?.kind === "COMPOSITE" &&
      !state.compositeDefinitions.some((item) => item.id === selection.compositeDefinitionId)
    ) {
      setSelection(undefined);
    }
  }, [selection, state.compositeDefinitions, state.strategyDefinitions]);

  if (state.status === "loading" || state.status === "idle") {
    return <section className="feature-loading" role="status">Loading your private strategy workspace…</section>;
  }
  if (state.status === "error") {
    return <section className="feature-error" role="alert"><strong>Private workspace unavailable</strong><span>{state.message}</span></section>;
  }

  const activeSelection = selection ?? (state.strategyDefinitions[0]
    ? { kind: "STRATEGY" as const, strategyDefinitionId: state.strategyDefinitions[0].id }
    : undefined);
  return (
    <section className="feature-workspace" aria-labelledby="workspace-title">
      <header className="feature-hero">
        <div>
          <span className="kicker">Authenticated strategy lab</span>
          <h1 id="workspace-title">Build, search, and explain.</h1>
          <p>Private research for <strong>{email}</strong>. Server-owned calculations stay behind typed request/response boundaries.</p>
        </div>
        <div className="feature-hero__summary">
          <span>Workspace mode</span>
          <strong>{section === "strategies" ? "Configure" : "Review results"}</strong>
          <small>Fixture evidence · real API integration is a later gate</small>
        </div>
      </header>

      <div className="feature-grid">
        <StrategyBuilder
          authoring={state.authoring}
          descriptors={state.descriptors}
          definitions={state.strategyDefinitions}
          composites={state.compositeDefinitions}
          news={state.news}
          pending={state.pendingAction}
          onCreateStrategy={(request) => void store.createStrategy(request)}
          onCreateComposite={(request) => void store.createComposite(request)}
          onSaveAuthoring={(request) => void store.createStrategyAuthoringDraft(request)}
          onValidateAuthoring={(draftId) => void store.validateStrategyAuthoringDraft(draftId)}
          onApproveAuthoring={(draftId) => void store.approveStrategyAuthoringDraft(draftId)}
          onSelect={setSelection}
          activeSelection={activeSelection}
        />
        <SearchPanel
          state={state}
          pending={state.pendingAction}
          onStart={(request) => void store.startSearch(request)}
          onRefresh={(id) => void store.refreshSearch(id)}
          onCancel={(id) => void store.cancelSearch(id)}
        />
        <LeaderboardPanel leaderboard={state.leaderboard} />
        <ExperimentPanel state={state} onSelect={(id) => void store.selectExperiment(id)} />
        <NewsPanel state={state} />
      </div>
    </section>
  );
}

interface StrategyBuilderProps {
  readonly authoring: FeatureAuthoringState;
  readonly descriptors: readonly StrategyPluginDescriptorDto[];
  readonly definitions: readonly StrategyDefinitionDto[];
  readonly composites: readonly CompositeStrategyDefinitionDto[];
  readonly news?: NewsPageResponseDto;
  readonly pending?: string;
  readonly activeSelection?: StrategySelectionDto;
  readonly onCreateStrategy: (request: Omit<DefineStrategyRequestDto, "schemaVersion">) => void;
  readonly onCreateComposite: (request: Omit<DefineCompositeRequestDto, "schemaVersion">) => void;
  readonly onSaveAuthoring: (request: Omit<CreateStrategyAuthoringDraftRequestDto, "schemaVersion">) => void;
  readonly onValidateAuthoring: (draftId: string) => void;
  readonly onApproveAuthoring: (draftId: string) => void;
  readonly onSelect: (selection: StrategySelectionDto) => void;
}

function StrategyBuilder({
  authoring,
  descriptors,
  definitions,
  composites,
  news,
  pending,
  activeSelection,
  onCreateStrategy,
  onCreateComposite,
  onSaveAuthoring,
  onValidateAuthoring,
  onApproveAuthoring,
  onSelect,
}: StrategyBuilderProps): React.ReactElement {
  const [descriptorName, setDescriptorName] = useState(descriptors[0]?.name ?? "");
  const descriptor = descriptors.find((item) => item.name === descriptorName) ?? descriptors[0];
  const [parameters, setParameters] = useState<Record<string, string | number>>(() => descriptorDefaults(descriptor));
  const [selectedComponentIds, setSelectedComponentIds] = useState<readonly string[]>(() => definitions.slice(0, 2).map((item) => item.id));

  useEffect(() => setParameters(descriptorDefaults(descriptor)), [descriptor?.name]);
  useEffect(() => {
    setSelectedComponentIds((current) => current.filter((id) => definitions.some((definition) => definition.id === id)).length >= 2
      ? current.filter((id) => definitions.some((definition) => definition.id === id))
      : definitions.slice(0, 2).map((item) => item.id));
  }, [definitions]);

  function submitStrategy(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!descriptor) return;
    onCreateStrategy({ logicalFamilyKey: `workspace-${descriptor.name.toLowerCase()}`, strategyName: descriptor.name, parameters: { ...parameters } });
  }

  function submitComposite(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selectedComponentIds.length < 2) return;
    onCreateComposite({ logicalFamilyKey: "workspace-composite", combinationProfileId: "MAJORITY_VOTE_V1", strategyDefinitionIds: selectedComponentIds });
  }

  return (
    <article className="feature-card strategy-builder" aria-labelledby="strategy-builder-title">
      <div className="feature-card__heading"><div><span className="feature-eyebrow">Strategy registry</span><h2 id="strategy-builder-title">Descriptor controls</h2></div><span className="feature-badge">{descriptors.length} available</span></div>
      <p className="feature-card__intro">Controls and visualization metadata are supplied by the public descriptor catalog.</p>
      {descriptor ? (
        <>
          <form className="feature-form" onSubmit={submitStrategy}>
            <label>Strategy type<select value={descriptor.name} onChange={(event) => setDescriptorName(event.target.value)}>{descriptors.map((item) => <option key={item.name} value={item.name}>{item.displayName}</option>)}</select></label>
            <p className="descriptor-description">{descriptor.description} · {descriptor.category}</p>
            <div className="parameter-grid">
              {descriptor.parameters.map((parameter) => <DescriptorParameter key={parameter.key} descriptor={parameter} value={parameters[parameter.key] ?? parameter.defaultValue} onChange={(value) => setParameters((current) => ({ ...current, [parameter.key]: value }))} />)}
            </div>
            <div className="feature-form__actions"><button className="feature-button" type="submit" disabled={Boolean(pending)}>Save version</button><span className="muted-copy">v{descriptor.implementationVersion} · {descriptor.behaviorProfileId}</span></div>
          </form>
          <DescriptorMetadata descriptor={descriptor} />
        </>
      ) : <p className="empty-state">No strategy descriptors are available.</p>}

      <AuthoringPanel
        authoring={authoring}
        news={news}
        pending={pending}
        onSave={onSaveAuthoring}
        onValidate={onValidateAuthoring}
        onApprove={onApproveAuthoring}
      />

      <div className="subsection"><div className="subsection__heading"><h3>My definitions</h3><span>{definitions.length}</span></div>
        <div className="definition-list">{definitions.map((definition) => <StrategyDefinitionRow key={definition.id} definition={definition} activeSelection={activeSelection} onSelect={onSelect} />)}</div>
      </div>

      <div className="subsection"><div className="subsection__heading"><h3>Composite definitions</h3><span>{composites.length}</span></div>
        <form className="feature-form" onSubmit={submitComposite}><div className="checkbox-grid">{definitions.map((definition) => <label className="checkbox-label" key={definition.id}><input type="checkbox" checked={selectedComponentIds.includes(definition.id)} onChange={(event) => setSelectedComponentIds((current) => event.target.checked ? [...current, definition.id] : current.filter((id) => id !== definition.id))} />{definition.strategyName} · v{definition.version}</label>)}</div><button className="feature-button feature-button--quiet" type="submit" disabled={selectedComponentIds.length < 2 || Boolean(pending)}>Save composite</button></form>
        <div className="definition-list">{composites.map((definition) => <CompositeDefinitionRow key={definition.id} definition={definition} definitions={definitions} activeSelection={activeSelection} onSelect={onSelect} />)}</div>
      </div>
    </article>
  );
}

function DescriptorMetadata({ descriptor }: { readonly descriptor: StrategyPluginDescriptorDto }): React.ReactElement {
  return <section className="subsection" aria-labelledby="descriptor-metadata-title"><div className="subsection__heading"><h3 id="descriptor-metadata-title">Descriptor metadata</h3><span>{descriptor.name}</span></div><dl className="provenance-list"><dt>Behavior profile</dt><dd>{descriptor.behaviorProfileId}</dd><dt>Implementation version</dt><dd>{descriptor.implementationVersion}</dd><dt>Category</dt><dd>{descriptor.category}</dd></dl><div className="definition-list">{descriptor.parameters.length ? descriptor.parameters.map((parameter) => <div className="definition-row" key={parameter.key}><div><strong>{parameter.key}</strong><small>{parameter.label} · {parameter.type} · {parameter.required ? "required" : "optional"}</small></div><span>default {formatValue(parameter.defaultValue)}{parameter.minimum === undefined ? "" : ` · min ${formatNumber(parameter.minimum)}`}{parameter.maximum === undefined ? "" : ` · max ${formatNumber(parameter.maximum)}`}{parameter.options?.length ? ` · options ${parameter.options.join(" · ")}` : ""}</span></div>) : <div className="definition-row"><div><strong>Parameters</strong></div><span>{NOT_SUPPLIED}</span></div>}{descriptor.visualization.length ? descriptor.visualization.map((visualization) => <div className="definition-row" key={visualization.id}><div><strong>{visualization.label}</strong><small>{visualization.id} · {visualization.kind} · {visualization.pane}</small></div><span>{visualization.series.map((series) => `${series.key}: ${series.label}`).join(" · ") || NOT_SUPPLIED}</span></div>) : <div className="definition-row"><div><strong>Visualization</strong></div><span>{NOT_SUPPLIED}</span></div>}</div></section>;
}

function AuthoringPanel({
  authoring,
  news,
  pending,
  onSave,
  onValidate,
  onApprove,
}: {
  readonly authoring: FeatureAuthoringState;
  readonly news?: NewsPageResponseDto;
  readonly pending?: string;
  readonly onSave: (request: Omit<CreateStrategyAuthoringDraftRequestDto, "schemaVersion">) => void;
  readonly onValidate: (draftId: string) => void;
  readonly onApprove: (draftId: string) => void;
}): React.ReactElement {
  const approvedNewsItems = useMemo(
    () => (news?.items ?? []).filter((item) => item.extraction?.template?.status === "APPROVED"),
    [news?.items],
  );
  const [sourceKind, setSourceKind] = useState<"PROMPT" | "APPROVED_NEWS_ITEM">("PROMPT");
  const [prompt, setPrompt] = useState("");
  const [newsItemId, setNewsItemId] = useState(approvedNewsItems[0]?.id ?? "");

  useEffect(() => {
    if (!approvedNewsItems.some((item) => item.id === newsItemId)) {
      setNewsItemId(approvedNewsItems[0]?.id ?? "");
    }
  }, [newsItemId, approvedNewsItems]);

  const busy = Boolean(pending);
  const saveEnabled = authoring.actions.save && !busy;
  const validateEnabled = authoring.actions.validate && Boolean(authoring.draft?.id) && !busy;
  const approveEnabled = authoring.actions.approve && Boolean(authoring.draft?.id) && !busy;

  function submitSave(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave(sourceKind === "PROMPT"
      ? { source: { kind: "PROMPT" }, prompt }
      : { source: { kind: "APPROVED_NEWS_ITEM", newsItemId } });
  }

  return (
    <section className="subsection" aria-labelledby="authoring-title">
      <div className="subsection__heading"><h3 id="authoring-title">LLM authoring</h3><span>{authoring.status}</span></div>
      <p className="warning-copy" role={authoring.status === "FAILURE" || authoring.status === "UNAVAILABLE" ? "alert" : undefined}>{authoring.message}</p>
      <form className="feature-form" onSubmit={submitSave}>
        <label>Authoring source
          <select
            aria-label="Authoring source"
            value={sourceKind}
            disabled={!saveEnabled}
            onChange={(event) => setSourceKind(event.target.value as "PROMPT" | "APPROVED_NEWS_ITEM")}
          >
            <option value="PROMPT">Prompt</option>
            <option value="APPROVED_NEWS_ITEM">Approved News item</option>
          </select>
        </label>
        {sourceKind === "PROMPT" ? (
          <label>Prompt
            <textarea
              aria-label="Strategy authoring prompt"
              rows={4}
              value={prompt}
              required
              disabled={!saveEnabled}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
        ) : (
          <label>Approved News item
            <select
              aria-label="Approved News item"
              value={newsItemId}
              required
              disabled={!saveEnabled || approvedNewsItems.length === 0}
              onChange={(event) => setNewsItemId(event.target.value)}
            >
              {approvedNewsItems.length ? approvedNewsItems.map((item) => (
                <option key={item.id} value={item.id}>{item.title} · {item.id}</option>
              )) : <option value="">No approved News items loaded</option>}
            </select>
          </label>
        )}
        <div className="feature-form__actions">
          <button className="feature-button" type="submit" disabled={!saveEnabled}>Save draft</button>
          <button
            className="feature-button feature-button--quiet"
            type="button"
            disabled={!validateEnabled}
            onClick={() => authoring.draft && onValidate(authoring.draft.id)}
          >Validate draft</button>
          <button
            className="feature-button feature-button--quiet"
            type="button"
            disabled={!approveEnabled}
            onClick={() => authoring.draft && onApprove(authoring.draft.id)}
          >Approve draft</button>
        </div>
      </form>
      <dl className="provenance-list">
        <dt>State</dt><dd>{authoring.status}</dd>
        <dt>Save</dt><dd>{authoring.actions.save ? "AVAILABLE" : "DISABLED"}</dd>
        <dt>Validate</dt><dd>{authoring.actions.validate ? "AVAILABLE" : "DISABLED"}</dd>
        <dt>Approve</dt><dd>{authoring.actions.approve ? "AVAILABLE" : "DISABLED"}</dd>
        {authoring.reason ? <><dt>Unavailable reason</dt><dd>{authoring.reason}</dd></> : null}
        {authoring.failedAction ? <><dt>Failed action</dt><dd>{authoring.failedAction}</dd></> : null}
      </dl>
      {authoring.draft ? <AuthoringDraftMetadata draft={authoring.draft} /> : null}
      {authoring.definition ? <section className="subsection" aria-label="Approved strategy definition">
        <div className="subsection__heading"><h4>Approved definition</h4><span>{authoring.definition.version}</span></div>
        <dl className="provenance-list"><dt>Definition</dt><dd>{authoring.definition.id} · {authoring.definition.strategyName}</dd><dt>Authoring origin</dt><dd>{formatOrigin(authoring.definition.authoringOrigin)}</dd><dt>Parameters</dt><dd><code>{formatRecord(authoring.definition.parameters)}</code></dd></dl>
      </section> : null}
    </section>
  );
}

function AuthoringDraftMetadata({ draft }: { readonly draft: NonNullable<FeatureAuthoringState["draft"]> }): React.ReactElement {
  const validation = draft.validation;
  const source = draft.source.kind === "PROMPT"
    ? "PROMPT"
    : `APPROVED_NEWS_ITEM · ${draft.source.newsItemId}`;
  return <section className="subsection" aria-label="Authoring draft details"><div className="subsection__heading"><h4>Server draft</h4><span>{draft.status}</span></div><dl className="provenance-list"><dt>Draft id</dt><dd>{draft.id}</dd><dt>Source</dt><dd>{source}</dd><dt>Profile</dt><dd>{draft.profileId}</dd><dt>Provider</dt><dd>{draft.provider.id}</dd><dt>Model</dt><dd>{draft.provider.modelId}</dd><dt>Configured</dt><dd>{draft.provider.configured ? "true" : "false"}</dd><dt>Structured draft</dt><dd><code>{formatRecord(draft.structuredDraft)}</code></dd><dt>Validation</dt><dd>{validation ? `${validation.valid ? "VALID" : "INVALID"} · ${validation.reasons.join(" · ") || "no reasons"} · ${validation.validatedAt}` : NOT_SUPPLIED}</dd><dt>Approved definition id</dt><dd>{formatOptionalValue(draft.approvedDefinitionId)}</dd></dl></section>;
}

function StrategyDefinitionRow({
  definition,
  activeSelection,
  onSelect,
}: {
  readonly definition: StrategyDefinitionDto;
  readonly activeSelection?: StrategySelectionDto;
  readonly onSelect: (selection: StrategySelectionDto) => void;
}): React.ReactElement {
  const selected = activeSelection?.kind === "STRATEGY" && activeSelection.strategyDefinitionId === definition.id;
  return <div className="definition-row"><div><strong>{definition.strategyName}</strong><small>{definition.logicalFamilyKey} · version {definition.version}</small><dl className="provenance-list"><dt>Behavior profile</dt><dd>{definition.behaviorProfileId}</dd><dt>Implementation</dt><dd>{definition.implementationVersion}</dd><dt>Parameters</dt><dd><code>{formatRecord(definition.parameters)}</code></dd><dt>Authoring origin</dt><dd>{formatOrigin(definition.authoringOrigin)}</dd></dl></div><button className={selected ? "text-button text-button--active" : "text-button"} type="button" onClick={() => onSelect({ kind: "STRATEGY", strategyDefinitionId: definition.id })}>{selected ? "Selected" : "Use"}</button></div>;
}

function CompositeDefinitionRow({
  definition,
  definitions,
  activeSelection,
  onSelect,
}: {
  readonly definition: CompositeStrategyDefinitionDto;
  readonly definitions: readonly StrategyDefinitionDto[];
  readonly activeSelection?: StrategySelectionDto;
  readonly onSelect: (selection: StrategySelectionDto) => void;
}): React.ReactElement {
  const selected = activeSelection?.kind === "COMPOSITE" && activeSelection.compositeDefinitionId === definition.id;
  return <div className="definition-row"><div><strong>{definition.logicalFamilyKey}</strong><small>version {definition.version} · {definition.method} · {definition.combinationProfileId}</small><CompositeMetadata definition={definition} definitions={definitions} /></div><button className={selected ? "text-button text-button--active" : "text-button"} type="button" onClick={() => onSelect({ kind: "COMPOSITE", compositeDefinitionId: definition.id })}>{selected ? "Selected" : "Use"}</button></div>;
}

function CompositeMetadata({
  definition,
  definitions,
}: {
  readonly definition: CompositeStrategyDefinitionDto;
  readonly definitions: readonly StrategyDefinitionDto[];
}): React.ReactElement {
  return <><dl className="provenance-list"><dt>Method</dt><dd>{definition.method}</dd><dt>Combination profile</dt><dd>{definition.combinationProfileId}</dd><dt>Weighted profile</dt><dd>{definition.weightedVote?.profileId ?? NOT_SUPPLIED}</dd><dt>Buy threshold</dt><dd>{formatOptionalValue(definition.weightedVote?.buyThreshold)}</dd><dt>Sell threshold</dt><dd>{formatOptionalValue(definition.weightedVote?.sellThreshold)}</dd><dt>Normalization</dt><dd>{definition.weightedVote?.normalization ?? NOT_SUPPLIED}</dd></dl><div className="definition-list">{definition.components.map((component) => { const componentDefinition = definitions.find((item) => item.id === component.strategyDefinitionId); return <div className="definition-row" key={`${component.strategyDefinitionId}-${component.strategyDefinitionVersion}`}><div><strong>{componentDefinition?.strategyName ?? component.strategyDefinitionId}</strong><small>{component.strategyDefinitionId} · version {component.strategyDefinitionVersion}</small></div><span>{component.enabled === undefined ? NOT_SUPPLIED : component.enabled ? "enabled" : "disabled"} · weight {formatOptionalValue(component.weight)}</span></div>; })}</div></>;
}

function DescriptorParameter({ descriptor, value, onChange }: { readonly descriptor: StrategyParameterDescriptorDto; readonly value: string | number; readonly onChange: (value: string | number) => void }): React.ReactElement {
  if (descriptor.type === "ENUM") {
    return <label>{descriptor.label}<select value={String(value)} onChange={(event) => onChange(event.target.value)}>{(descriptor.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  }
  return <label>{descriptor.label}<input type="number" value={String(value)} min={descriptor.minimum} max={descriptor.maximum} step={descriptor.step ?? (descriptor.type === "INTEGER" ? 1 : "any")} required={descriptor.required} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} /></label>;
}

interface SearchPanelProps {
  readonly state: FeatureWorkspaceState;
  readonly pending?: string;
  readonly onStart: (request: Omit<StartSearchRequestDto, "schemaVersion">) => void;
  readonly onRefresh: (searchRunId: string) => void;
  readonly onCancel: (searchRunId: string) => void;
}

function SearchPanel({ state, pending, onStart, onRefresh, onCancel }: SearchPanelProps): React.ReactElement {
  const [maxCandidates, setMaxCandidates] = useState(4);
  const [generatorType, setGeneratorType] = useState<SearchGeneratorTypeDto>("RANDOM");
  const [randomSeed, setRandomSeed] = useState(() => state.searchRuns[0]?.randomSeed ?? "");
  const candidateTemplate = state.searchRuns[0]?.candidateTemplate;
  const canStartRandom = state.strategyDefinitions.length >= 2 && Boolean(state.leaderboard) && Boolean(candidateTemplate) && Boolean(randomSeed.trim());
  const canStart = canStartRandom && generatorType === "RANDOM";

  useEffect(() => {
    if (!randomSeed && state.searchRuns[0]?.randomSeed) setRandomSeed(state.searchRuns[0].randomSeed);
  }, [randomSeed, state.searchRuns]);

  function start(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canStart || !state.leaderboard || !candidateTemplate) return;
    onStart({ searchSpace: { availableStrategyDefinitionIds: state.strategyDefinitions.map((item) => item.id), componentCount: { minimum: 2, maximum: Math.min(2, state.strategyDefinitions.length) }, requireDistinctComponents: true }, stopCondition: { maxCandidates }, generatorType, randomSeed: randomSeed.trim(), leaderboardScopeId: state.leaderboard.scope.id, candidateTemplate, maxInFlight: 1 });
  }

  return <article className="feature-card" aria-labelledby="search-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Search orchestration</span><h2 id="search-title">{generatorType === "RANDOM" ? "Bounded Random Search" : `Bounded ${generatorType} Search`}</h2></div><span className="feature-badge">REST progress</span></div><p className="feature-card__intro">Finite stop conditions, supplied profile provenance, and request/response progress remain explicit.</p><div className="definition-list">{SEARCH_GENERATOR_TYPES.map((item) => <div className="definition-row" key={item}><div><strong>{item}</strong><small>{item === "RANDOM" ? "Existing start request" : "Requires composed seeded transport"}</small></div><span>{generatorStatus(item)}</span></div>)}</div><form className="feature-form feature-form--inline" onSubmit={start}><label>Generator profile<select value={generatorType} onChange={(event) => setGeneratorType(event.target.value as SearchGeneratorTypeDto)}>{SEARCH_GENERATOR_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Seed<input type="text" value={randomSeed} onChange={(event) => setRandomSeed(event.target.value)} /></label><label>Max candidates<input type="number" min={1} max={20} value={maxCandidates} onChange={(event) => setMaxCandidates(Number(event.target.value))} /></label><button className="feature-button" type="submit" disabled={!canStart || Boolean(pending)}>{pending?.includes("Search") ? pending : generatorType === "RANDOM" ? "Start Search Run" : "Seeded start not yet composed"}</button></form>{generatorType !== "RANDOM" ? <p className="warning-copy">{generatorType} is presented from the frozen generator set, but the current client has no composed seeded-start provenance controls. This action stays unavailable.</p> : null}{!canStartRandom ? <p className="warning-copy">{state.strategyDefinitions.length < 2 || !state.leaderboard ? "At least two private definitions and a leaderboard scope are required." : !candidateTemplate ? `Search candidate template: ${NOT_SUPPLIED}.` : `Search seed: ${NOT_SUPPLIED}.`}</p> : null}<div className="run-list">{state.searchRuns.map((run) => <SearchRunRow key={run.searchRunId} run={run} ranking={state.searchRankings[run.searchRunId] ?? []} onRefresh={onRefresh} onCancel={onCancel} />)}</div></article>;
}

function SeededDiscoveryMetadata({ run }: { readonly run: SearchRunStatusDto }): React.ReactElement {
  const provenance = run.seededDiscovery;
  if (!provenance) return <p className="muted-copy">Seeded discovery provenance: {NOT_SUPPLIED}.</p>;
  return <section className="subsection" aria-labelledby={`seeded-${run.searchRunId}`}><div className="subsection__heading"><h4 id={`seeded-${run.searchRunId}`}>Seeded discovery provenance</h4><span>{provenance.profileId}</span></div><dl className="provenance-list"><dt>Profile</dt><dd>{provenance.profileId}</dd><dt>Seed</dt><dd>{provenance.seed}</dd><dt>Algorithm configuration</dt><dd><code>{formatRecord(provenance.algorithmConfiguration)}</code></dd><dt>Dataset identity</dt><dd><code>{formatRecord(provenance.datasetIdentity)}</code></dd><dt>Code provenance</dt><dd><code>{formatRecord(provenance.code)}</code></dd><dt>Default candidate budget</dt><dd>{provenance.defaultBudget.maxCandidates} candidates · {provenance.defaultBudget.maxDurationSeconds} seconds</dd></dl></section>;
}

function SearchRunRow({
  run,
  ranking,
  onRefresh,
  onCancel,
}: {
  readonly run: SearchRunStatusDto;
  readonly ranking: readonly SearchRunRankingEntryDto[];
  readonly onRefresh: (id: string) => void;
  readonly onCancel: (id: string) => void;
}): React.ReactElement {
  const bound = "maxCandidates" in run.stopCondition ? run.stopCondition.maxCandidates : undefined;
  const percentage = bound === undefined ? undefined : Math.min(100, Math.round((run.submittedCandidateCount / bound) * 100));
  const terminal = run.state === "COMPLETED" || run.state === "CANCELLED" || run.state === "FAILED";
  return <div className="run-row"><div className="run-row__top"><div><strong>{run.generatorType} · {run.randomSeed}</strong><small>{run.state} · {run.stopReason ? formatLabel(run.stopReason) : NOT_SUPPLIED}</small></div><span className={`state-pill state-pill--${run.state.toLowerCase()}`}>{run.state}</span></div><div className="progress-track" aria-label={`Search progress ${run.submittedCandidateCount} of ${bound ?? "bounded"}`}><span style={{ width: `${percentage ?? 0}%` }} /></div><dl className="provenance-list"><dt>Generator type</dt><dd>{run.generatorType}</dd><dt>Seeded discovery profile</dt><dd>{run.seededDiscovery?.profileId ?? NOT_SUPPLIED}</dd><dt>Search space</dt><dd>{run.searchSpace.availableStrategyDefinitionIds.length} definitions · components {run.searchSpace.componentCount.minimum}–{run.searchSpace.componentCount.maximum} · distinct {run.searchSpace.requireDistinctComponents ? "required" : NOT_SUPPLIED}</dd><dt>Finite stop condition</dt><dd>{stopConditionText(run.stopCondition)}</dd><dt>Lifecycle</dt><dd>{run.state}</dd><dt>Counts</dt><dd>{run.submittedCandidateCount} submitted · {run.completedCandidateCount} completed · {run.failedCandidateCount} failed</dd><dt>Timing</dt><dd>{run.averageBacktestDurationMs === null ? NOT_SUPPLIED : `${formatNumber(run.averageBacktestDurationMs)} ms average backtest`}</dd><dt>Leaderboard entry</dt><dd>{formatOptionalValue(run.currentTopLeaderboardEntryId)}</dd><dt>Created</dt><dd>{run.createdAt}</dd><dt>Started</dt><dd>{formatOptionalValue(run.startedAt)}</dd><dt>Ended</dt><dd>{formatOptionalValue(run.endedAt)}</dd></dl><SeededDiscoveryMetadata run={run} />{run.lastError ? <p className="warning-copy">Error: {run.lastError}</p> : null}{ranking.length ? <div className="ranking-list"><div className="subsection__heading"><h4>Search ranking</h4><span>{ranking.length} supplied</span></div>{ranking.map((entry) => <div className="ranking-row" key={`${entry.rank}-${entry.experimentId}`}><span className="rank-number">#{entry.rank}</span><div><strong>{entry.experimentId}</strong><small>{entry.candidateId} · {entry.rankingConfigurationId}</small></div><strong className="score-value">{formatNumber(entry.score)}</strong></div>)}</div> : <p className="muted-copy">Search ranking: {NOT_SUPPLIED}.</p>}<div className="run-row__stats"><span>{run.submittedCandidateCount} submitted</span><span>{run.completedCandidateCount} completed</span><span>{run.failedCandidateCount} failed</span><span>{run.averageBacktestDurationMs === null ? "timing not supplied" : `${formatNumber(run.averageBacktestDurationMs)}ms avg`}</span></div><div className="run-row__actions"><button className="text-button" type="button" onClick={() => onRefresh(run.searchRunId)}>Refresh</button>{!terminal ? <button className="text-button text-button--danger" type="button" onClick={() => onCancel(run.searchRunId)}>Stop</button> : null}</div></div>;
}

function LeaderboardPanel({ leaderboard }: { readonly leaderboard?: LeaderboardTopKResponseDto }): React.ReactElement {
  return <article className="feature-card" aria-labelledby="leaderboard-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Ranking scope</span><h2 id="leaderboard-title">My leaderboard</h2></div><span className="feature-badge">Top {leaderboard?.scope.k ?? "—"}</span></div>{leaderboard ? <><p className="feature-card__intro">{leaderboard.rankingConfiguration.name} · {leaderboard.rankingConfiguration.id}</p><div className="ranking-list">{leaderboard.entries.map((entry) => <div className="ranking-row" key={entry.id}><span className="rank-number">#{entry.rank}</span><div><strong>{entry.experimentId}</strong><small>{entry.candidateId} · scope {entry.leaderboardScopeId}</small></div><strong className="score-value">{formatNumber(entry.score)}</strong></div>)}</div><dl className="provenance-list"><dt>Scope</dt><dd>{leaderboard.scope.comparisonKey}</dd><dt>Ranking profile</dt><dd>{leaderboard.rankingConfiguration.profileId} · v{leaderboard.rankingConfiguration.version}</dd><dt>Minimum trades</dt><dd>{leaderboard.rankingConfiguration.minimumNumberOfTrades}</dd><dt>Formula</dt><dd><code>{formatRecord(leaderboard.rankingConfiguration.formula)}</code></dd></dl></> : <p className="empty-state">Leaderboard scope unavailable.</p>}</article>;
}

function ExperimentPanel({ state, onSelect }: { readonly state: FeatureWorkspaceState; readonly onSelect: (id: string) => void }): React.ReactElement {
  const experiment = state.selectedExperiment;
  return <article className="feature-card feature-card--wide" aria-labelledby="experiment-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Backtest result</span><h2 id="experiment-title">Experiments and trades</h2></div><span className="feature-badge">{state.experiments.length} results</span></div><div className="experiment-selector">{state.experiments.map((item) => <button className={experiment?.id === item.id ? "experiment-tab experiment-tab--active" : "experiment-tab"} type="button" key={item.id} onClick={() => onSelect(item.id)}>{item.id}<small>{item.strategy.kind}</small></button>)}</div>{experiment ? <ResultView experiment={experiment} trades={state.trades} descriptors={state.descriptors} /> : <p className="empty-state">Select a completed Experiment to inspect supplied metrics and provenance.</p>}</article>;
}

function ResultView({ experiment, trades, descriptors }: { readonly experiment: ExperimentDto; readonly trades: FeatureWorkspaceState["trades"]; readonly descriptors: readonly StrategyPluginDescriptorDto[] }): React.ReactElement {
  const descriptorMap = useMemo(() => new Map(descriptors.flatMap((descriptor) => descriptor.visualization.map((visualization) => [visualization.id, visualization] as const))), [descriptors]);
  return <div className="result-view"><p className="warning-copy">Paper simulation only — no live orders are created or submitted.</p><div className="metric-grid">{[["Return", `${formatNumber(experiment.metrics.totalReturnPercent)}%`], ["Win rate", `${formatNumber(experiment.metrics.winRatePercent)}%`], ["Max drawdown", `${formatNumber(experiment.metrics.maxDrawdownMagnitudePercent)}%`], ["Trades", String(experiment.metrics.numberOfTrades)]].map(([label, value]) => <div className="metric-tile" key={label}><span>{label}</span><strong>{value}</strong><small>{experiment.metrics.evaluationProfileId} · supplied</small></div>)}</div><div className="result-columns"><VisualizationPanel experiment={experiment} descriptorMap={descriptorMap} /><ProvenancePanel experiment={experiment} /></div><TradePanel trades={trades} /></div>;
}

function VisualizationPanel({ experiment, descriptorMap }: { readonly experiment: ExperimentDto; readonly descriptorMap: ReadonlyMap<string, StrategyPluginDescriptorDto["visualization"][number]> }): React.ReactElement {
  return <section className="result-section" aria-labelledby="visualization-title"><div className="subsection__heading"><h3 id="visualization-title">Signals and overlays</h3><span>{experiment.visualization.overlays.length} supplied points</span></div>{experiment.visualization.overlays.length ? <div className="overlay-list">{experiment.visualization.overlays.map((overlay, index) => { const descriptor = descriptorMap.get(overlay.point.descriptorId); return <div className="overlay-row" key={`${overlay.point.timestamp}-${index}`}><div><strong>{descriptor?.label ?? overlay.point.descriptorId}</strong><small>{overlay.strategyDefinitionId} · {descriptor?.pane ?? "PRICE"} · {descriptor?.kind ?? "SERIES"} · {overlay.point.timestamp}</small></div><div className="value-list">{Object.entries(overlay.point.values).map(([key, value]) => <span key={key}>{descriptor?.series.find((series) => series.key === key)?.label ?? key}: {formatNumber(value)}</span>)}</div></div>; })}</div> : <p className="muted-copy">Overlay points: {NOT_SUPPLIED}.</p>}<div className="marker-list"><div className="subsection__heading"><h4>Trade markers</h4><span>{experiment.visualization.tradeMarkers.length} supplied</span></div>{experiment.visualization.tradeMarkers.length ? experiment.visualization.tradeMarkers.map((marker) => <span className={`marker marker--${marker.kind.toLowerCase()}`} key={`${marker.tradeId}-${marker.kind}`}>{marker.kind} · {formatNumber(marker.price)} · {marker.timestamp}</span>) : <p className="muted-copy">Trade markers: {NOT_SUPPLIED}.</p>}</div><div className="signal-list"><div className="subsection__heading"><h4>Signal trace</h4><span>{experiment.visualization.signals.length} supplied</span></div>{experiment.visualization.signals.length ? experiment.visualization.signals.map((signal, index) => <span className={`signal-chip signal-chip--${signal.signal.toLowerCase()}`} key={`${signal.timestamp}-${index}`}>{signal.signal} · {selectionReference(signal.source)} · {signal.timestamp} · executable no earlier than {signal.executionNotBefore}</span>) : <p className="muted-copy">Signal trace: {NOT_SUPPLIED}.</p>}</div></section>;
}

function ProvenancePanel({ experiment }: { readonly experiment: ExperimentDto }): React.ReactElement {
  const paperProvenance = experiment.paperExecutionProvenance ?? experiment.configuration.paperExecutionProvenance;
  return <section className="result-section" aria-labelledby="provenance-title"><div className="subsection__heading"><h3 id="provenance-title">Provenance</h3><span>{experiment.replay.guarantee}</span></div><dl className="provenance-list"><dt>Experiment</dt><dd>{experiment.id}</dd><dt>Candidate</dt><dd>{experiment.candidateId}</dd><dt>Search Run</dt><dd>{formatOptionalValue(experiment.searchRunId)}</dd><dt>Strategy selection</dt><dd>{experiment.strategy.kind}</dd><dt>Market provider</dt><dd>{experiment.marketData.provider}</dd><dt>Market input</dt><dd>{experiment.marketData.pair} · {experiment.marketData.timeframe}<br />{experiment.marketData.range.from} → {experiment.marketData.range.to}</dd><dt>Dataset</dt><dd>{experiment.marketData.datasetId ?? NOT_SUPPLIED}{experiment.marketData.datasetVersion ? ` · ${experiment.marketData.datasetVersion}` : ""}</dd><dt>Market replay</dt><dd>{experiment.marketData.replayGuarantee} · {formatOptionalValue(experiment.marketData.replayLimitation)}</dd><dt>Code application version</dt><dd>{formatOptionalValue(experiment.code.applicationVersion)}</dd><dt>Code commit</dt><dd>{formatOptionalValue(experiment.code.gitCommit)}</dd><dt>Ranking configuration</dt><dd>{experiment.rankingConfigurationId}</dd><dt>Replay inputs</dt><dd>{experiment.replay.unavailableInputs.length ? experiment.replay.unavailableInputs.join(" · ") : "all supplied"}</dd><dt>Replay limitation</dt><dd>{formatOptionalValue(experiment.replay.limitation)}</dd><dt>Execution profile</dt><dd>{experiment.configuration.executionProfileId}</dd><dt>Initial capital</dt><dd>{formatNumber(experiment.configuration.initialCapital)} · supplied</dd><dt>Fee rate</dt><dd>{formatNumber(experiment.configuration.feeRatePercent)}%</dd><dt>Slippage</dt><dd>{formatNumber(experiment.configuration.slippageBps)} bps</dd><dt>Paper execution provenance</dt><dd><code>{formatRecord(paperProvenance)}</code></dd></dl><StrategyProvenance strategy={experiment.strategy} /><PaperExecutionMetadata provenance={paperProvenance} /></section>;
}

function StrategyProvenance({ strategy }: { readonly strategy: ExperimentDto["strategy"] }): React.ReactElement {
  if (strategy.kind === "STRATEGY") {
    return <div className="subsection"><div className="subsection__heading"><h4>Strategy definition</h4><span>{strategy.definition.version}</span></div><dl className="provenance-list"><dt>Definition</dt><dd>{strategy.definition.id} · {strategy.definition.strategyName}</dd><dt>Implementation</dt><dd>{strategy.definition.implementationVersion}</dd><dt>Behavior profile</dt><dd>{strategy.definition.behaviorProfileId}</dd><dt>Parameters</dt><dd><code>{formatRecord(strategy.definition.parameters)}</code></dd><dt>Authoring origin</dt><dd>{formatOrigin(strategy.definition.authoringOrigin)}</dd></dl></div>;
  }
  return <div className="subsection"><div className="subsection__heading"><h4>Composite definition</h4><span>{strategy.definition.version}</span></div><dl className="provenance-list"><dt>Definition</dt><dd>{strategy.definition.id}</dd><dt>Method</dt><dd>{strategy.definition.method}</dd><dt>Combination profile</dt><dd>{strategy.definition.combinationProfileId}</dd><dt>Weighted profile</dt><dd>{strategy.definition.weightedVote?.profileId ?? NOT_SUPPLIED}</dd><dt>Buy threshold</dt><dd>{formatOptionalValue(strategy.definition.weightedVote?.buyThreshold)}</dd><dt>Sell threshold</dt><dd>{formatOptionalValue(strategy.definition.weightedVote?.sellThreshold)}</dd><dt>Normalization</dt><dd>{strategy.definition.weightedVote?.normalization ?? NOT_SUPPLIED}</dd></dl><div className="definition-list">{strategy.definition.components.map((component) => { const componentDefinition = strategy.componentDefinitions.find((item) => item.id === component.strategyDefinitionId); return <div className="definition-row" key={`${component.strategyDefinitionId}-${component.strategyDefinitionVersion}`}><div><strong>{componentDefinition?.strategyName ?? component.strategyDefinitionId}</strong><small>{component.strategyDefinitionId} · version {component.strategyDefinitionVersion}</small></div><span>{component.enabled === undefined ? NOT_SUPPLIED : component.enabled ? "enabled" : "disabled"} · weight {formatOptionalValue(component.weight)}</span></div>; })}</div></div>;
}

function PaperExecutionMetadata({ provenance }: { readonly provenance: ExperimentDto["paperExecutionProvenance"] }): React.ReactElement {
  const fields = provenance ? Object.entries(provenance) : [];
  return <div className="subsection"><div className="subsection__heading"><h4>Paper execution fields</h4><span>supplied values only</span></div><div className="definition-list">{fields.length ? fields.map(([key, value]) => <div className="definition-row" key={key}><strong>{formatLabel(key)}</strong><span>{formatValue(value)}</span></div>) : <div className="definition-row"><strong>Paper execution provenance</strong><span>{NOT_SUPPLIED}</span></div>}</div></div>;
}

function positionLabel(positionMode: string | undefined): string {
  return `Paper position (supplied): ${formatOptionalValue(positionMode)}`;
}

function TradePanel({ trades }: { readonly trades: FeatureWorkspaceState["trades"] }): React.ReactElement {
  return <section className="result-section trade-section" aria-labelledby="trades-title"><div className="subsection__heading"><h3 id="trades-title">Trade ledger</h3><span>{trades.length} returned</span></div>{trades.length ? <div className="trade-table" role="table"><div className="trade-table__header" role="row"><span>Trade</span><span>Entry → exit</span><span>Supplied result</span></div>{trades.map((trade) => <div className="trade-table__row" role="row" key={trade.id}><span>#{trade.sequence}<small>{trade.pair} · {positionLabel(trade.positionMode)}</small><small>Exit: {trade.exitReason}</small></span><span>{formatNumber(trade.entryPrice)} → {formatNumber(trade.exitPrice)}<small>{trade.entryTime} → {trade.exitTime}</small><small>Signals: {trade.entrySignalAt} → {formatOptionalValue(trade.exitSignalAt)}</small></span><strong className={`result-${trade.result.toLowerCase()}`}>{trade.result} · {formatNumber(trade.resultPercent)}%<small>Gross {formatNumber(trade.grossProfit)} · fee {formatNumber(trade.feeAmount)} · slippage {formatNumber(trade.slippageBps)} bps · P&L {formatNumber(trade.profit)}</small></strong></div>)}</div> : <p className="empty-state">No trades returned for this Experiment.</p>}</section>;
}

function SentimentProjection({ item }: { readonly item: NewsItemDto }): React.ReactElement {
  const availability = item.sentimentAvailability;
  return <div className="sentiment-list"><span className={`sentiment sentiment--${availability?.state.toLowerCase() ?? "not-supplied"}`}>{availability ? `Sentiment ${availability.state}${availability.state === "DEGRADED" ? ` · ${availability.reason}` : ""}` : `Sentiment availability: ${NOT_SUPPLIED}`}</span>{item.sentiment ? <small>Supplied result: {item.sentiment.label} · {formatNumber(item.sentiment.score)} · {item.sentiment.modelName} v{item.sentiment.modelVersion}</small> : null}</div>;
}

function NewsExtractionMetadata({ item }: { readonly item: NewsItemDto }): React.ReactElement {
  const extraction = item.extraction;
  if (!extraction) return <p className="muted-copy">Extraction provenance: {NOT_SUPPLIED}.</p>;
  return <dl className="provenance-list"><dt>Extraction source</dt><dd>{extraction.sourceKind}</dd><dt>Canonical URL</dt><dd>{extraction.canonicalUrl}</dd><dt>Normalized content hash</dt><dd>{extraction.normalizedContentHash}</dd><dt>Extracted at</dt><dd>{extraction.extractedAt}</dd><dt>Normalized retain until</dt><dd>{extraction.normalizedRetainUntil}</dd><dt>Template id</dt><dd>{formatOptionalValue(extraction.template?.id)}</dd><dt>Template source</dt><dd>{formatOptionalValue(extraction.template?.sourceId)}</dd><dt>Template version</dt><dd>{formatOptionalValue(extraction.template?.version)}</dd><dt>Template status</dt><dd>{formatOptionalValue(extraction.template?.status)}</dd></dl>;
}

function NewsPanel({ state }: { readonly state: FeatureWorkspaceState }): React.ReactElement {
  return <article className="feature-card feature-card--wide" aria-labelledby="news-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Public auxiliary data</span><h2 id="news-title">News and Sentiment</h2></div><span className="feature-badge">{state.newsStatus === "ready" ? `${state.news?.items.length ?? 0} stories` : state.newsStatus}</span></div>{state.newsStatus === "loading" ? <p className="empty-state">Loading normalized News…</p> : state.newsStatus === "unavailable" ? <div className="degraded-panel" role="status"><strong>News unavailable</strong><span>{state.newsMessage ?? "The auxiliary provider failed; core strategy and result views remain usable."}</span></div> : !state.news ? <p className="empty-state">News data: {NOT_SUPPLIED}.</p> : <div className="news-list">{state.news.items.map((item) => <article className="news-row" key={item.id}><div className="news-row__meta"><span>{item.source} · {item.providerId}</span><time dateTime={item.publishedAt}>{item.publishedAt}</time></div><h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3><p>{item.content}</p><div className="news-row__footer"><span>{item.relatedCoins.join(" · ")}</span><SentimentProjection item={item} /></div><NewsExtractionMetadata item={item} /></article>)}</div>}</article>;
}
