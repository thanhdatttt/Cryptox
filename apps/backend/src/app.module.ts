import { Controller, Get, HttpStatus, Inject, Module, OnApplicationShutdown, Optional, Res } from "@nestjs/common";
import { runtimeReadiness, type RuntimeReadiness } from "./compose";
import { AuthController } from "./auth.controller";
import { AUTH_RUNTIME_TOKEN } from "./auth.runtime";
import { CapabilitiesController } from "./capabilities.controller";
import {
  BACKEND_RUNTIME_TOKEN,
  createBackendRuntime,
  type BackendRuntime,
} from "./runtime";

interface HealthResponse {
  status(code: number): HealthResponse;
}

@Controller()
export class HealthController {
  public constructor(
    @Optional() @Inject(BACKEND_RUNTIME_TOKEN) private readonly runtime?: Pick<BackendRuntime, "readiness">,
  ) {}

  @Get("live")
  live(): { status: "live" } {
    return { status: "live" };
  }

  @Get("ready")
  ready(@Res({ passthrough: true }) response?: HealthResponse): RuntimeReadiness {
    const readiness = this.runtime?.readiness() ?? runtimeReadiness;
    response?.status(readiness.status === "ready" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return readiness;
  }
}

@Module({
  controllers: [HealthController, AuthController, CapabilitiesController],
  providers: [
    {
      provide: BACKEND_RUNTIME_TOKEN,
      useFactory: createBackendRuntime,
    },
    {
      provide: AUTH_RUNTIME_TOKEN,
      useExisting: BACKEND_RUNTIME_TOKEN,
    },
  ],
})
export class AppModule implements OnApplicationShutdown {
  public constructor(
    @Inject(BACKEND_RUNTIME_TOKEN) private readonly runtime: BackendRuntime,
  ) {}

  public async onApplicationShutdown(): Promise<void> {
    await this.runtime.close();
  }
}
