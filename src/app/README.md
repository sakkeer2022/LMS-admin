# Folder routing and shells

Parenthesized route groups isolate layouts but do not contribute URL segments. Distinct visible prefixes prevent collisions:

| Group | URL | Shell |
|---|---|---|
| (auth) | /login, /register, /account, /otp, /recovery, /consent | Narrow authentication canvas |
| (admin) | /admin/[tenantId]/... | Dense operations navigation |
| (faculty) | /faculty/[tenantId]/... | Provider workflows |
| (student) | /student/[tenantId]/... | Discovery and consumption |
| (session) | /session/[tenantId]/[sessionId] | Full-screen session canvas |

Group layouts own presentation. The nested [tenantId] layouts call requirePortal because parent group layouts do not receive child dynamic parameters. All protected shells supply PermissionProvider using verified JWT grants, including inherited permissions. Navigation lives in lib/auth/access.ts. Session rendering has no dashboard sidebar.

Pages/layouts remain Server Components; put hooks in client leaf components. Keep the root Providers narrowly focused on Query, banners and toasts. error.tsx and loading.tsx provide route fallbacks. Add a portal by following AGENT_GUIDE.md and updating middleware coverage, role mapping, tenant checks and home redirects. Never create two group pages with the same visible URL.
