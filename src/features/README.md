# Domain isolation

Every domain owns api/, components/, types/, and schemas/. auth and users are integrated against existing DTOs; bookings, discovery, sessions and earnings are extension scaffolds awaiting backend contracts.

Features may import their own files and shared lib/components. Cross-feature imports and imports from app are forbidden. Move a genuinely shared interface into lib; do not create a shared barrel of domain internals. App routes compose domain entry components.

To add a domain: inspect DTOs/controllers, define matching types and Zod input schemas, add tenant/filter query keys and abortable Query hooks, then build interactive components with explicit loading/error/empty states. Use api() and backend action capabilities; never invent endpoints. Permissions and tenant membership must be enforced server-side. Invalidate affected keys after mutations; clear private caches when identity or tenant changes.
