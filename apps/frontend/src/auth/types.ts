import type {
  AuthSessionResponseDto,
  AuthUserDto,
  CurrentUserResponseDto,
  LogoutResponseDto,
} from "@cryptox/contracts/rest";

export interface AuthCredentials {
  readonly email: string;
  readonly password: string;
}

export interface AuthClient {
  register(credentials: AuthCredentials): Promise<AuthSessionResponseDto>;
  login(credentials: AuthCredentials): Promise<AuthSessionResponseDto>;
  currentUser(): Promise<CurrentUserResponseDto>;
  logout(): Promise<LogoutResponseDto>;
}

export type AuthUser = AuthUserDto;
