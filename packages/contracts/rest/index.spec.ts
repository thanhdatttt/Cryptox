import { describe, expect, it } from "vitest";
import * as restContracts from "@cryptox/contracts/rest";
import type {
  ExperimentResponseDto,
  CandidateProgressResponseDto,
  SearchRunStatusResponseDto,
  StrategyDefinitionDto,
  LeaderboardTopKResponseDto,
  MarketHistoryResponseDto,
  NewsPageResponseDto,
} from "@cryptox/contracts/rest";

describe("REST transport contracts", () => {
  it("exports a self-contained runtime validation surface", () => {
    expect(Object.keys(restContracts).sort()).toEqual(
      [
        "REST_MARKET_TIMEFRAMES",
        "REST_PRIVATE_RESOURCE_FAILURES",
        "REST_SCHEMA_VERSION",
        "RestContractValidationError",
        "parseCreateLeaderboardScopeRequest",
        "parseLoginRequest",
        "parseMarketHistoryRequest",
        "parseMarketInputSelection",
        "parseBacktestConfiguration",
        "parseDefineCompositeRequest",
        "parseDefineStrategyRequest",
        "parseNewsQuery",
        "parseSafeUrlImportRequest",
        "parseRegisterRequest",
        "parseStartManualBacktestRequest",
        "parseStartSearchRequest",
      ].sort(),
    );
  });

  it("normalizes strategy definitions, composites, and bounded News queries", () => {
    expect(
      restContracts.parseDefineStrategyRequest({
        schemaVersion: 1,
        logicalFamilyKey: "ma-demo",
        strategyName: "MA",
        parameters: { slowPeriod: 50, fastPeriod: 20 },
      }).parameters,
    ).toEqual({ fastPeriod: 20, slowPeriod: 50 });

    expect(
      restContracts.parseDefineCompositeRequest({
        schemaVersion: 1,
        logicalFamilyKey: "demo-composite",
        combinationProfileId: "MAJORITY_VOTE_V1",
        strategyDefinitionIds: ["strategy-2", "strategy-1"],
      }).strategyDefinitionIds,
    ).toEqual(["strategy-1", "strategy-2"]);

    const newsQuery = restContracts.parseNewsQuery({
      schemaVersion: 1,
      relatedCoins: ["ETH", "BTC"],
      limit: 25,
      order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
    });
    expect(newsQuery.relatedCoins).toEqual(["BTC", "ETH"]);
    expect(() =>
      restContracts.parseNewsQuery({ ...newsQuery, relatedCoins: ["BTC", "BTC"] }),
    ).toThrow();
  });

  it("serializes safe URL extension input without weakening legacy request validation", () => {
    expect(restContracts.parseSafeUrlImportRequest({
      schemaVersion: 1,
      url: "https://configured.example/article",
      sourceId: "configured-source",
    }).url).toBe("https://configured.example/article");
    expect(() => restContracts.parseSafeUrlImportRequest({
      schemaVersion: 1,
      url: "http://configured.example/article",
      sourceId: "configured-source",
    })).toThrow();
  });

  it("round-trips and validates a bounded history request", () => {
    const parsed = restContracts.parseMarketHistoryRequest(
      JSON.parse(
        JSON.stringify({
          schemaVersion: 1,
          pair: "BTCUSDT",
          timeframe: "5m",
          range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
          limit: 500,
          completeness: "REQUIRE_COMPLETE",
        }),
      ),
    );
    expect(parsed.limit).toBe(500);
    expect(() =>
      restContracts.parseMarketHistoryRequest({
        ...parsed,
        range: { from: parsed.range.to, to: parsed.range.from },
      }),
    ).toThrow();
  });

  it("rejects ambiguous strategy selection and accepts the V1 backtest profile", () => {
    const valid = {
      schemaVersion: 1,
      leaderboardScopeId: "scope-1",
      strategySelection: { kind: "STRATEGY", strategyDefinitionId: "strategy-1" },
      marketInput: {
        pair: "BTCUSDT",
        timeframe: "5m",
        range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
      },
      configuration: {
        executionProfileId: "BACKTEST_EXECUTION_V1",
        initialCapital: 10_000,
        feeRatePercent: 0.1,
        slippageBps: 0,
      },
    };
    expect(restContracts.parseStartManualBacktestRequest(valid).strategySelection).toEqual(
      valid.strategySelection,
    );
    expect(() =>
      restContracts.parseStartManualBacktestRequest({
        ...valid,
        strategySelection: {
          ...valid.strategySelection,
          compositeDefinitionId: "composite-1",
        },
      }),
    ).toThrow();
  });

  it("validates seeded RANDOM search, distinct components, and finite stops", () => {
    const valid = {
      schemaVersion: 1,
      searchSpace: {
        availableStrategyDefinitionIds: ["strategy-1", "strategy-2"],
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true,
      },
      stopCondition: { maxCandidates: 10 },
      generatorType: "RANDOM",
      randomSeed: "seed-1",
      leaderboardScopeId: "scope-1",
      candidateTemplate: {
        marketInput: {
          pair: "BTCUSDT",
          timeframe: "5m",
          range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
        },
        configuration: {
          executionProfileId: "BACKTEST_EXECUTION_V1",
          initialCapital: 10_000,
          feeRatePercent: 0.1,
          slippageBps: 0,
        },
      },
      maxInFlight: 2,
    };
    expect(restContracts.parseStartSearchRequest(valid).randomSeed).toBe("seed-1");
    expect(() =>
      restContracts.parseStartSearchRequest({ ...valid, stopCondition: {} }),
    ).toThrow();
  });

  it("keeps response JSON explicit for partial history and missing Sentiment", () => {
    const history = {
      schemaVersion: 1,
      pair: "BTCUSDT",
      timeframe: "5m",
      range: { from: "2026-01-01T00:00:00Z", to: "2026-01-01T00:05:00Z" },
      candles: [],
      complete: false,
      missingRanges: [
        { from: "2026-01-01T00:00:00Z", to: "2026-01-01T00:05:00Z" },
      ],
      formingIncluded: false,
      asOf: "2026-01-01T00:06:00Z",
      provenance: {
        provider: "binance",
        pair: "BTCUSDT",
        timeframe: "5m",
        range: { from: "2026-01-01T00:00:00Z", to: "2026-01-01T00:05:00Z" },
        replayGuarantee: "TRACEABLE",
        replayLimitation: "No immutable dataset ID.",
      },
    } satisfies MarketHistoryResponseDto;
    const news = {
      schemaVersion: 1,
      items: [
        {
          id: "news-1",
          providerId: "coindesk",
          providerItemId: "guid-1",
          title: "Fixture",
          content: "Fixture",
          source: "CoinDesk",
          publishedAt: "2026-01-01T00:00:00Z",
          crawledAt: "2026-01-01T00:01:00Z",
          relatedCoins: ["BTC"],
          url: "https://example.test/news-1",
          sentiment: null,
        },
      ],
    } satisfies NewsPageResponseDto;
    expect(JSON.parse(JSON.stringify(history))).toEqual(history);
    expect(JSON.parse(JSON.stringify(news)).items[0].sentiment).toBeNull();
  });

  it("round-trips Experiment provenance and unambiguous visualization traces", () => {
    const response = {
      schemaVersion: 1,
      experiment: {
        id: "experiment-1",
        candidateId: "candidate-1",
        strategy: {
          kind: "STRATEGY",
          definition: {
            id: "strategy-1",
            ownerUserId: "user-1",
            logicalFamilyKey: "ma",
            strategyName: "MA",
            implementationVersion: "1",
            behaviorProfileId: "TECHNICAL_PROFILES_V1",
            version: 1,
            parameters: { fastPeriod: 20, slowPeriod: 50 },
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
        marketData: {
          provider: "binance",
          pair: "BTCUSDT",
          timeframe: "5m",
          range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
          replayGuarantee: "TRACEABLE",
          replayLimitation: "No immutable dataset ID.",
        },
        configuration: {
          executionProfileId: "BACKTEST_EXECUTION_V1",
          initialCapital: 10_000,
          feeRatePercent: 0.1,
          slippageBps: 0,
        },
        metrics: {
          candidateId: "candidate-1",
          totalReturnPercent: 1,
          winRatePercent: 50,
          numberOfTrades: 2,
          maxDrawdownMagnitudePercent: 0.5,
          evaluationProfileId: "REQUIRED_METRICS_V1",
        },
        rankingConfigurationId: "ranking-v1",
        code: { gitCommit: "abc123" },
        replay: {
          guarantee: "TRACEABLE",
          unavailableInputs: ["HISTORICAL_DATA"],
          limitation: "Exact replay unavailable.",
        },
        visualization: {
          signals: [
            {
              source: { kind: "STRATEGY", strategyDefinitionId: "strategy-1" },
              timestamp: "2026-01-01T00:00:00Z",
              signal: "BUY",
              executionNotBefore: "2026-01-01T00:05:00Z",
            },
          ],
          overlays: [
            {
              strategyDefinitionId: "strategy-1",
              point: {
                descriptorId: "ma-lines",
                timestamp: "2026-01-01T00:00:00Z",
                values: { fast: 100, slow: 99 },
              },
            },
          ],
          tradeMarkers: [
            {
              tradeId: "trade-1",
              kind: "ENTRY",
              timestamp: "2026-01-01T00:05:00Z",
              price: 100,
            },
          ],
        },
        createdAt: "2026-01-02T00:00:00Z",
      },
    } satisfies ExperimentResponseDto;
    const roundTrip = JSON.parse(JSON.stringify(response)) as ExperimentResponseDto;
    expect(roundTrip.experiment.visualization.overlays[0]?.strategyDefinitionId).toBe(
      "strategy-1",
    );
    expect(roundTrip.experiment.visualization.tradeMarkers[0]?.kind).toBe("ENTRY");
  });

  it("derives private identity outside DTOs and freezes 401/404 semantics", () => {
    expect(
      restContracts.parseRegisterRequest({
        schemaVersion: 1,
        email: " User@Example.Test ",
        password: "secret",
      }),
    ).toEqual({ schemaVersion: 1, email: "user@example.test", password: "secret" });

    const privateRequests = [
      () =>
        restContracts.parseDefineStrategyRequest({
          schemaVersion: 1,
          userId: "attacker-selected",
          logicalFamilyKey: "ma",
          strategyName: "MA",
          parameters: {},
        }),
      () =>
        restContracts.parseStartManualBacktestRequest({
          schemaVersion: 1,
          ownerUserId: "attacker-selected",
          leaderboardScopeId: "scope-1",
          strategySelection: { kind: "STRATEGY", strategyDefinitionId: "strategy-1" },
          marketInput: {
            pair: "BTCUSDT",
            timeframe: "1h",
            range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
          },
          configuration: {
            executionProfileId: "BACKTEST_EXECUTION_V1",
            initialCapital: 10_000,
            feeRatePercent: 0.1,
            slippageBps: 0,
          },
        }),
      () =>
        restContracts.parseCreateLeaderboardScopeRequest({
          schemaVersion: 1,
          userId: "attacker-selected",
          name: "Private",
          rankingConfigurationId: "ranking-v1",
          comparisonKey: "BTCUSDT:1h",
        }),
    ];
    for (const parse of privateRequests) {
      expect(parse).toThrow(/identity comes from authenticated context/);
    }

    expect(restContracts.REST_PRIVATE_RESOURCE_FAILURES).toEqual({
      unauthenticated: { code: "UNAUTHENTICATED", httpStatus: 401 },
      missingOrCrossUser: { code: "NOT_FOUND", httpStatus: 404 },
    });
  });

  it("serializes direct ownership roots and omits owner identity from inherited children", () => {
    const strategy = {
      id: "strategy-1",
      ownerUserId: "user-1",
      logicalFamilyKey: "ma",
      strategyName: "MA",
      implementationVersion: "1",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version: 1,
      parameters: {},
      createdAt: "2026-08-28T00:00:00.000Z",
    } satisfies StrategyDefinitionDto;
    const candidate = {
      schemaVersion: 1,
      candidate: {
        candidateId: "candidate-1",
        ownerUserId: "user-1",
        origin: { kind: "MANUAL", leaderboardScopeId: "scope-1" },
        strategySelection: { kind: "STRATEGY", strategyDefinitionId: strategy.id },
        marketInput: {
          pair: "BTCUSDT",
          timeframe: "1h",
          range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
        },
        status: "ACCEPTED",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
    } satisfies CandidateProgressResponseDto;
    const search = {
      schemaVersion: 1,
      searchRun: {
        searchRunId: "run-1",
        ownerUserId: "user-1",
        generatorType: "RANDOM",
        randomSeed: "seed",
        searchSpace: {
          availableStrategyDefinitionIds: ["strategy-1", "strategy-2"],
          componentCount: { minimum: 2, maximum: 2 },
          requireDistinctComponents: true,
        },
        stopCondition: { maxCandidates: 1 },
        leaderboardScopeId: "scope-1",
        candidateTemplate: {
          marketInput: {
            pair: "BTCUSDT",
            timeframe: "1h",
            range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
          },
          configuration: {
            executionProfileId: "BACKTEST_EXECUTION_V1",
            initialCapital: 10_000,
            feeRatePercent: 0.1,
            slippageBps: 0,
          },
        },
        maxInFlight: 1,
        state: "CREATED",
        activeCandidateIds: [],
        submittedCandidateCount: 0,
        completedCandidateCount: 0,
        failedCandidateCount: 0,
        averageBacktestDurationMs: null,
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
      ranking: [],
    } satisfies SearchRunStatusResponseDto;
    const leaderboard = {
      schemaVersion: 1,
      scope: {
        id: "scope-1",
        ownerUserId: "user-1",
        name: "Private",
        k: 10,
        rankingConfigurationId: "ranking-v1",
        comparisonKey: "BTCUSDT:1h",
        createdAt: "2026-08-28T00:00:00.000Z",
      },
      rankingConfiguration: {
        id: "ranking-v1",
        profileId: "LINEAR_REQUIRED_V1",
        version: 1,
        name: "Required",
        formula: {
          totalReturnPercentWeight: 0.5,
          winRatePercentWeight: 0.3,
          maxDrawdownMagnitudePercentWeight: -0.2,
        },
        minimumNumberOfTrades: 1,
        tieBreakers: [
          { field: "SCORE", direction: "DESCENDING" },
          { field: "TOTAL_RETURN_PERCENT", direction: "DESCENDING" },
          { field: "MAX_DRAWDOWN_MAGNITUDE_PERCENT", direction: "ASCENDING" },
          { field: "WIN_RATE_PERCENT", direction: "DESCENDING" },
          { field: "EXPERIMENT_ID", direction: "ASCENDING" },
        ],
        createdAt: "2026-08-28T00:00:00.000Z",
      },
      entries: [],
    } satisfies LeaderboardTopKResponseDto;

    expect(strategy.ownerUserId).toBe("user-1");
    expect(candidate.candidate.ownerUserId).toBe("user-1");
    expect(search.searchRun.ownerUserId).toBe("user-1");
    expect(leaderboard.scope.ownerUserId).toBe("user-1");
    expect(leaderboard.entries).toEqual([]);
  });
});
