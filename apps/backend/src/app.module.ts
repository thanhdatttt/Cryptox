import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpCode, Inject, Module, Post, UnauthorizedException } from "@nestjs/common";
import { AuthException, type AuthModulePublicApi } from "modules/auth/api";
import { composeAllModules, type BackendModules } from "./compose";

export const BACKEND_MODULES = "BACKEND_MODULES";

const credentials = (body: { email?: unknown; password?: unknown }): { email: string; password: string } => {
  if (typeof body?.email !== "string" || typeof body?.password !== "string") throw new BadRequestException("email and password are required.");
  return { email: body.email, password: body.password };
};

const authHttpError = (error: unknown): never => {
  if (!(error instanceof AuthException)) throw error;
  if (error.code === "EMAIL_ALREADY_EXISTS") throw new ConflictException(error.message);
  if (error.code === "INVALID_CREDENTIALS" || error.code === "INVALID_TOKEN") throw new UnauthorizedException(error.message);
  throw new BadRequestException(error.message);
};

@Controller("health")
export class HealthController {
  @Get()
  health(): { status: string } { return { status: "ok" }; }
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(BACKEND_MODULES) private readonly modules: BackendModules) {}

  private get auth(): AuthModulePublicApi { return this.modules.auth; }

  @Post("register")
  async register(@Body() body: { email?: unknown; password?: unknown }): Promise<void> {
    try {
      const input = credentials(body);
      await this.auth.register(input.email, input.password);
    } catch (error) {
      authHttpError(error);
    }
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: { email?: unknown; password?: unknown }): Promise<{ token: string }> {
    try {
      const input = credentials(body);
      return await this.auth.login(input.email, input.password);
    } catch (error) {
      return authHttpError(error);
    }
  }

  @Get("me")
  async me(@Headers("authorization") authorization?: string): Promise<{ userId: string }> {
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException("Bearer token is required.");
    try {
      return await this.auth.verify(authorization.slice("Bearer ".length));
    } catch (error) {
      return authHttpError(error);
    }
  }
}

@Module({
  controllers: [HealthController, AuthController],
  providers: [{ provide: BACKEND_MODULES, useFactory: (): BackendModules => composeAllModules() }],
})
export class AppModule {}
