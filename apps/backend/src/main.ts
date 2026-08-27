import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { runtimeComposition, runtimeReadiness } from "./compose";

async function bootstrap(): Promise<void> {
  console.log("backend active modules", runtimeComposition.activeModules.join(","));
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
  console.log("backend process live; readiness", runtimeReadiness.status);
}

void bootstrap();
