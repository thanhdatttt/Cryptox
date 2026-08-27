# Authentication Capability

## Purpose and boundary

Auth owns simple local User credentials, Argon2id password verification,
PostgreSQL-backed opaque sessions, expiry/revocation, and conversion of an incoming
session cookie into trusted authenticated identity. It does not own roles, tenants,
external identity, or another business module's resources.

## Requirements

### Requirement: Simple local Authentication

The capability MUST support email/password registration, login, current
authenticated-user lookup, fixed session expiry, and logout. Normalized email MUST
be unique and passwords MUST be stored only as Argon2id hashes.

Traceability: `CSL-R-AU-01`, `CSL-R-RD-01`; ADR-008.

### Requirement: Opaque server-side session

Auth MUST issue a cryptographically random opaque token, persist only a secure
token digest in PostgreSQL, and enforce a fixed 24-hour absolute expiry with no
sliding renewal or refresh token. Logout MUST invalidate/revoke the server-side
session.

Traceability: `CSL-R-AU-01`; ADR-008.

### Requirement: Trusted authenticated identity

Private capabilities MUST receive authenticated User identity from trusted server
request context separately from client DTOs. Missing or invalid Authentication
MUST reject private access with 401. Client-supplied `userId` or `ownerUserId` MUST
NOT establish authority.

Traceability: `CSL-R-AU-01`, `CSL-R-OW-01`; ADR-008.

## Approved behavior and invariants

- Minimum User data is ID, normalized email, password hash, and created/updated timestamps.
- Minimum AuthSession data is ID, User ID, token digest, creation time, expiration time, and optional revocation time.
- The cookie is HttpOnly, `SameSite=Lax`, `Path=/`, and has no Domain attribute. HTTPS/deployed operation uses `Secure=true` and a host-only cookie name where practical; localhost HTTP may disable `Secure`.
- Login throttling is recommended hardening, not an instructor-required MVP acceptance blocker.
- Auth MUST NOT add JWT/refresh tokens, roles/RBAC, organization/team or tenant hierarchy, OAuth/SSO, 2FA, email verification, password reset, billing, or enterprise IAM.
- Passwords, raw credentials, cookies, raw session tokens, and token digests MUST NOT appear in logs.

## Executable public API and status

No approved Auth executable public surface exists yet. C-01A owns the additive
Auth module/API, application-port, REST DTO, and contract-test freeze. Runtime
behavior and persistence follow in AU-01; this specification does not authorize
either during A-00.

## Failure expectations

- Duplicate normalized email is rejected without creating a second User.
- Invalid credentials return one generic failure and do not disclose whether an email exists.
- Invalid, expired, or revoked sessions do not resolve an authenticated user.
- Logout is idempotent from the caller's unauthenticated end state.
- Auth persistence failure is observable and does not produce a fabricated identity.

## Acceptance scenarios

#### Scenario: User registers and obtains a real session

- **Given** a valid unique normalized email and password
- **When** registration completes against PostgreSQL
- **Then** the User and secure session digest are persisted and current-user lookup resolves that User

#### Scenario: Login and logout use server-side state

- **Given** a registered User with valid credentials
- **When** the User logs in and later logs out
- **Then** login creates an expiring opaque session and logout prevents further use of it

#### Scenario: Client identity cannot authenticate

- **Given** a request containing a client-selected `userId` without a valid session
- **When** it calls a private capability
- **Then** the request is rejected with 401 and the supplied identity is ignored

#### Scenario: Session expires absolutely

- **Given** a valid session older than its fixed 24-hour lifetime
- **When** it is resolved
- **Then** no authenticated identity is returned and the session is not renewed
