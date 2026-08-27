import { Controller, Get, HttpCode, HttpStatus, Module } from "@nestjs/common";
import { runtimeReadiness, type RuntimeReadiness } from "./compose";

@Controller()
export class HealthController {
  @Get("live")
  live(): { status: "live" } {
    return { status: "live" };
  }

  @Get("ready")
  @HttpCode(HttpStatus.SERVICE_UNAVAILABLE)
  ready(): RuntimeReadiness {
    return runtimeReadiness;
  }
}

@Module({ controllers: [HealthController] })
export class AppModule {}
