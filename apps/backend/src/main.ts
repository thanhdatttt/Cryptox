import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule, BACKEND_MODULES } from "./app.module";
import type { BackendModules } from "./compose";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // The Vite frontend is a separate origin in local development and in Compose.
  // Authentication remains bearer-token based; no browser credentials are shared.
  app.enableCors({ origin: true, credentials: false });
  const modules = app.get<BackendModules>(BACKEND_MODULES);
  await modules.startRuntime();
  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().once("close", () => { void modules.stopRuntime(); });
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
  console.log("backend ready");
}

void bootstrap().catch((error) => {
  console.error("FATAL BOOTSTRAP ERROR:", error);
  process.exit(1);
});
