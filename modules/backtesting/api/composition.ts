import { BoundedLocalBacktestExecutor } from "../infrastructure/local/bounded-local-backtest-executor";
import type {
  BacktestExecutionPort,
  BacktestExecutionRequest,
  BacktestRunner,
  Clock,
} from "../application/ports";

export interface BoundedLocalBacktestExecutorOptions<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  readonly capacity: number;
  readonly runner: BacktestRunner<TRequest, TResult>;
  readonly clock?: Clock;
}

/**
 * Compose the approved MVP local executor without exposing its infrastructure
 * implementation to module consumers.
 */
export function createBoundedLocalBacktestExecutor<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
>(
  options: BoundedLocalBacktestExecutorOptions<TRequest, TResult>,
): BacktestExecutionPort<TRequest, TResult> {
  return new BoundedLocalBacktestExecutor({
    capacity: options.capacity,
    runner: options.runner,
    ...(options.clock === undefined ? {} : { clock: options.clock }),
  });
}
