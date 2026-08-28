import { Controller, Get, HttpCode, HttpStatus, Inject, Module, OnApplicationShutdown } from "@nestjs/common";
import { runtimeReadiness, type RuntimeReadiness } from "./compose";
import { AuthController } from "./auth.controller";
import { AUTH_RUNTIME_TOKEN, createBackendAuthRuntime, type BackendAuthRuntime } from "./auth.runtime";

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

@Module({
  controllers: [HealthController, AuthController],
  providers: [
    {
      provide: AUTH_RUNTIME_TOKEN,
      useFactory: createBackendAuthRuntime,
    },
  ],
})
export class AppModule implements OnApplicationShutdown {
  public constructor(
    @Inject(AUTH_RUNTIME_TOKEN) private readonly authRuntime: BackendAuthRuntime,
  ) {}

  public async onApplicationShutdown(): Promise<void> {
    await this.authRuntime.close();
  }
}
