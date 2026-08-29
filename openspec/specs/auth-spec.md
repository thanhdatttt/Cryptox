# Spec: Auth Module (`modules/auth`)

## 1. Overview

### Purpose

A lightweight authentication module providing simple username/password registration and login, hashed password storage (bcrypt), and stateless JWT session tokens. The module is intentionally minimal – no OAuth, SSO, MFA, or refresh‑token store – suitable for an MVP/academic project.

Authentication is also the ownership root for user-created Strategy Definitions,
Composite Definitions, Leaderboard Scopes, Search Runs, and derived Backtesting
and Experiment reads. Protected handlers derive an `AuthContext` from the
verified token; request-body owner fields are never authorization evidence.

### Scope

In scope:
- Register a new user (`POST /auth/register`).
- Login a user (`POST /auth/login`) and receive a signed JWT (`HS256`, 1 h expiry).
- Verify a JWT on any request (`GET /auth/me`).
- Password reset via a time‑bound email token (optional, not required for core MVP).

Out of scope:
- SSO/OAuth, API‑key management, granular RBAC, MFA, token rotation, or any third‑party identity provider.

## 2. Requirements

### Functional requirements
| ID | Requirement |
|---|---|
| FR‑1 | `register(email, password)` stores a new user with a bcrypt hash; duplicate email returns 409.
| FR‑2 | `login(email, password)` validates the bcrypt hash and returns a JWT `{ sub: userId, iat, exp }`.
| FR‑3 | `verify(token)` validates signature, expiry and extracts `sub` (userId). Invalid tokens return 401.
| FR‑4 | All protected endpoints must reject requests lacking a valid JWT with 401.
| FR‑5 | Protected module commands and queries receive `AuthContext { userId }`; an authenticated request for another owner’s object is concealed as 404.
| FR‑6 | Owner-aware aggregates use owner-leading uniqueness and lookup indexes; derived resources authorize through immutable parent chains.

### Business rules
- Email addresses are unique (`users.email UNIQUE`).
- Passwords are never stored in plain text; only bcrypt hash is persisted.
- JWT secret is a static server‑side secret defined in configuration.
- Ownership is checked in application repositories before returning or mutating a user-owned aggregate. A supplied `userId` in a body is rejected or ignored.
- Same-owner composition is mandatory: composites, scopes, Search Runs, Candidates, Experiments, and rankings cannot mix owners.

## 3. Behavior

### 3.1 Registration flow
```
User -> POST /auth/register { email, password }
Backend -> bcrypt.hash(password)
Backend -> INSERT users (email, password_hash)
Backend -> 201 Created
```
If the email already exists the DB unique constraint triggers a 409 Conflict.

### 3.2 Login flow
```
User -> POST /auth/login { email, password }
Backend -> SELECT password_hash FROM users WHERE email = ?
Backend -> bcrypt.compare(password, hash)
Backend -> sign JWT (HS256) with payload { sub: userId, iat, exp: now+1h }
Backend -> 200 OK { token }
```
Invalid credentials return 401.

### 3.3 JWT verification (middleware)
```
Authorization: Bearer <token>
verify(token) -> check signature & expiry
extract sub -> req.auth = { userId: sub }
```
Missing or invalid token aborts request with 401.

Every protected REST handler passes the resulting `AuthContext` to the module
public API. Foreign or guessed IDs are returned as not-found so transport
responses do not disclose another user’s data.

## 4. Contracts

### Public runtime API (`modules/auth/api/index.ts`)
```typescript
export interface AuthModulePublicApi {
  register(email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<{ token: string }>;
  verify(token: string): Promise<{ userId: string }>;
}

export interface AuthContext { userId: string }
```

### Bootstrap facade (`modules/auth/api/bootstrap.ts`)
```typescript
export function createAuthModule(deps: {
  userRepository: UserRepository;
  jwtSecret: string;
}): AuthModulePublicApi;
```

### Data model (`users` table)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5. Constraints

- **Stateless JWT** – no server‑side session store.
- **HS256** signed with a secret configured in `apps/backend` env.
- **No refresh tokens** – clients re‑login after expiry.
- **No external identity providers** – pure username/password.
- **Ownership boundary** – JWT `sub` is the only request owner; derived-resource authorization follows immutable parent links.
- **Legacy data** – migration `013_backfill_legacy_owner.js` uses one explicit `legacy@local.invalid` user to backfill nullable legacy rows; fresh installations establish non-null ownership in migrations `003`–`005`.

## 6. Acceptance Criteria
- [ ] Register stores bcrypt hash, rejects duplicate email.
- [ ] Login returns a signed JWT that expires after 1 h.
- [ ] Protected endpoints reject missing/invalid JWT with 401.
- [ ] JWT payload contains `sub` equal to the `users.id`.
- [x] Protected application calls carry `{ userId }` from verified JWT state, not caller-supplied body data.
- [x] Foreign aggregate and derived-resource access is concealed as 404, while same-owner composition failures are validation errors.
