# Backend analysis: source of truth

Inspected workspace source on 2026-10-21. Source paths below are relative to ../backend. No backend files were modified.

## Architecture

Express 5 modular monolith with strict TypeScript, PostgreSQL/Prisma 7, Redis, BullMQ, Pino, OpenTelemetry, Prometheus, and Zod 4. Modules separate routes, controllers (parse/serialize), services (business/data operations), and DTOs. Infrastructure owns database, cache and queues; core owns security, errors, context and response formatting. app.ts mounts security, rate limits, parsing, CSRF, logging, metrics, routers, then error handling. routes/index.ts mounts the unified /api/v1 service modules. Swagger is development/test-only.

## Authentication: implemented behavior

- Source: modules/auth/auth.routes.ts, auth.controller.ts, auth.service.ts, auth.dto.ts; core/security/jwt.ts; middleware/authenticate.ts and csrf.ts.
- POST /auth/register requires email, password, firstName, lastName. Email lowercases. Password requires 12 characters, upper/lowercase, number and symbol; names have 1..100 length then trimming. Admin CreateUserDto instead uses an 8-character minimum and different rules; do not share these validators blindly.
- POST /auth/login accepts email/password. bcrypt uses cost 12. Login checks active/soft-deleted accounts and temporary lockout; records security events and detects impossible travel.
- Actual login/register JSON is {success:true,message,data:{user}}. Controller sets accessToken and refreshToken HttpOnly SameSite=Strict cookies, Secure in production. Swagger token-response prose is stale.
- Access cookie path is /. Refresh cookie path is /api/v1/auth and controller max age is hard-coded seven days even though service expiry is configurable.
- Access claims: sub, email, roles, permissions, policies, jti, iat, exp. Signing uses jsonwebtoken's HMAC default (HS256). Existing issuer/audience claims are absent. Separate access and refresh secrets are used. Middleware verifies tokens and checks Redis bl:{jti} revocation. Cookie authentication takes precedence over Authorization: Bearer.
- POST /auth/refresh rotates refresh tokens and cookies; JSON data is null. Refresh tokens are SHA-256 hashed in PostgreSQL with used/expiry/device context. Service attempts replay handling and device-fingerprint checks; impossible-travel suspension can block refresh. Replay revocation durability should be reviewed: throwing inside the database transaction may roll back deletion of refresh-token rows.
- POST /auth/logout revokes tokens and clears cookies. GET /auth/me returns a user profile, not JWT claims. Its nested role permissions do not fully represent resolved inherited policies; frontend guards use verified access claims.
- GET /auth/sessions, DELETE /auth/sessions/:jti, DELETE /auth/sessions support session management.
- GET /auth/csrf-token returns data.csrfToken and sets signed HttpOnly _csrf. All unsafe /api/v1 methods require the matching x-csrf-token, including login/register/refresh/logout. Webhook is excluded.
- OTP login, recovery, guardian consent, tenant memberships and portal provisioning have no implemented auth endpoints. Registration does not automatically assign a portal role.

## Authorization and compatibility findings

Dynamic many-to-many roles and permissions, role parent inheritance, and policies are resolved into tokens. requireRole is deprecated; route middleware prefers requirePermission. Exact grants match literally. Global '*' and 'admin.*' grant everything. A resource '*' or 'manage' grant matches across dot/colon separators but resource names must still match. Conditional ABAC rules support $eq, $in, $isSubset and user.* substitutions; matching policy evaluation requires backend-loaded resources.

Seed roles are super_admin, admin and viewer. Faculty/provider/student/client roles in this frontend are proposed portal mappings and require provisioning. Viewer maps only to the consumer shell; it still needs tenant membership. Admin portal role does not itself grant user.read.

