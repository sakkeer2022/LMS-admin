Temporary admin preview

Run `npm run dev` and open http://localhost:3001/login. Sign in with username
`admin` and password `Admin@123`. The destination is `/admin/dev-admin/dashboard`,
using the existing tenant-scoped routing, sidebar, header, and page components.

`NEXT_PUBLIC_ENABLE_DEV_ADMIN_LOGIN=true` in `.env.local` enables this only under
`next dev`. Production ignores the flag. Restart Next.js after changing it.
Email/password authentication remains available for real accounts.

The session lives in sessionStorage for the current tab. Log out using the sidebar
button. No backend account, cookie, or token is created. The reserved preview
route renders a client-guarded shell; it must never contain privileged server data.
Dashboard and faculty demonstration adapters remain labelled as demonstration data.
Real API calls are blocked during this session; the users page shows an unavailable
state. Backend authorization is unchanged.

To disable, set the flag to false or remove it from `.env.local`, then restart.
To remove completely, remove `src/lib/auth/dev-admin.ts`, the development boundary,
their imports and call sites, the sign-in branch/hint, and the flag and tests.
