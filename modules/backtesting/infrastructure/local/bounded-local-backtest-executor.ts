import type {
  BacktestExecutionCapacity,
  BacktestExecutionPort,
  BacktestExecutionRequest,
  BacktestExecutionState,
  BacktestExecutionStatus,
  BacktestRunner,
  BacktestSubmission,
  BacktestTerminalOutcome,
  Clock,
} from "../../application/ports";

interface ExecutionRecord<TResult> {
  candidateId: string;
  state: BacktestExecutionState;
  controller: AbortController;
  outcome: Promise<BacktestTerminalOutcome<TResult>>;
  resolveOutcome: (outcome: BacktestTerminalOutcome<TResult>) => void;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  failure?: { code: "RUNNER_FAILED"; message: string };
  terminalDelivered: boolean;
  slotReleased: boolean;
}

export interface BoundedLocalBacktestExecutorOptions<
  TRequest extends BacktestExecutionRequest,
  TResult,
> {
  capacity: number;
  runner: BacktestRunner<TRequest, TResult>;
  clock?: Clock;
}

export class BoundedLocalBacktestExecutor<
    TRequest extends BacktestExecutionRequest,
    TResult,
  >
  implements BacktestExecutionPort<TRequest, TResult>
{
  private readonly maximum: number;
  private readonly runner: BacktestRunner<TRequest, TResult>;
  private readonly clock: Clock;
  private readonly executions = new Map<string, ExecutionRecord<TResult>>();
  private active = 0;

  constructor(options: BoundedLocalBacktestExecutorOptions<TRequest, TResult>) {
    if (!Number.isInteger(options.capacity) || options.capacity < 1) {
      throw new RangeError("capacity must be a positive integer");
    }

    this.maximum = options.capacity;
    this.runner = options.runner;
    this.clock = options.clock ?? { now: () => new Date().toISOString() };
  }

  async submit(request: TRequest): Promise<BacktestSubmission<TResult>> {
    if (this.executions.has(request.candidateId)) {
      throw new Error(`execution already exists for candidate ${request.candidateId}`);
    }

    if (this.active >= this.maximum) {
      return {
        accepted: false,
        candidateId: request.candidateId,
        status: "SATURATED",
        capacity: this.capacitySnapshot(),
      };
    }

    let resolveOutcome!: (outcome: BacktestTerminalOutcome<TResult>) => void;
    const outcome = new Promise<BacktestTerminalOutcome<TResult>>((resolve) => {
      resolveOutcome = resolve;
    });
    const record: ExecutionRecord<TResult> = {
      candidateId: request.candidateId,
      state: "ACCEPTED",
      controller: new AbortController(),
      outcome,
      resolveOutcome,
      terminalDelivered: false,
      slotReleased: false,
    };

    this.executions.set(request.candidateId, record);
    this.active += 1;
    void this.run(record, request);

    return {
      accepted: true,
      candidateId: request.candidateId,
      status: "ACCEPTED",
      outcome,
    };
  }

  async capacity(): Promise<BacktestExecutionCapacity> {
    return this.capacitySnapshot();
  }

  async status(candidateId: string): Promise<BacktestExecutionStatus | undefined> {
    const record = this.executions.get(candidateId);
    return record
      ? {
          candidateId,
          state: record.state,
          ...(record.startedAt ? { startedAt: record.startedAt } : {}),
          ...(record.completedAt ? { completedAt: record.completedAt } : {}),
          ...(record.durationMs === undefined ? {} : { durationMs: record.durationMs }),
          ...(record.failure ? { failure: { ...record.failure } } : {}),
        }
      : undefined;
  }

  async cancel(candidateId: string): Promise<boolean> {
    const record = this.executions.get(candidateId);
    if (!record || this.isTerminal(record.state)) {
      return false;
    }

    record.controller.abort();
    this.deliverTerminal(record, {
      candidateId,
      state: "CANCELLED",
      completedAt: this.clock.now(),
    });
    return true;
  }

  private async run(record: ExecutionRecord<TResult>, request: TRequest): Promise<void> {
    record.state = "RUNNING";
    record.startedAt = this.clock.now();
    try {
      const result = await this.runner.run(request, record.controller.signal);
      this.deliverTerminal(record, {
        candidateId: request.candidateId,
        state: "SUCCEEDED",
        result,
        completedAt: this.clock.now(),
      });
    } catch (error) {
      this.deliverTerminal(record, {
        candidateId: request.candidateId,
        state: "FAILED",
        failure: {
          code: "RUNNER_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
        completedAt: this.clock.now(),
      });
    } finally {
      this.releaseSlot(record);
    }
  }

  private deliverTerminal(
    record: ExecutionRecord<TResult>,
    outcome: BacktestTerminalOutcome<TResult>,
  ): void {
    if (record.terminalDelivered) {
      return;
    }

    record.terminalDelivered = true;
    record.state = outcome.state;
    record.completedAt = outcome.completedAt;
    if (record.startedAt) {
      record.durationMs = Math.max(0, Date.parse(record.completedAt) - Date.parse(record.startedAt));
    }
    if (outcome.state === "FAILED") {
      record.failure = { ...outcome.failure };
    }
    record.resolveOutcome({
      ...outcome,
      ...(record.startedAt ? { startedAt: record.startedAt } : {}),
      ...(record.durationMs === undefined ? {} : { durationMs: record.durationMs }),
    });
  }

  private releaseSlot(record: ExecutionRecord<TResult>): void {
    if (record.slotReleased) {
      return;
    }

    record.slotReleased = true;
    this.active -= 1;
  }

  private capacitySnapshot(): BacktestExecutionCapacity {
    return {
      maximum: this.maximum,
      active: this.active,
      available: this.maximum - this.active,
    };
  }

  private isTerminal(state: BacktestExecutionState): boolean {
    return state === "SUCCEEDED" || state === "FAILED" || state === "CANCELLED";
  }
}
