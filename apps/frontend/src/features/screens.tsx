import { useEffect, useMemo, useState } from "react";
import type {
  CompositeStrategyDefinitionDto,
  DefineCompositeRequestDto,
  DefineStrategyRequestDto,
  ExperimentDto,
  LeaderboardTopKResponseDto,
  SearchRunStatusDto,
  StartSearchRequestDto,
  StrategyDefinitionDto,
  StrategyParameterDescriptorDto,
  StrategyPluginDescriptorDto,
  StrategySelectionDto,
} from "@cryptox/contracts/rest";
import { FIXTURE_BACKTEST_CONFIGURATION, FIXTURE_MARKET_INPUT } from "./fixture-data";
import { FeatureWorkspaceStore, useFeatureWorkspace } from "./state";
import type { FeatureWorkspaceState } from "./types";

export interface FeatureWorkspaceProps {
  readonly section: "strategies" | "experiments";
  readonly email: string;
  readonly store: FeatureWorkspaceStore;
}

function descriptorDefaults(descriptor: StrategyPluginDescriptorDto | undefined): Record<string, string | number> {
  return Object.fromEntries((descriptor?.parameters ?? []).map((parameter) => [parameter.key, parameter.defaultValue]));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function strategyLabel(selection: StrategySelectionDto | undefined, definitions: readonly StrategyDefinitionDto[], composites: readonly CompositeStrategyDefinitionDto[]): string {
  if (!selection) return "No strategy selected";
  if (selection.kind === "STRATEGY") return definitions.find((definition) => definition.id === selection.strategyDefinitionId)?.strategyName ?? selection.strategyDefinitionId;
  return composites.find((definition) => definition.id === selection.compositeDefinitionId)?.logicalFamilyKey ?? selection.compositeDefinitionId;
}

export function FeatureWorkspace({ section, email, store }: FeatureWorkspaceProps): React.ReactElement {
  const state = useFeatureWorkspace(store);
  const [selection, setSelection] = useState<StrategySelectionDto>();

  useEffect(() => {
    void store.load();
  }, [store]);

  useEffect(() => {
    if (selection?.kind === "STRATEGY" && !state.strategyDefinitions.some((item) => item.id === selection.strategyDefinitionId)) setSelection(undefined);
    if (selection?.kind === "COMPOSITE" && !state.compositeDefinitions.some((item) => item.id === selection.compositeDefinitionId)) setSelection(undefined);
  }, [selection, state.compositeDefinitions, state.strategyDefinitions]);

  if (state.status === "loading" || state.status === "idle") {
    return <section className="feature-loading" role="status">Loading your private strategy workspace…</section>;
  }
  if (state.status === "error") {
    return <section className="feature-error" role="alert"><strong>Private workspace unavailable</strong><span>{state.message}</span></section>;
  }

  const activeSelection = selection ?? (state.strategyDefinitions[0] ? { kind: "STRATEGY" as const, strategyDefinitionId: state.strategyDefinitions[0].id } : undefined);
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
          descriptors={state.descriptors}
          definitions={state.strategyDefinitions}
          composites={state.compositeDefinitions}
          pending={state.pendingAction}
          onCreateStrategy={(request) => void store.createStrategy(request)}
          onCreateComposite={(request) => void store.createComposite(request)}
          onSelect={setSelection}
          activeSelection={activeSelection}
        />
        <SearchPanel state={state} pending={state.pendingAction} onStart={(request) => void store.startSearch(request)} onRefresh={(id) => void store.refreshSearch(id)} onCancel={(id) => void store.cancelSearch(id)} />
        <LeaderboardPanel leaderboard={state.leaderboard} />
        <ExperimentPanel state={state} onSelect={(id) => void store.selectExperiment(id)} />
        <NewsPanel state={state} />
      </div>
    </section>
  );
}

