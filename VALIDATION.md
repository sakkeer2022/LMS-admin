# Validation record

## Shared component refactor — 2026-10-22

- Component-boundary lint passed: raw buttons, inputs, selects, textareas, labels, summaries, headings and forms are confined to approved shared implementations. No legacy styling-only button/card classes remain in application JSX.
- TypeScript passed, including `--noUnusedLocals --noUnusedParameters`.
- 19 tests passed across five suites, including shared field associations, unique IDs, submission states and unchanged password contracts.
- Production build passed with Next 15.5.28.
- One complete headless Edge run against the production build passed for auth validation, backend 422 field errors/focus, pending disablement, CSRF headers, login/registration redirects, keyboard password reveal, account/recovery, dashboard filtering, table controls, drawer focus trapping and Escape, and mobile document overflow. Desktop/mobile auth and dashboard screenshots were inspected.
- Browser verification is not consistently green: another run remained on dashboard skeletons until timeout. The cause was not established. The runner now records browser connectivity/visibility and accessibility snapshots to support diagnosis. The latest diagnostic rerun was declined. Additional faculty-filter, settings/theme and shared-style-propagation assertions were added but have not completed successfully; do not claim those checks passed.
- Browser authentication responses and the server-side profile endpoint were controlled test fixtures. Protected admin routes used a signed test-only token. Production security checks were not bypassed or changed. No live backend, PostgreSQL/Redis, video/payment SDK, or real tenant provisioning was tested.
- The original sandbox blocked test/build filesystem writes; successful verification ran outside the sandbox. Playwright used installed Edge because bundled Chromium was unavailable.

## Earlier baseline

Validated on 2026-10-21 with Node 24.14.0 and npm 11.9.0.

- npm run typecheck: passed.
- npm test: 11 tests passed across API refresh/error contracts, middleware portal/tenant denial and redirects, JWT signature/expiry, permissions, time zones and money.
- npm run build: passed with Next 15.5.28; all routes generated and Edge middleware compiled. A webpack cache serialization performance notice is non-blocking. Narrow jose/jwt/verify import avoids unsupported JWE compression APIs in the Edge bundle.
- npm install audit after PostCSS override: zero reported vulnerabilities. package-lock.json records the dependency graph. overrides.postcss selects a patched release for Next's transitive dependency; retain build validation when updating this override.
- Production server smoke check: / and /login returned 200; /admin/acme/users?page=2 redirected to /login?redirect=%2Fadmin%2Facme%2Fusers%3Fpage%3D2.

No live backend, PostgreSQL, Redis, tenant membership provisioning, video SDK, payment gateway, capture/webhook reconciliation, or backend report endpoint was exercised. No browser visual/accessibility audit was performed. This record covers frontend checks and the local HTTP smoke test, not full platform acceptance.