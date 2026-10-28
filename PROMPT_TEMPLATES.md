# Copy-paste scaffolding prompts

## Add a portal shell

```text
Read AGENT_GUIDE.md, BACKEND_ANALYSIS.md, src/app/README.md, and existing portal layouts.
Add a portal named [NAME], with visible URL prefix [PREFIX], roles [ROLES], and navigation [ITEMS].
Create a route-group presentation layout and a tenant layout using requirePortal and PermissionProvider.
Register roles/navigation in lib/auth/access.ts; update middleware matcher, portal typing, and home redirect priority.
Preserve redirect paths and fail closed for absent signed tenant membership. Do not bypass backend authorization.
Do not create colliding URLs or import another feature's internals. Use semantic, responsive navigation and Lucide icons.
Add focused negative access tests, run typecheck/tests/build, and document any backend contracts required.
```

## Scaffold a feature module

```text
Read AGENT_GUIDE.md and src/features/README.md. Implement [DOMAIN] against backend source [DTO/CONTROLLER PATHS].
Create api/, components/, types/, and schemas/. Match actual backend DTOs and Zod rules, including optional/null values.
Create a query-key factory including tenant ID and filters, typed TanStack Query hooks with abort signals, and mutations
using lib/api/client.ts. Preserve top-level pagination meta and field errors; invalidate the smallest affected query keys.
Use server-provided action capabilities for ABAC and Can/usePermission for base permissions. Include loading, empty,
failure and blocker states. No cross-feature imports and no SDK imports; use shared provider interfaces.
If an endpoint is missing, stop that integration at a clearly labeled extension contract; never simulate success.
Add meaningful tests for domain invariants, run typecheck/tests/build, and report integration limits.
```

## Add an admin table

```text
Read AGENT_GUIDE.md, BACKEND_ANALYSIS.md and the existing users table.
Add an admin table for [RESOURCE] using backend [ENDPOINT] with required permission [PERMISSION].
Use server pagination {page,limit,search} and response {success,message,data,meta:{page,limit,total,totalPages}}.
Confirm any additional filters/sort parameters against backend source before adding them. Keep filter state in the URL,
reset page when filters change, cancel obsolete fetches and include tenant/filter values in query keys.
Use semantic table headers/caption, accessible pagination, loading/empty/error states and row action capabilities.
Add a formula-safe CSV export for the current page labeled explicitly. For all matching records, use a permission-checked,
audited backend export job; do not pretend a current-page download is a complete export. Never use CSV bytes as XLSX.
Wrap moderation, financial and PII actions in explicit sensitive boundaries; enforcement and audit remain on the backend.
Verify forbidden access, pagination/filter behavior, escaping and error envelopes; run typecheck/tests/build.
```
