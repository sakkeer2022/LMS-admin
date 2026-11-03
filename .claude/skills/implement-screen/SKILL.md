---
name: implement-screen
description: Build a screen from an Amentorz Figma frame end to end, including the backend, contract, test and doc work the screen implies. Use whenever the user shares a Figma link for a page or asks to implement, restyle or wire a screen.
---

A screen is not done when it looks right. Work through all of this, and report any step you skipped.

1. **Read the design.** `create_session` with the file key, then `get_design_context` and `get_variable_defs` for the node. Take every colour, spacing, radius and font from the design. Never guess a value. Download assets with `curl -L` into `public/`; the Figma URLs expire after 7 days.
2. **Reuse before writing.** Check `src/components/ui`, `AGENT_GUIDE.md` and `amentorz-backend/SHARED_COMPONENTS.md`. Native `input`, `button`, `label`, `form` and headings live only in `components/ui` (the UI lint enforces it). Scope Figma tokens to the screen unless the user says the whole app adopts them.
3. **Find what the screen implies.** For each field, button, link and state in the frame, name the backend endpoint it needs and look for it in `amentorz-backend/docs/openapi.yaml`. A control with no contract field (a checkbox, a filter, a column) is a backend change: say so, and make it in the same branch name (contract first, via `docs/build-contract-draft.py`, then DTO, service, test). Never ship a control that does nothing, and never send a field the API rejects.
4. **Respect the rules.** No tenancy or tenantId. India and UAE rules in `REGIONS.md` (no hard-coded country, currency, dial code or time zone). All money in INR. No demo or temporary data in a finished screen; if the real endpoint is missing, say so instead.
5. **Wire it.** Calls go through `src/lib/api/client.ts` (same-origin `/api/v1`, CSRF, refresh). Validate input with zod. Handle loading, empty, error and permission-denied states even if the frame shows only one.
6. **Accessibility and responsive.** Labels, `aria-invalid`, error text tied to fields, focus order, keyboard use. Check it at phone width, since frames are usually desktop only.
7. **Verify.** `npm run typecheck`, `npm run lint`, the affected unit tests, and `npm run build`. Update the browser test in `tests/browser` for changed flows. Say plainly what you could not run (for example Playwright or the live backend).
8. **Document and commit.** Update `README.md`/`AGENT_GUIDE.md` when behaviour or routes change. Conventional commit, `Refs: LMS-<n>`, no AI attribution. Ask before pushing.
