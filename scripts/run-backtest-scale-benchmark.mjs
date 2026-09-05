import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import { dirname, resolve } from "node:path";

const baseUrl = (process.env.BENCHMARK_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const candidateCount = positiveInteger("BENCHMARK_CANDIDATES", process.env.BENCHMARK_CANDIDATES ?? "100");
const maxInFlight = positiveInteger("BENCHMARK_MAX_IN_FLIGHT", process.env.BENCHMARK_MAX_IN_FLIGHT ?? "4");
const workerReplicas = positiveInteger("BENCHMARK_WORKER_REPLICAS", process.env.BENCHMARK_WORKER_REPLICAS ?? "1");
const workerConcurrency = positiveInteger("BENCHMARK_WORKER_CONCURRENCY", process.env.BENCHMARK_WORKER_CONCURRENCY ?? "1");
const pollIntervalMs = positiveInteger("BENCHMARK_POLL_INTERVAL_MS", process.env.BENCHMARK_POLL_INTERVAL_MS ?? "500");
const requestTimeoutMs = positiveInteger("BENCHMARK_REQUEST_TIMEOUT_MS", process.env.BENCHMARK_REQUEST_TIMEOUT_MS ?? "15000");
const timeoutMs = positiveInteger("BENCHMARK_TIMEOUT_MS", process.env.BENCHMARK_TIMEOUT_MS ?? "1200000");
const commit = process.env.BENCHMARK_COMMIT?.trim() || "UNSPECIFIED";
const outputPath = resolve(process.env.BENCHMARK_OUTPUT?.trim() || `tmp/backtest-scale/${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const terminalStates = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

function positiveInteger(name, raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function request(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const text = await response.text();
  const value = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}: ${text || "empty response"}`);
  return value;
}

