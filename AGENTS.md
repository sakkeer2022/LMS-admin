# AGENTS.md: agent and contributor rules

## amentorz-admin

The single source of truth for how people and AI agents work in this repository. Read it, then `README.md` and `AGENT_GUIDE.md`, before changing anything.

This repo is one of four: `amentorz-backend` (Express 5, Prisma 7, PostgreSQL API), `amentorz-admin` (this app, port 3001), `amentorz-student` (3002) and `amentorz-faculty` (3003). There is no tenancy: the backend never issues tenant IDs and no tenant ID is ever used in a URL, query key or claim.

## Rules

### Git

- Branches are `<type>/LMS-<n>-<description>` (`feature`, `bugfix`, `hotfix`, `release`), created from `development` (`main` until `development` exists in this repo). A ticket that touches several repos uses the same branch name in each.
- Commits use Conventional Commits and end with a `Refs: LMS-<n>` footer.
- **Never add a `Co-Authored-By` trailer or any other AI attribution** to commits or pull requests.
- Never push to `main` or `development` directly, and never force-push. Update an already-pushed branch by merging `development` into it.
- Ask before pushing, merging, running database migrations or seeds, or changing Jira.

### Secrets and documents

- Do not read or commit `.env` files. Use `.env.example` as the reference.
- Do not put text from the signed scope of work (SOW) in the repository.

### Tickets and tests

- One sub-task per complete module, with the backend and the frontend work together. Keep the ticket count low; do not split by layer or by endpoint.
- Do not run the full test suite repeatedly: CI runs it on every pull request. After a change, run the typecheck and the affected tests once.

### Product

- The UI design is final. A change must not alter what a screen shows or collects. If it would, raise it as a pending decision (`amentorz-backend/docs/PENDING_DECISIONS.md`) instead.
- Theme, tokens and components come from the approved design. Do not invent styles.
- India (`IN`) and the UAE (`AE`) are both in scope. Never hard-code a country, dialling code, time zone, currency or age rule; follow `amentorz-backend/src/docs/REGIONS.md`. All money is INR.
- Check `src/components/shadcn`, `src/components/layout` and `src/lib` before writing a helper or a component, and reuse what exists.
- Do not start the LMS-99 email and OTP work without asking.

## Engineering

- TypeScript strict; no `any`. Validate every external input with Zod. Match the backend contract (`amentorz-backend/docs/openapi.yaml`); do not invent endpoints or error codes.
- Read the existing code before adding to it; follow the surrounding style.
- Never log tokens, passwords or personal data. Authentication state is decided by the backend (`GET /auth/me`); this app holds no signing secret.
- Run `npm run typecheck` and the affected tests (`npx vitest run <file>`), and `npm run build` for routing changes.
