import { describe, expect, it } from "vitest";
import { averageCompletedAttemptDurationMs } from "./service";

describe("averageCompletedAttemptDurationMs", () => {
  it("averages only completed attempts with valid execution timestamps", () => {
    expect(averageCompletedAttemptDurationMs([
      { attemptId: "one", attemptNumber: 1, status: "COMPLETED", startedAt: "2025-01-01T00:00:00.000Z", completedAt: "2025-01-01T00:00:01.000Z" },
      { attemptId: "two", attemptNumber: 2, status: "COMPLETED", startedAt: "2025-01-01T00:00:02.000Z", completedAt: "2025-01-01T00:00:05.000Z" },
      { attemptId: "retry", attemptNumber: 3, status: "FAILED", startedAt: "2025-01-01T00:00:00.000Z", completedAt: "2025-01-01T00:01:00.000Z" },
      { attemptId: "running", attemptNumber: 4, status: "RUNNING", startedAt: "2025-01-01T00:00:00.000Z" },
    ])).toBe(2_000);
  });

  it("returns null when no completed attempt has a valid non-negative duration", () => {
    expect(averageCompletedAttemptDurationMs([
      { attemptId: "failed", attemptNumber: 1, status: "FAILED", startedAt: "2025-01-01T00:00:00.000Z", completedAt: "2025-01-01T00:00:01.000Z" },
      { attemptId: "missing", attemptNumber: 2, status: "COMPLETED", startedAt: "2025-01-01T00:00:00.000Z" },
      { attemptId: "invalid", attemptNumber: 3, status: "COMPLETED", startedAt: "not-a-date", completedAt: "2025-01-01T00:00:01.000Z" },
      { attemptId: "negative", attemptNumber: 4, status: "COMPLETED", startedAt: "2025-01-01T00:00:02.000Z", completedAt: "2025-01-01T00:00:01.000Z" },
    ])).toBeNull();
  });
});
