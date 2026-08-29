import { describe, expect, it } from "vitest";
import {
  createPostgresSentimentDependencies,
  type PostgresPool,
  type PostgresQueryResult,
} from "./postgres";

interface QueryCall {
  text: string;
  values?: unknown[];
}

function fakePool(responses: readonly PostgresQueryResult[]): {
  pool: PostgresPool;
  calls: QueryCall[];
  readonly endCalls: number;
} {
  const calls: QueryCall[] = [];
  let endCalls = 0;
  let index = 0;
  const pool: PostgresPool = {
    query: async <Row extends Record<string, unknown>>(text: string, values?: unknown[]) => {
      calls.push({ text, values });
      const response = responses[index++];
      if (!response) throw new Error("unexpected fake query");
      return response as PostgresQueryResult<Row>;
    },
    end: async () => {
      endCalls += 1;
    },
  };
  return { pool, calls, get endCalls() { return endCalls; } };
}

const result = {
  newsId: "00000000-0000-4000-8000-000000000003",
  label: "POSITIVE" as const,
  score: 0.75,
  providerId: "LEXICON_V1",
  analysisProfileId: "LEXICON_V1",
  modelName: "LEXICON_V1",
  modelVersion: "1",
  analyzedAt: "2026-01-02T00:00:00.000Z",
};

function row() {
  return {
    news_id: result.newsId,
    label: result.label,
    score: "0.75",
    provider_id: result.providerId,
    analysis_profile_id: result.analysisProfileId,
    model_name: result.modelName,
    model_version: result.modelVersion,
    analyzed_at: result.analyzedAt,
  };
}

describe("PostgreSQL Sentiment result repository [CSL-R-SN-01, CSL-R-DM-01]", () => {
  it("persists and reads normalized result provenance through the repository port", async () => {
    const fake = fakePool([{ rows: [row()] }, { rows: [row()] }]);
    const dependencies = createPostgresSentimentDependencies({ connectionString: "postgres://fixture", pool: fake.pool });

    await expect(dependencies.resultRepository.insert(result)).resolves.toEqual(result);
    await expect(dependencies.resultRepository.readLatestForNews(result.newsId)).resolves.toEqual(result);
    expect(fake.calls[0].text).toContain("ON CONFLICT (news_id, model_name, model_version)");
    expect(fake.calls[0].values).toEqual(expect.arrayContaining([
      result.newsId,
      result.providerId,
      result.analysisProfileId,
      result.modelName,
      result.modelVersion,
    ]));
    expect(fake.calls[1].text).toContain("ORDER BY analyzed_at DESC, id DESC");
    await dependencies.close();
    await dependencies.close();
    expect(fake.endCalls).toBe(1);
  });

  it("returns explicit missing state and rejects invalid persisted scores", async () => {
    const missing = fakePool([{ rows: [] }]);
    const missingDependencies = createPostgresSentimentDependencies({ connectionString: "", pool: missing.pool });
    await expect(missingDependencies.resultRepository.readLatestForNews(result.newsId)).resolves.toBeUndefined();

    const invalid = fakePool([{ rows: [{ ...row(), score: "NaN" }] }]);
    const invalidDependencies = createPostgresSentimentDependencies({ connectionString: "postgres://fixture", pool: invalid.pool });
    await expect(invalidDependencies.resultRepository.readLatestForNews(result.newsId)).rejects.toThrow(
      "invalid sentiment score in persistence",
    );
  });
});