interface StrategyBuilderProps {
  readonly descriptors: readonly StrategyPluginDescriptorDto[];
  readonly definitions: readonly StrategyDefinitionDto[];
  readonly composites: readonly CompositeStrategyDefinitionDto[];
  readonly pending?: string;
  readonly activeSelection?: StrategySelectionDto;
  readonly onCreateStrategy: (request: Omit<DefineStrategyRequestDto, "schemaVersion">) => void;
  readonly onCreateComposite: (request: Omit<DefineCompositeRequestDto, "schemaVersion">) => void;
  readonly onSelect: (selection: StrategySelectionDto) => void;
}

function StrategyBuilder({ descriptors, definitions, composites, pending, activeSelection, onCreateStrategy, onCreateComposite, onSelect }: StrategyBuilderProps): React.ReactElement {
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
        <form className="feature-form" onSubmit={submitStrategy}>
          <label>Strategy type<select value={descriptor.name} onChange={(event) => setDescriptorName(event.target.value)}>{descriptors.map((item) => <option key={item.name} value={item.name}>{item.displayName}</option>)}</select></label>
          <p className="descriptor-description">{descriptor.description} · {descriptor.category}</p>
          <div className="parameter-grid">
            {descriptor.parameters.map((parameter) => <DescriptorParameter key={parameter.key} descriptor={parameter} value={parameters[parameter.key] ?? parameter.defaultValue} onChange={(value) => setParameters((current) => ({ ...current, [parameter.key]: value }))} />)}
          </div>
          <div className="feature-form__actions"><button className="feature-button" type="submit" disabled={Boolean(pending)}>Save version</button><span className="muted-copy">v{descriptor.implementationVersion} · {descriptor.behaviorProfileId}</span></div>
        </form>
      ) : <p className="empty-state">No strategy descriptors are available.</p>}

      <div className="subsection"><div className="subsection__heading"><h3>My definitions</h3><span>{definitions.length}</span></div>
        <div className="definition-list">{definitions.map((definition) => <div className="definition-row" key={definition.id}><div><strong>{definition.strategyName}</strong><small>{definition.logicalFamilyKey} · version {definition.version}</small></div><button className={activeSelection?.kind === "STRATEGY" && activeSelection.strategyDefinitionId === definition.id ? "text-button text-button--active" : "text-button"} type="button" onClick={() => onSelect({ kind: "STRATEGY", strategyDefinitionId: definition.id })}>{activeSelection?.kind === "STRATEGY" && activeSelection.strategyDefinitionId === definition.id ? "Selected" : "Use"}</button></div>)}</div>
      </div>

      <div className="subsection"><div className="subsection__heading"><h3>Composite definition</h3><span>Majority vote</span></div>
        <form className="feature-form" onSubmit={submitComposite}><div className="checkbox-grid">{definitions.map((definition) => <label className="checkbox-label" key={definition.id}><input type="checkbox" checked={selectedComponentIds.includes(definition.id)} onChange={(event) => setSelectedComponentIds((current) => event.target.checked ? [...current, definition.id] : current.filter((id) => id !== definition.id))} />{definition.strategyName} · v{definition.version}</label>)}</div><button className="feature-button feature-button--quiet" type="submit" disabled={selectedComponentIds.length < 2 || Boolean(pending)}>Save composite</button></form>
        <div className="definition-list">{composites.map((definition) => <div className="definition-row" key={definition.id}><div><strong>{definition.logicalFamilyKey}</strong><small>{definition.components.length} components · {definition.combinationProfileId}</small></div><button className={activeSelection?.kind === "COMPOSITE" && activeSelection.compositeDefinitionId === definition.id ? "text-button text-button--active" : "text-button"} type="button" onClick={() => onSelect({ kind: "COMPOSITE", compositeDefinitionId: definition.id })}>{activeSelection?.kind === "COMPOSITE" && activeSelection.compositeDefinitionId === definition.id ? "Selected" : "Use"}</button></div>)}</div>
      </div>
    </article>
  );
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
  const canStart = state.strategyDefinitions.length >= 2 && Boolean(state.leaderboard);
  function start(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canStart || !state.leaderboard) return;
    onStart({ searchSpace: { availableStrategyDefinitionIds: state.strategyDefinitions.map((item) => item.id), componentCount: { minimum: 2, maximum: Math.min(2, state.strategyDefinitions.length) }, requireDistinctComponents: true }, stopCondition: { maxCandidates }, generatorType: "RANDOM", randomSeed: "workspace-seed", leaderboardScopeId: state.leaderboard.scope.id, candidateTemplate: { marketInput: FIXTURE_MARKET_INPUT, configuration: FIXTURE_BACKTEST_CONFIGURATION }, maxInFlight: 1 });
  }
  return <article className="feature-card" aria-labelledby="search-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Search orchestration</span><h2 id="search-title">Bounded Random Search</h2></div><span className="feature-badge">REST progress</span></div><p className="feature-card__intro">Finite candidate limits and in-flight capacity remain explicit in the command boundary.</p><form className="feature-form feature-form--inline" onSubmit={start}><label>Max candidates<input type="number" min={1} max={20} value={maxCandidates} onChange={(event) => setMaxCandidates(Number(event.target.value))} /></label><button className="feature-button" type="submit" disabled={!canStart || Boolean(pending)}>{pending?.includes("Search") ? pending : "Start Search Run"}</button></form>{!canStart ? <p className="warning-copy">At least two private definitions and a leaderboard scope are required.</p> : null}<div className="run-list">{state.searchRuns.map((run) => <SearchRunRow key={run.searchRunId} run={run} onRefresh={onRefresh} onCancel={onCancel} />)}</div></article>;
}