**Important existing mismatch:** prisma/seed.ts creates users:*, roles:*, permissions:* and audit_logs:* permissions. User routes require user.read/create/update/delete/assign_role; roles use role.*; permissions use permission.*; audit uses audit.read. The middleware does not singularize resource names. Seeded super_admin gets resource manage grants, not the global wildcard; it therefore does not automatically pass these singular guards. admin.read/admin.write are also required by admin routes but absent from the seed. Resolve these in the backend before expecting seeded accounts to access those APIs. Frontend intentionally mirrors denial rather than introducing aliases.

No Tenant model or tenant field exists in prisma/schema.prisma. Policy code mentioning tenantId is an example capability, not implemented isolation. A frontend tenant ID, URL, header or query-key namespace cannot scope backend data. The scaffold requires a proposed tenantIds signed claim and denies tenant routes until it exists. The users table is explicitly platform-global; do not expose it to tenant administrators without a backend scoped endpoint.

## Endpoints and conventions

Default API prefix is /api/v1. routes/index.ts mounts auth, users, roles, permissions, audit, feature-flags, notifications, stripe, admin and uploads. CRUD modules generally use GET list/detail, POST create, PATCH update, DELETE delete. Role assignment uses /users/:id/roles with POST/PUT/DELETE; permission assignment uses /roles/:id/permissions. Audit is read-only in the exposed router. Notifications expose list/detail/create/update/delete. Admin includes stats/health, user unlock, and PUT /admin/users/:id/active controls. The Stripe route is a webhook, not an order/checkout API.

routes/index.ts references modules/uploads/uploads.routes.ts, which is absent in the inspected source inventory. This is an independent backend startup/build gap. The frontend does not implement an upload route to conceal it.

Paginated DTO: page integer >=1 (default 1), limit 1..100 (default 20), optional trimmed search. Service uses offset/take and descending createdAt for users. Pagination response is a flat data array plus top-level meta, not data.items. No generic client-supplied sort/filter contract should be assumed. Audit may use additional module-specific filters; inspect its DTO before adding controls.

## Response and error schema

Source: core/response/index.ts, middleware/errorHandler.ts.

```ts
type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };
type Success<T> = { success: true; message: string; data: T; meta?: PaginationMeta };
type Failure = { success: false; message: string; errors?: Record<string, string[]>; traceId?: string };
```

Zod failures are HTTP 422, message 'Validation failed', with dotted field-path errors. Operational errors use their status. Unknown/system failures are masked in production and use a trace reference. Internal error codes, severity, retryable and root cause exist in AppError/logs but are not included in the HTTP error envelope. Never depend on an invented error.code response. Handle 401 refresh, 403 access/CSRF denial, 409 conflicts, 422 field validation, 429 throttling and 5xx service failures separately. Do not automatically retry writes after an ambiguous network failure.

## Gateway and infrastructure concerns

Same-origin Next rewrite avoids cross-site cookie/CORS differences and preserves /api/v1/auth cookie scope. Ingress must forward Set-Cookie, trust only configured proxy headers and preserve per-client IP/device context. Backend development CORS currently combines '*' origin with credentials; direct browser cross-origin calls will not work reliably with that combination. Production requires exact allowed origins. Backend applies 100kb body limits, Helmet and Redis-based rate limiting. Choose explicit production gateway timeouts and body/export streaming limits.

## Frontend delivery status

Implemented: contract-aligned password auth forms/validators, CSRF, cookie transport, queued refresh, JWT verification, portal/tenant checks, Can/usePermission, sensitive review boundary, banners, users pagination/search/current-page CSV, provider interfaces, time/countdown, INR/tax display, PDF viewer, report download helpers, guides and tests.

Extension scaffolds: OTP/recovery/consent, discovery facets, booking drawer/slot reservation, daily-log submission and blockers, moderation/dispute workflows, audit table, earnings/incentives, report generation, SDK-specific session mounting/payment checkout and backend capture reconciliation. Provider adapter skeletons are not live integrations. The PDF/XLSX helper downloads backend-produced documents; it does not generate those formats. Large-file streaming requires backend/ingress integration. See AGENT_GUIDE.md for activation rules.
