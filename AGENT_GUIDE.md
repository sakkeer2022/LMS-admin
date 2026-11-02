# Admin portal: architecture guide

## Stack

Next.js 15.5 (App Router, Edge middleware), React 19, TypeScript 5.9 strict, Tailwind CSS 4, TanStack Query 5, Zod 4, Lucide, Sonner, Vitest 4. `package-lock.json` pins the versions. The admin runs on port 3001.

## Layout

```text
src/
  middleware.ts                  edge gate: access cookie present, else /login?redirect=...
  app/
    layout.tsx, providers.tsx, globals.css, error.tsx, loading.tsx, page.tsx
    (auth)/login, recovery
    (admin)/admin/layout.tsx     requireAdmin + PermissionProvider + AdminLayout
      dashboard/ users/ audit/ reports/ account/ [section]/ [...unknown]/
    access-denied/
  components/
    layout/ (portal-shell, admin/*)  security/ (permission-provider, sensitive-boundary)
    feedback/  ui/ (shared components)
  features/{auth,users,dashboard}/{api,components,types,schemas}
  lib/auth/{access,server,portal-config}.ts   lib/api/{client,contracts}.ts
  lib/currency/inr.ts  lib/exports/download.ts
tests/
```

Dependency direction: app -> features -> lib/components. Features cannot import other features or app routes; shared components cannot import features; lib cannot import app or features. Files are kebab-case, components PascalCase, `@/` for shared code.

## Server and client rules

Pages and layouts are Server Components by default; add `'use client'` only to interactive leaves, hooks and providers. `lib/auth/server.ts` imports `server-only`. QueryClient is created per mounted provider. Authenticated server fetches use `cache: 'no-store'`. Clear the query cache on login, logout and identity change. Never persist private query data in browser storage.

## Auth

- The backend sets HttpOnly `accessToken` and `refreshToken` cookies; the browser never reads them. The default transport is the same-origin `/api/v1` rewrite in `next.config.ts`. The refresh cookie is scoped to `/api/v1/auth`.
- Login is `POST /auth/admin/login`. Every unsafe request first gets a CSRF token (`GET /auth/csrf-token`) and sends it as `x-csrf-token`; `lib/api/client.ts` does this.
- A 401 triggers one refresh (`POST /auth/refresh`, serialized with Web Locks) and one retry. The login page also tries a silent refresh when it has a `redirect` target.
- Sign-in state is decided by the backend: `requireAdmin` calls `GET /auth/me` with the access cookie and requires an active user with the `admin` role (the backend shows `super_admin` as `admin`). This app holds no JWT secret and never decodes or trusts a token itself.
- Permissions for `Can`/`usePermission` come from the user's roles in `/auth/me`; they only hide controls. The backend enforces every action.
- Sensitive actions (settings changes and others the contract marks "recent reauthentication required") need `POST /auth/reauthenticate` first; the backend answers 403 "Recent re-authentication required" when the session is not fresh. Reuse the password field in a modal.

## Backend contract

The source of truth is `amentorz-backend/docs/openapi.yaml`. Responses use `{ success, message, data, meta? }` or `{ success: false, message, errors?, traceId? }`; validation failures are 422 with field errors; 429 carries `Retry-After`. Do not invent endpoints or error codes; mark missing endpoints as extensions.

## Shared UI is mandatory

Use the components in `src/components/ui` (Button, TextField, PasswordField, SelectField, Form, FormError, SubmitButton, Typography, Card, Badge and the dashboard table, pagination, filter and panel patterns). Do not rebuild native buttons, inputs, selects or labels in pages. Use variants and sizes, not local visual overrides. Edit `src/components/ui/ui.css` for component styles and `src/app/globals.css` for tokens and layout. The UI design is final: a change must not alter what a screen shows or collects.

## Dates, currency and exports

Timestamps are ISO with an offset; display in the user's IANA time zone. Money is integer paise (INR for every country). CSV exports neutralize spreadsheet formulas and cover the visible page only; whole-dataset exports are backend jobs.

## Checks

`npm run typecheck`, `npm test`, `npm run build`. CI runs them on every pull request.
