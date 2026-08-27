import { describe, expect, it } from "vitest";
import * as restContracts from "@cryptox/contracts/rest";
import type {
  ExperimentResponseDto,
  MarketHistoryResponseDto,
  NewsPageResponseDto,
} from "@cryptox/contracts/rest";

describe("REST transport contracts", () => {
  it("exports a self-contained runtime validation surface", () => {
    expect(Object.keys(restContracts).sort()).toEqual(
      [
        "REST_MARKET_TIMEFRAMES",
        "REST_SCHEMA_VERSION",
        "RestContractValidationError",
        "parseMarketHistoryRequest",
        "parseMarketInputSelection",
        "parseBacktestConfiguration",
        "parseDefineCompositeRequest",
        "parseDefineStrategyRequest",
        "parseNewsQuery",
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
});
