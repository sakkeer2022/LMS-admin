# Shared UI

Import from `@/components/ui` or an individual component module. Implementations live in individual PascalCase files; `index.ts` only re-exports them. Generic UI must not import features or contain role-specific business rules.

- `Button.tsx`: native attributes and refs, variants, sizes, pending/disabled states. Defaults to `type="button"`; forms explicitly use `type="submit"` or SubmitButton.
- `Link.tsx`: Next.js router links and ButtonLink; external URLs use native anchors, with noopener/noreferrer for new tabs.
- Input, Textarea, Select, Checkbox and Label each have their own module.
- TextField, PasswordField and SelectField each have their own module: associated labels, generated IDs, descriptions, errors, required/disabled states. FieldFrame holds related composition helpers.
- Form, FormError and SubmitButton each have their own module. The application uses FormData and feature-owned Zod schemas. Native refs, names, values and event handlers pass through unchanged.
- `Typography.tsx`, `Card.tsx`, `Badge.tsx`, `Spinner.tsx`: semantic text, surfaces and status styling.
- `Typography.tsx`: the single text primitive. `<Typography variant="h1" | "h2" | … | "body2" | "caption" | "overline" | "inherit" tone="default" | "muted" | "danger" | "success" | "warning" component="…">`. `variant` sets the look and the default element (h1–h6 → headings, subtitle/body → `p`, caption/overline → `span`); `component` changes the element without changing the look (`<Typography variant="h3" component="h2">`). Props and `ref` are typed for the rendered element. Sizes come from the `--typography-*` tokens in `ui.css`; the classes sit in the `components` cascade layer, so a `className` (app class or Tailwind utility) always overrides them. `Heading` and `Text` remain as deprecated aliases.
- `Accordion.tsx`: Disclosure and Accordion use native details/summary keyboard interaction and expanded semantics.
- `Tabs.tsx`: labelled tablist, roving focus, ArrowLeft/ArrowRight/Home/End navigation, disabled tabs and associated panels. Items require unique IDs.
- `Modal.tsx`: controlled open/onClose, required title, placement (center, left, right, top, bottom), and dismissOnBackdrop. Native modal dialog isolation, explicit Tab wrapping, Escape, close action, focus restoration and scroll locking. Its parent must update open when onClose fires.

Shared styles live in `ui.css`; palette and shell layout live in `app/globals.css`. Use variants instead of repeating control styling in features. Existing dashboard/table compositions remain in `dashboard-ui.tsx`.

Admin layout pieces and typed navigation live in `components/layout/admin/`. The server tenant layout authorizes the session and renders server page children through the persistent PortalShell. Admin URLs retain tenant scope: `/admin/[tenantId]/...`. `/admin` selects the first authorized tenant and redirects to its dashboard; the tenant root also redirects to dashboard. Categories and progress retain `/categories` and `/progress`. Existing `/audit` remains directly accessible. Unknown tenant-admin paths use the nested not-found page.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Lint enforces shared native-control boundaries rather than a general ESLint ruleset. `npm run test:browser` covers production navigation, auth/form contracts, desktop/mobile layout and shell persistence. `npm run test:interactions` mounts isolated shared components with Vite and tests modal and keyboard behavior. Browser tests require Playwright via local installation or PLAYWRIGHT_MODULE_PATH, and default to installed Edge (PLAYWRIGHT_CHANNEL overrides). They use test-only signed sessions and stub responses, not live accounts. Fixtures under tests are never application routes.