function SearchRunRow({ run, onRefresh, onCancel }: { readonly run: SearchRunStatusDto; readonly onRefresh: (id: string) => void; readonly onCancel: (id: string) => void }): React.ReactElement {
  const bound = "maxCandidates" in run.stopCondition ? run.stopCondition.maxCandidates : undefined;
  const percentage = bound ? Math.min(100, Math.round((run.submittedCandidateCount / bound) * 100)) : undefined;
  const terminal = run.state === "COMPLETED" || run.state === "CANCELLED" || run.state === "FAILED";
  return <div className="run-row"><div className="run-row__top"><div><strong>{run.generatorType} · {run.randomSeed}</strong><small>{run.state} · {run.stopReason?.replaceAll("_", " ") ?? "bounded run"}</small></div><span className={`state-pill state-pill--${run.state.toLowerCase()}`}>{run.state}</span></div><div className="progress-track" aria-label={`Search progress ${run.submittedCandidateCount} of ${bound ?? "bounded"}`}><span style={{ width: `${percentage ?? 0}%` }} /></div><div className="run-row__stats"><span>{run.submittedCandidateCount} submitted</span><span>{run.completedCandidateCount} completed</span><span>{run.failedCandidateCount} failed</span><span>{run.averageBacktestDurationMs ? `${run.averageBacktestDurationMs}ms avg` : "timing pending"}</span></div><div className="run-row__actions"><button className="text-button" type="button" onClick={() => onRefresh(run.searchRunId)}>Refresh</button>{!terminal ? <button className="text-button text-button--danger" type="button" onClick={() => onCancel(run.searchRunId)}>Stop</button> : null}</div></div>;
}

function LeaderboardPanel({ leaderboard }: { readonly leaderboard?: LeaderboardTopKResponseDto }): React.ReactElement {
  return <article className="feature-card" aria-labelledby="leaderboard-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Ranking scope</span><h2 id="leaderboard-title">My leaderboard</h2></div><span className="feature-badge">Top {leaderboard?.scope.k ?? "—"}</span></div>{leaderboard ? <><p className="feature-card__intro">{leaderboard.rankingConfiguration.name} · {leaderboard.rankingConfiguration.id}</p><div className="ranking-list">{leaderboard.entries.map((entry) => <div className="ranking-row" key={entry.id}><span className="rank-number">#{entry.rank}</span><div><strong>{entry.experimentId}</strong><small>{entry.candidateId}</small></div><strong className="score-value">{formatNumber(entry.score)}</strong></div>)}</div><p className="muted-copy">Scope: {leaderboard.scope.comparisonKey}</p></> : <p className="empty-state">Leaderboard scope unavailable.</p>}</article>;
}

