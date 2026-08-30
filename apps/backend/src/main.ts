import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { BACKEND_RUNTIME_TOKEN, attachBackendWebSocket, type BackendRuntime } from "./runtime";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const runtime = app.get<BackendRuntime>(BACKEND_RUNTIME_TOKEN);
  attachBackendWebSocket(runtime, app.getHttpServer());
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
  console.log("backend process live; readiness", runtime.readiness().status);
}

void bootstrap();
