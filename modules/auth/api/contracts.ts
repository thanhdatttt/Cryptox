declare const authenticatedUserIdBrand: unique symbol;

export type AuthenticatedUserId = string & {
  readonly [authenticatedUserIdBrand]: "AuthenticatedUserId";
};

export interface AuthenticatedRequestContext {
  authenticatedUserId: AuthenticatedUserId;
}

export interface AuthUser {
  id: AuthenticatedUserId;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterCommand {
  email: string;
  password: string;
}

export interface LoginCommand {
  email: string;
  password: string;
}

export interface AuthSessionGrant {
  user: AuthUser;
  opaqueToken: string;
  expiresAt: string;
}

export interface AuthenticatedSessionIdentity extends AuthenticatedRequestContext {
  sessionId: string;
  expiresAt: string;
}

export const AUTH_SESSION_V1 = {
  id: "AUTH_SESSION_V1",
  passwordHash: "ARGON2ID",
  sessionStorage: "POSTGRESQL_OPAQUE_TOKEN_DIGEST_ONLY",
  absoluteLifetimeHours: 24,
  slidingRenewal: false,
  refreshToken: false,
  cookie: {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    domain: "OMITTED",
    deployedHttpsSecure: true,
    localhostHttpSecureMayBeDisabled: true,
  },
} as const;

export const PRIVATE_RESOURCE_FAILURES = {
  unauthenticated: { code: "UNAUTHENTICATED", httpStatus: 401 },
  missingOrCrossUser: { code: "NOT_FOUND", httpStatus: 404 },
} as const;

export const PER_USER_OWNERSHIP_V1 = {
  id: "PER_USER_OWNERSHIP_V1",
  directRoots: [
    "StrategyDefinition",
    "CompositeDefinition",
    "SearchRun",
    "Candidate",
    "LeaderboardScope",
  ],
  inherited: {
    CompositeComponent: "CompositeDefinition",
    Experiment: "Candidate",
    Trade: "Experiment",
    EvaluationResult: "Experiment",
    LeaderboardEntry: "LeaderboardScope",
  },
  sharedSystemData: [
    "Candle",
    "MarketDatasetProvenance",
    "NewsItem",
    "SentimentResult",
    "RankingConfiguration",
    "StrategyPluginDescriptor",
  ],
  collectionFiltering: "OWNER_BEFORE_PAGINATION_AND_COUNTING",
  crossUserLookup: "NOT_FOUND",
  trustedIdentity: "AUTHENTICATED_REQUEST_CONTEXT_SEPARATE_FROM_CLIENT_DTO",
} as const;

export interface AuthModulePublicApi {
  register(command: RegisterCommand): Promise<AuthSessionGrant>;
  login(command: LoginCommand): Promise<AuthSessionGrant>;
  resolveSession(opaqueToken: string): Promise<AuthenticatedSessionIdentity | undefined>;
  currentUser(context: AuthenticatedRequestContext): Promise<AuthUser>;
  logout(opaqueToken: string): Promise<void>;
}
