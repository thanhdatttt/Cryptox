export interface Clock {
  now(): string;
}

export interface BacktestExecutionRequest {
  candidateId: string;
}

export type BacktestExecutionState =
  | "ACCEPTED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface BacktestExecutionCapacity {
  maximum: number;
  active: number;
  available: number;
}

export interface BacktestExecutionStatus {
  candidateId: string;
  state: BacktestExecutionState;
}

export type BacktestTerminalOutcome<TResult> =
  | {
      candidateId: string;
      state: "SUCCEEDED";
      result: TResult;
      completedAt: string;
    }
  | {
      candidateId: string;
      state: "FAILED";
      failure: { code: "RUNNER_FAILED"; message: string };
      completedAt: string;
    }
  | {
      candidateId: string;
      state: "CANCELLED";
      completedAt: string;
    };

export type BacktestSubmission<TResult> =
  | {
      accepted: true;
      candidateId: string;
      status: "ACCEPTED";
      outcome: Promise<BacktestTerminalOutcome<TResult>>;
    }
  | {
      accepted: false;
      candidateId: string;
      status: "SATURATED";
      capacity: BacktestExecutionCapacity;
    };

export interface BacktestExecutionPort<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  submit(request: TRequest): Promise<BacktestSubmission<TResult>>;
  capacity(): Promise<BacktestExecutionCapacity>;
  status(candidateId: string): Promise<BacktestExecutionStatus | undefined>;
  cancel(candidateId: string): Promise<boolean>;
}

export interface BacktestRunner<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  run(request: TRequest, signal: AbortSignal): Promise<TResult>;
}

export interface BacktestingModuleDependencies {
  execution?: BacktestExecutionPort;
  marketData?: unknown;
  strategy?: unknown;
  evaluation?: unknown;
  leaderboard?: unknown;
  sentiment?: unknown;
  repositories?: Record<string, unknown>;
  clock?: Clock;
}
