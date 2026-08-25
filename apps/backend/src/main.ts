import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule, BACKEND_MODULES } from "./app.module";
import type { BackendModules } from "./compose";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.get<BackendModules>(BACKEND_MODULES).backtesting.reconcileQueue();
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
  console.log("backend ready");
}

void bootstrap();
