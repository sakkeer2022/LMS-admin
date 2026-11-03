# Amentorz admin

Admin portal for the Amentorz platform: Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, TanStack Query, Zod 4. There is no tenancy: one platform, one admin portal. Students and faculty have their own apps (`amentorz-student`, `amentorz-faculty`).

Read [AGENTS.md](AGENTS.md) (rules for every contributor and AI agent), [CLAUDE.md](CLAUDE.md) and [AGENT_GUIDE.md](AGENT_GUIDE.md) (architecture) before changing code.

## Run

```bash
npm ci
cp .env.example .env.local   # BACKEND_ORIGIN points at the API (default http://127.0.0.1:3000)
npm run dev                  # http://localhost:3001
```

The backend (`amentorz-backend`) must allow `http://localhost:3001` in `ALLOWED_ORIGINS` (the local default does). The Next `/api/v1` rewrite keeps the auth cookies same-origin.

```bash
npm run typecheck
npm test
npm run build
```

## Sign-in

`/login` signs in through `POST /auth/admin/login`. Only accounts with the admin role (the backend also lets `super_admin` in) reach `/admin/...`. The admin layout checks the session with `GET /auth/me` on the server; no secret is shared with the backend. `/admin/profile` is the admin's own profile (details, access, devices, activity; backed by `PUT /admin/me/profile` and `GET /admin/me/activity`). Forgot password (`/recovery`, Figma 427:4388, 427:4492, 427:29259) is one page with four steps: email, code, new password, done. It uses `POST /auth/recovery/requests`, `/verify` and `/reset`; the reset credential lives only in component state, never in a URL or storage. The code step has no frame yet (see the backend `docs/PENDING_DECISIONS.md`, P8). The profile's "Change password" opens a two-step dialog: the passwords first, then a code emailed to the account's own address (`POST /auth/password/requests`), sent with the passwords to `PUT /auth/password`. The backend ends every session, so it then goes to `/login`.

## UI

The dashboard and faculty directory use the development adapter in `src/features/dashboard/adapter.ts`; see [UI_IMPLEMENTATION.md](UI_IMPLEMENTATION.md). Shared components are in `src/components/ui`; see its README.
