import { Controller, Get, Module } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health(): { status: string } {
    return { status: "ok" };
  }
}

@Module({ controllers: [HealthController] })
export class AppModule {}
