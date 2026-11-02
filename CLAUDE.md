# CLAUDE.md: Claude Code instructions

## amentorz-admin

> **First action:** read `AGENTS.md` (the rules, which apply to you in full), then `README.md` and `AGENT_GUIDE.md`.

## Claude-specific

- Read a file with `Read` before editing it. Use `Grep` to find existing patterns first.
- Prefer small, reviewable changes. Show the plan before a large change and wait for approval before pushing.
- Verify with `npm run typecheck` and the affected tests before saying something works; say plainly what you did not run.
- The memory of this project is keyed to the `amentorz main` folder: work cross-repo tickets from a session started there.
- Reference Figma by node through the Figma tools (`get_variable_defs`, `get_design_context`); never guess a colour, spacing or font.
