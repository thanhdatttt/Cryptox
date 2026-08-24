import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { composeAllModules } from "./compose";

async function bootstrap(): Promise<void> {
  composeAllModules();
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
  console.log("backend skeleton ready");
}

void bootstrap();
