# Frontend Starter: agent and developer guide

## Purpose and stack

This is a modular frontend for one unified backend, with independent operations, provider, consumer, and live-session shells. It is an engineering baseline, not a completed marketplace. Unsupported workflows are visibly marked extensions.

The dependency baseline is Next.js 15.5 (App Router and Edge middleware), React 19, TypeScript 5.9 strict mode, Tailwind CSS 4, Lucide React, TanStack Query 5, Zod 4, jose 6, Sonner 2, and Vitest 4. package-lock.json records resolved versions. Next 15 is intentional to preserve the requested src/middleware.ts convention; migrating to Next 16 requires reviewing proxy.ts and runtime changes. Check supported releases and advisories before deployment.

## Directory blueprint

```text
frontend/
  AGENT_GUIDE.md
  BACKEND_ANALYSIS.md
  PROMPT_TEMPLATES.md
  README.md
  .env.example
  src/
    middleware.ts
    app/
      README.md
      layout.tsx, providers.tsx, globals.css, error.tsx, loading.tsx
      page.tsx, access-denied/page.tsx
      (auth)/layout.tsx
        login/, register/, account/, otp/, recovery/, consent/
      (admin)/layout.tsx
        admin/[tenantId]/layout.tsx, page.tsx
          users/, audit/, reports/
      (faculty)/layout.tsx
        faculty/[tenantId]/layout.tsx, page.tsx
          availability/, bookings/, logs/, earnings/
      (student)/layout.tsx
        student/[tenantId]/layout.tsx, page.tsx
          bookings/, reports/
      (session)/layout.tsx
        session/[tenantId]/layout.tsx
          [sessionId]/page.tsx
    components/
      layout/portal-shell.tsx
      security/permission-provider.tsx, sensitive-boundary.tsx
      feedback/banner-provider.tsx
      ui/README.md, extension-panel.tsx, pdf-viewer.tsx
    features/
      README.md
      auth/{api,components,types,schemas}/
      users/{api,components,types,schemas}/
      bookings/{api,components,types,schemas}/
      discovery/{api,components,types,schemas}/
      sessions/{api,components,types,schemas}/
      earnings/{api,components,types,schemas}/
    lib/
      auth/access.ts, jwt.ts, server.ts
      api/client.ts, contracts.ts
      providers/README.md, video.tsx, payment.tsx
      date/slots.ts, use-countdown.ts
      currency/inr.ts
      exports/download.ts
  tests/security.test.ts
```

## File and import conventions

Use kebab-case files, PascalCase React components and types, camelCase functions. Route files follow Next conventions. Prefer direct imports; do not introduce broad barrel exports that pull server modules into client bundles. Use @/ for shared code and relative imports within a feature. Type-only imports use import type.

The dependency direction is app -> features -> lib/components. Features cannot import other features or app routes. Shared components cannot import features. lib cannot import app or features. Move shared contracts into lib only when multiple domains actually use them. Business decisions belong to backend services, not components or SDK adapters.

## Server and client rules

Pages and layouts are Server Components by default. Add 'use client' only to interactive leaves, hooks and context providers. Never import server.ts, process secrets, database clients, or privileged SDK credentials into a client component. server.ts imports server-only. Do not put JWT_SECRET in NEXT_PUBLIC variables. Never decode a token and treat it as verified.

Server-rendered authenticated fetches use cache: 'no-store'. QueryClient is created per mounted provider, never shared across server requests. Cache keys include tenant and filters; clear the cache on login, logout, identity change, and tenant switching. Do not persist private query caches to browser storage.

## Auth and security contracts

The default transport is the backend's HttpOnly cookie flow, through a same-origin /api/v1 rewrite. The access cookie is not accessible to JavaScript; the browser injects credentials automatically. Server fetches can inject Authorization from the verified cookie. Do not add localStorage token handling or assume login returns tokens in JSON.

Login/register first acquire a signed double-submit CSRF cookie with GET /auth/csrf-token. Every unsafe request sends x-csrf-token. Refresh uses the same protection. The refresh cookie remains scoped to /api/v1/auth. Preserve this path in deployment. Web Locks serialize refresh across tabs where supported; the in-memory promise coalesces concurrent 401s within a tab. A refresh failure terminates the attempt; requests retry once. Older browsers without Web Locks need a distributed coordination strategy before multi-tab refresh is supported. Mutations have no automatic retries in Query.

Middleware pins HS256, validates signature, expiration and claim shape, preserves redirect paths and checks portal roles plus signed tenant membership. It cannot check Redis revocation or resource ABAC. Tenant layouts also call /auth/me to check current account activity/revocation. Backend endpoints remain the authority for every action. Role changes may remain stale until token expiry/refresh; define an invalidation policy in the backend.

Can/usePermission mirror the backend's exact, wildcard and resource-manage checks. They intentionally do not equate users with user or audit_logs with audit. For conditional ABAC actions require a server capability result via serverAuthorized; never infer ownership/tenant authorization from browser data. SensitiveBoundary is a deliberate disclosure/review step, not reauthentication. Financial changes, moderation and PII access need backend enforcement and audit events. Never log tokens, payment credentials or PII to the console.

## Multi-tenant boundary

Routes use /{portal}/{tenantId}/...; the group name is absent from URLs. tenantIds is an explicit proposed signed-claim extension, not an existing backend field. Until the backend provides membership claims, all tenant portal routes deny access. Do not add a bypass to make demos work.

The current users endpoint is platform-global and is labeled that way in the admin table. Adding a tenant to a cache key or URL does not filter database rows. Before tenant production use, implement membership verification, tenant predicates on every repository query, resource ownership checks, tenant-aware audit/export jobs, and cross-tenant negative integration tests in the backend. Session routes additionally require participant authorization; portal membership alone does not authorize joining a session.