function ExperimentPanel({ state, onSelect }: { readonly state: FeatureWorkspaceState; readonly onSelect: (id: string) => void }): React.ReactElement {
  const experiment = state.selectedExperiment;
  return <article className="feature-card feature-card--wide" aria-labelledby="experiment-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Backtest result</span><h2 id="experiment-title">Experiments and trades</h2></div><span className="feature-badge">{state.experiments.length} results</span></div><div className="experiment-selector">{state.experiments.map((item) => <button className={experiment?.id === item.id ? "experiment-tab experiment-tab--active" : "experiment-tab"} type="button" key={item.id} onClick={() => onSelect(item.id)}>{item.id}<small>{item.strategy.kind}</small></button>)}</div>{experiment ? <ResultView experiment={experiment} trades={state.trades} descriptors={state.descriptors} /> : <p className="empty-state">Select a completed Experiment to inspect its metrics and provenance.</p>}</article>;
}

function ResultView({ experiment, trades, descriptors }: { readonly experiment: ExperimentDto; readonly trades: FeatureWorkspaceState["trades"]; readonly descriptors: readonly StrategyPluginDescriptorDto[] }): React.ReactElement {
  const descriptorMap = useMemo(() => new Map(descriptors.flatMap((descriptor) => descriptor.visualization.map((visualization) => [visualization.id, visualization] as const))), [descriptors]);
  return <div className="result-view"><div className="metric-grid">{[["Return", `${formatNumber(experiment.metrics.totalReturnPercent)}%`], ["Win rate", `${formatNumber(experiment.metrics.winRatePercent)}%`], ["Max drawdown", `${formatNumber(experiment.metrics.maxDrawdownMagnitudePercent)}%`], ["Trades", String(experiment.metrics.numberOfTrades)]].map(([label, value]) => <div className="metric-tile" key={label}><span>{label}</span><strong>{value}</strong><small>{experiment.metrics.evaluationProfileId}</small></div>)}</div><div className="result-columns"><VisualizationPanel experiment={experiment} descriptorMap={descriptorMap} /><ProvenancePanel experiment={experiment} /></div><TradePanel trades={trades} /></div>;
}

function VisualizationPanel({ experiment, descriptorMap }: { readonly experiment: ExperimentDto; readonly descriptorMap: ReadonlyMap<string, StrategyPluginDescriptorDto["visualization"][number]> }): React.ReactElement {
  return <section className="result-section" aria-labelledby="visualization-title"><div className="subsection__heading"><h3 id="visualization-title">Signals and overlays</h3><span>{experiment.visualization.overlays.length} points</span></div><div className="overlay-list">{experiment.visualization.overlays.map((overlay, index) => { const descriptor = descriptorMap.get(overlay.point.descriptorId); return <div className="overlay-row" key={`${overlay.point.timestamp}-${index}`}><div><strong>{descriptor?.label ?? overlay.point.descriptorId}</strong><small>{descriptor?.pane ?? "PRICE"} · {descriptor?.kind ?? "SERIES"} · {overlay.point.timestamp}</small></div><div className="value-list">{Object.entries(overlay.point.values).map(([key, value]) => <span key={key}>{descriptor?.series.find((series) => series.key === key)?.label ?? key}: {formatNumber(value)}</span>)}</div></div>; })}</div><div className="marker-list"><div className="subsection__heading"><h4>Trade markers</h4><span>{experiment.visualization.tradeMarkers.length}</span></div>{experiment.visualization.tradeMarkers.map((marker) => <span className={`marker marker--${marker.kind.toLowerCase()}`} key={`${marker.tradeId}-${marker.kind}`}>{marker.kind} · {formatNumber(marker.price)} · {marker.timestamp}</span>)}</div><div className="signal-list">{experiment.visualization.signals.map((signal, index) => <span className={`signal-chip signal-chip--${signal.signal.toLowerCase()}`} key={`${signal.timestamp}-${index}`}>{signal.signal} · {signal.timestamp}</span>)}</div></section>;
}

