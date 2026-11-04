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
    (admin)/admin/layout.tsx     requireAdmin + PermissionProvider + AdminShell
      dashboard/ users/ settings/ audit/ reports/ profile/ [section]/ [...unknown]/
    access-denied/
  components/
    shadcn/ (primitives)  layout/ (admin-shell, sidebar-nav, topbar, page-header, empty-state)
    data-table/  auth/  settings/  security/ (permission-provider, sensitive-boundary)  feedback/
  features/{auth,users,dashboard,profile,settings}/{api,components,types,schemas}
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

## Shared UI

The UI is shadcn/ui on Tailwind CSS v4. Style with Tailwind utilities and the token classes from `src/app/globals.css` (`bg-primary`, `text-muted-foreground`, `border-border-subtle`, `bg-accent`, status pairs such as `bg-success-subtle text-success-foreground`). The tokens are the Figma "Webapplication" foundations; take new values from Figma (`get_variable_defs`), never invent a colour, radius or font size, and add a token to `globals.css` instead of repeating a hex value.

- Primitives: `src/components/shadcn` (add more with `npx shadcn@latest add <name>`; `components.json` points there). Use their variants and sizes before adding classes.
- Page structure: `PageHeader`, `EmptyState` and `PanelMessage` in `src/components/layout`; the shell is `admin-shell.tsx` (sidebar, mobile drawer, top bar).
- Tables: `DataTable` (TanStack Table) and `TablePagination` in `src/components/data-table`. Define columns as `ColumnDef[]`; use `meta: { align: "right" }` for numeric columns.
- Auth screens: `src/components/auth`. Settings-style rows, forms and dialogs: `src/components/settings/setting-layout.tsx`.
- Pages with no backend yet render `EmptyState`; do not build static placeholder screens.

The UI design is final: a change must not alter what a screen shows or collects.

## Dates, currency and exports

Timestamps are ISO with an offset; display in the user's IANA time zone. Money is integer paise (INR for every country). CSV exports neutralize spreadsheet formulas and cover the visible page only; whole-dataset exports are backend jobs.

## Checks

`npm run typecheck`, `npm test`, `npm run build`. CI runs them on every pull request.