## Adding a portal

Register a unique visible prefix, navigation and roles in lib/auth/access.ts. Add app/(portal)/layout.tsx for presentation and app/(portal)/portal/[tenantId]/layout.tsx for requirePortal plus PermissionProvider. Update middleware matching and portal union, including homeFor redirect priority. Keep route prefixes unique; two route groups cannot both own the same URL. Verify wrong-role, missing-membership, forged-token, expired-token and redirect behavior. Responsive navigation, focus states and skip targets are required.

## Adding a feature

### Shared UI is mandatory

Use the actual React components in `src/components/ui/primitives.tsx` and the complete fields in `src/components/ui/form.tsx` throughout application routes, features, layouts and provider wrappers. Do not reconstruct native buttons, inputs, selects, labels, field help/errors or form submission markup in pages. Use Button/ButtonLink, TextField/PasswordField/SelectField, Form/FormError/SubmitButton, Typography (variants/tones instead of local font-size or colour classes), Card/Badge, and the composed dashboard table, pagination, filter and panel patterns. Use variants and sizes rather than local visual overrides. Ordinary paragraphs, links, table rows/cells, fieldset/legend groups and layout containers may remain semantic HTML. Native controls belong only in the approved shared implementations; vendor-owned controls are allowed only inside documented SDK mount boundaries.

Fields forward native refs, names, events, values, constraints, disabled/read-only state and accessibility attributes. They support `...register('name')` from React Hook Form without depending on that library; the current auth feature retains its existing FormData and Zod submission flow. Keep business schemas and backend error mapping in the feature. Never introduce a second form library just to style a form. Use complete field composition for required markers, help text and validation errors, with unique IDs and associated descriptions. Number/date inputs can use TextField's native type when needed; do not invent unused domain fields.

Edit `src/components/ui/ui.css` for global button variants, input/field composition, typography, spacing, focus, borders and radii. Edit `src/app/globals.css` for application light/dark color tokens and responsive application layout. Local classes may position components but must not override their shared visual properties. Update the shared component first when a new pattern repeats.

Run `npm run lint` (component-boundary architectural lint), `npm run typecheck`, `npm test`, and `npm run build`. Browser regression instructions and documented native-markup exceptions are in `src/components/ui/README.md`. Do not rerun `scaffold.cjs`: its legacy raw markup is not an approved source for new screens and it can overwrite customized code.

Create src/features/{domain}/{api,components,types,schemas}. Read backend source DTO/controller/service before writing contracts; swagger prose may lag implementation. Provide tenant-scoped query keys, abort signals and explicit pagination types. Use api() for JSON requests. Keep top-level envelope metadata intact. Match backend validation, including differences between registration and admin user creation. Mark missing endpoints as extensions rather than inventing successful API responses.

## SDKs and hardware

Wrap video in a VideoAdapter and payments in a CheckoutAdapter under lib/providers. Features consume interfaces only. Adapters own vendor lifecycle, device listeners, reconnect policy, cancellation and cleanup. Memoize adapter instances. Never mount a vendor SDK in route/layout code. Backend issues short-lived room credentials after participant checks. Stop all MediaStream tracks and detach listeners on teardown. Request device permissions after a user action. Do not capture on the client; payment pending must remain pending until authoritative confirmation.

## Dates, currency and reports

Transport ISO timestamps with explicit offsets, store instants in UTC, and display an IANA zone. Ambiguous local/DST input requires an explicit scheduling policy on the backend. Countdown derives from backend endsAt; the default business duration can be 20 minutes. The one-hour cutoff is a UI hint; the server rechecks it under concurrency.

Money uses integer paise; rates use basis points. INR/GST/TDS helpers illustrate exclusive tax displays, not tax eligibility or invoicing policy. Backend calculations are authoritative. CSV escapes quotes/newlines and neutralizes spreadsheet formula cells. The example exports the visible page only. Whole-dataset CSV/XLSX/PDF exports require permission-checked backend jobs. Never rename CSV bytes to .xlsx. Download large reports using a streaming endpoint or short-lived authorized URL; the included blob helper buffers smaller reports. Serve PDFs inline with authorization; browser PDF controls provide print/download.

## Rules of engagement for AI

1. Inspect the backend contract and BACKEND_ANALYSIS.md first. Do not modify backend security behavior silently.
2. Respect the dependency direction. No cross-feature imports, vendor SDK imports in features, or secrets in client code.
3. Distinguish implemented adapters from extension points. Never fabricate endpoints, tenant claims, permissions, session success or captured payments.
4. Add routes only with explicit portal access and tenant enforcement. Keep navigation and route group layout responsibilities separate.
5. Use the shared HTTP client, error envelope, permissions, time/currency utilities and provider interfaces.
6. Enforce privileged actions on the backend and audit there. UI visibility does not grant access.
7. Run npm run typecheck, npm test and npm run build for substantive changes. Add meaningful negative tests for new authorization paths. Do not claim live backend/SDK validation without performing it.
8. Use accessible names, semantic forms/tables/dialogs, focus restoration, empty/loading/error states and clear blocker messages.

## Deployment work remaining

Configure HTTPS, server-only secrets, exact backend origins and trusted proxy handling; retain per-client rate limits/fingerprints through the gateway. Select SDK-specific CSP/frame/connect permissions rather than enabling arbitrary origins. Enable HSTS at the HTTPS ingress. Confirm cookie forwarding, signing and refresh rotation in integration tests with PostgreSQL/Redis. Resolve backend route/seed permission mismatches and missing upload module before expecting an end-to-end backend build. No compliance certification is implied by this scaffold.
