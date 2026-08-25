import "reflect-metadata";
import { composeWorkerModules } from "./compose";

async function bootstrap(): Promise<void> {
  const modules = composeWorkerModules();
  await modules.backtesting.reconcileQueue();
  const worker = modules.start();
  await worker.waitUntilReady();
  console.log("backtest worker ready");
  const stop = async (): Promise<void> => { await worker.close(); process.exit(0); };
  process.once("SIGINT", () => { void stop(); });
  process.once("SIGTERM", () => { void stop(); });
}

void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
