# Multi-portal frontend starter

Next.js App Router baseline aligned with the adjacent Express RBAC service. Read [backend findings](BACKEND_ANALYSIS.md), [architecture and directory blueprint](AGENT_GUIDE.md), and [copy-paste prompts](PROMPT_TEMPLATES.md).

## Run

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
# Set JWT_SECRET to exactly match the backend access-token secret (32+ characters).
npm run dev
```

Frontend runs on http://localhost:3001; backend defaults to http://127.0.0.1:3000. The Next /api/v1 rewrite keeps cookies same-origin. Restart after changing gateway configuration. Never expose secrets with NEXT_PUBLIC_.

```powershell
npm run typecheck
npm test
npm run build
```

The landing page and auth pages render immediately. Backend integration requires a running PostgreSQL/Redis service and backend startup fixes described in BACKEND_ANALYSIS.md. Tenant portals intentionally deny access until the backend adds signed tenantIds membership claims and tenant resource authorization. Password auth exists; OTP, guardian consent and marketplace operations are explicit extension screens.

The scaffold generator is retained as scaffold.cjs for traceability. It was used once to create route skeletons; do not rerun it over customized pages because it overwrites generated files.

Next 15 was selected to implement the requested Edge middleware.ts convention. Official references: [Next 15 middleware](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware), [route groups](https://nextjs.org/docs/15/app/api-reference/file-conventions/route-groups). This is a high-level baseline, with deployment/integration work called out in the architecture guide.

## Reference dashboard UI

The shared shell and admin dashboard now use the Amentorz visual system. See [UI implementation and adapter contract](UI_IMPLEMENTATION.md) for fixtures, URL filters, state testing, theme configuration and integration limitations.