function ProvenancePanel({ experiment }: { readonly experiment: ExperimentDto }): React.ReactElement {
  const strategy = experiment.strategy.kind === "STRATEGY" ? experiment.strategy.definition : experiment.strategy.definition;
  return <section className="result-section" aria-labelledby="provenance-title"><div className="subsection__heading"><h3 id="provenance-title">Provenance</h3><span>{experiment.replay.guarantee}</span></div><dl className="provenance-list"><dt>Strategy definition</dt><dd>{strategy.id} · {strategy.version} · {"strategyName" in strategy ? strategy.strategyName : strategy.method}</dd><dt>Parameters</dt><dd><code>{JSON.stringify("parameters" in strategy ? strategy.parameters : strategy.components)}</code></dd><dt>Market input</dt><dd>{experiment.marketData.provider} · {experiment.marketData.pair} · {experiment.marketData.timeframe}<br />{experiment.marketData.range.from} → {experiment.marketData.range.to}</dd><dt>Dataset</dt><dd>{experiment.marketData.datasetId ?? "not retained"} {experiment.marketData.datasetVersion ? `· ${experiment.marketData.datasetVersion}` : ""}</dd><dt>Code</dt><dd>{experiment.code.gitCommit ?? experiment.code.applicationVersion ?? "not recorded"}</dd><dt>Ranking</dt><dd>{experiment.rankingConfigurationId}</dd><dt>Replay limitation</dt><dd>{experiment.replay.limitation ?? "Exact replay inputs are available."}</dd></dl></section>;
}

function TradePanel({ trades }: { readonly trades: FeatureWorkspaceState["trades"] }): React.ReactElement {
  return <section className="result-section trade-section" aria-labelledby="trades-title"><div className="subsection__heading"><h3 id="trades-title">Trade ledger</h3><span>{trades.length} returned</span></div>{trades.length ? <div className="trade-table" role="table"><div className="trade-table__header" role="row"><span>Trade</span><span>Entry → exit</span><span>Result</span></div>{trades.map((trade) => <div className="trade-table__row" role="row" key={trade.id}><span>#{trade.sequence}<small>{trade.pair}</small></span><span>{formatNumber(trade.entryPrice)} → {formatNumber(trade.exitPrice)}<small>{trade.entryTime}</small></span><strong className={`result-${trade.result.toLowerCase()}`}>{trade.result} · {formatNumber(trade.resultPercent)}%</strong></div>)}</div> : <p className="empty-state">No trades returned for this Experiment.</p>}</section>;
}

function NewsPanel({ state }: { readonly state: FeatureWorkspaceState }): React.ReactElement {
  return <article className="feature-card feature-card--wide" aria-labelledby="news-title"><div className="feature-card__heading"><div><span className="feature-eyebrow">Public auxiliary data</span><h2 id="news-title">News and Sentiment</h2></div><span className="feature-badge">{state.newsStatus === "ready" ? `${state.news?.items.length ?? 0} stories` : state.newsStatus}</span></div>{state.newsStatus === "loading" ? <p className="empty-state">Loading normalized News…</p> : state.newsStatus === "unavailable" ? <div className="degraded-panel" role="status"><strong>News unavailable</strong><span>{state.newsMessage ?? "The auxiliary provider failed; core strategy and result views remain usable."}</span></div> : <div className="news-list">{state.news?.items.map((item) => <article className="news-row" key={item.id}><div className="news-row__meta"><span>{item.source}</span><time dateTime={item.publishedAt}>{item.publishedAt}</time></div><h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3><p>{item.content}</p><div className="news-row__footer"><span>{item.relatedCoins.join(" · ")}</span>{item.sentiment ? <span className={`sentiment sentiment--${item.sentiment.label.toLowerCase()}`}>{item.sentiment.label} · {item.sentiment.score.toFixed(2)} · {item.sentiment.modelName} v{item.sentiment.modelVersion}</span> : <span className="sentiment sentiment--missing">Sentiment unavailable</span>}</div></article>)}</div>}</article>;
}