async function listCandidates(token, searchRunId) {
  const candidates = [];
  let cursor;
  do {
    const query = new URLSearchParams({ limit: "500", ...(cursor ? { cursor } : {}) });
    const page = await request(`/search-runs/${searchRunId}/candidates?${query}`, { token });
    candidates.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return candidates;
}

function rangeForSeededHourlyCandles() {
  const end = Date.parse("2025-01-31T00:00:00.000Z");
  const from = end - (1_000 - 1) * 60 * 60 * 1_000;
  return { from: new Date(from).toISOString(), to: new Date(end).toISOString(), candleCount: 1_000 };
}

function summarizeTerminalCandidates(candidates) {
  const nonTerminal = candidates.filter((candidate) => !terminalStates.has(candidate.status));
  const completed = candidates.filter((candidate) => candidate.status === "COMPLETED");
  const failed = candidates.filter((candidate) => candidate.status === "FAILED");
  const cancelled = candidates.filter((candidate) => candidate.status === "CANCELLED");
  const experimentIds = completed.map((candidate) => candidate.experimentResultId).filter((id) => typeof id === "string");
  return {
    candidateCount: candidates.length,
    completed: completed.length,
    failed: failed.length,
    cancelled: cancelled.length,
    nonTerminal: nonTerminal.length,
    completedWithoutExperiment: completed.length - experimentIds.length,
    duplicateExperimentIds: experimentIds.length - new Set(experimentIds).size,
    failedAttempts: candidates.flatMap((candidate) => candidate.attempts ?? []).filter((attempt) => attempt.status === "FAILED").length,
    retryAttemptCount: candidates.flatMap((candidate) => candidate.attempts ?? []).filter((attempt) => Number(attempt.attemptNumber) > 1).length,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const wallStarted = performance.now();
  const suffix = randomUUID();
  const email = `benchmark-${suffix}@local.invalid`;
  const password = `Benchmark-${suffix}`;
  const benchmarkRange = rangeForSeededHourlyCandles();
  let maxObservedInFlight = 0;
  let lastStatus;

  try {
    await request("/auth/register", { method: "POST", body: { email, password } });
    const login = await request("/auth/login", { method: "POST", body: { email, password } });
    if (!login?.token || typeof login.token !== "string") throw new Error("Login did not return a token.");
    const token = login.token;
    const strategies = await Promise.all([
      request("/strategies", { method: "POST", token, body: { strategyName: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 } } }),
      request("/strategies", { method: "POST", token, body: { strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } } }),
      request("/strategies", { method: "POST", token, body: { strategyName: "BOLLINGER", parameters: { period: 20, deviations: 2 } } }),
    ]);
    const scope = await request("/leaderboard-scopes", {
      method: "POST",
      token,
      headers: { "idempotency-key": `benchmark-scope-${suffix}` },
      body: { name: `Scale benchmark ${suffix}`, pair: "BTCUSDT", timeframe: "1h", from: benchmarkRange.from, to: benchmarkRange.to, initialCapital: 1_000, feeRatePercent: 0, slippageBps: 5, warmupCapacityCandles: 100 },
    });
    const started = await request("/search-runs", {
      method: "POST",
      token,
      body: { leaderboardScopeId: scope.id, strategyDefinitionIds: strategies.map((strategy) => strategy.id), generatorType: "GENETIC", maxCandidates: candidateCount, maxInFlight, maxComponents: 1 },
    });
    if (!started?.searchRunId || typeof started.searchRunId !== "string") throw new Error("Search Run did not return searchRunId.");

    const deadline = Date.now() + timeoutMs;
    do {
      lastStatus = await request(`/search-runs/${started.searchRunId}`, { token });
      const inFlight = Number(lastStatus.queuedCount) + Number(lastStatus.runningCount);
      if (!Number.isFinite(inFlight) || inFlight < 0) throw new Error("Search Run returned invalid in-flight counters.");
      maxObservedInFlight = Math.max(maxObservedInFlight, inFlight);
      if (terminalStates.has(lastStatus.state)) break;
      if (Date.now() >= deadline) throw new Error(`Benchmark timed out after ${timeoutMs} ms with state ${lastStatus.state}.`);
      await wait(pollIntervalMs);
    } while (true);

    const candidates = await listCandidates(token, started.searchRunId);
    const terminal = summarizeTerminalCandidates(candidates);
    const wallDurationMs = performance.now() - wallStarted;
    const result = {
      schemaVersion: 1,
      status: "PASS",
      startedAt,
      finishedAt: new Date().toISOString(),
      commit,
      runtime: { node: process.version, platform: process.platform, arch: process.arch, logicalCpuCores: cpus().length, totalMemoryBytes: totalmem() },
      workload: { pair: "BTCUSDT", timeframe: "1h", generatorType: "GENETIC", ...benchmarkRange, strategyMix: [
        { name: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 } },
        { name: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } },
        { name: "BOLLINGER", parameters: { period: 20, deviations: 2 } },
      ], candidateCount },
      capacity: { maxInFlight, workerReplicas, workerConcurrency },
      measurements: { wallDurationMs, throughputCandidatesPerSecond: candidateCount / (wallDurationMs / 1_000), maxObservedInFlight, averageBacktestDurationMs: lastStatus.averageBacktestDurationMs ?? null },
      terminal,
      searchRun: { id: started.searchRunId, state: lastStatus.state, candidatesTested: lastStatus.candidatesTested },
    };
    const failures = [
      result.searchRun.state !== "COMPLETED" && `Search Run ended as ${result.searchRun.state}`,
      terminal.candidateCount !== candidateCount && `Expected ${candidateCount} candidates, received ${terminal.candidateCount}`,
      terminal.nonTerminal > 0 && `${terminal.nonTerminal} candidates were not terminal`,
      terminal.failed > 0 && `${terminal.failed} candidates failed`,
      terminal.cancelled > 0 && `${terminal.cancelled} candidates were cancelled`,
      terminal.completedWithoutExperiment > 0 && `${terminal.completedWithoutExperiment} completed candidates had no Experiment`,
      terminal.duplicateExperimentIds > 0 && `${terminal.duplicateExperimentIds} duplicate Experiment IDs were observed`,
      maxObservedInFlight > maxInFlight && `Observed ${maxObservedInFlight} in flight above maxInFlight ${maxInFlight}`,
    ].filter(Boolean);
    if (failures.length > 0) throw new Error(`Benchmark correctness gate failed: ${failures.join("; ")}`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ status: result.status, outputPath, measurements: result.measurements, terminal: result.terminal }, null, 2));
  } catch (error) {
    const result = { schemaVersion: 1, status: "FAILED", startedAt, finishedAt: new Date().toISOString(), commit, error: error instanceof Error ? error.message : String(error), baseUrl, candidateCount, maxInFlight, workerReplicas, workerConcurrency, lastStatus };
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.error(JSON.stringify({ status: result.status, outputPath, error: result.error }, null, 2));
    process.exitCode = 1;
  }
}

await main();
