# Folder routing and shells

Parenthesized route groups isolate layouts but do not contribute URL segments.

| Group | URL | Shell |
|---|---|---|
| (auth) | /login, /recovery | Narrow authentication canvas |
| (admin) | /admin/... | Dense operations navigation |

`/` redirects to `/admin/dashboard`. The edge middleware only checks that an access cookie exists and keeps the full destination for sign-in. The admin layout calls `requireAdmin` (`lib/auth/server.ts`), which asks the backend (`GET /auth/me`) who is signed in, requires the admin role and supplies `PermissionProvider` with the user's permissions.

Pages/layouts remain Server Components; put hooks in client leaf components. Keep the root Providers narrowly focused on Query, banners and toasts. error.tsx and loading.tsx provide route fallbacks. Never create two group pages with the same visible URL.
