---
name: amentorz-ui-standards
description: Amentorz UI/UX standards for every frontend task in amentorz-admin, amentorz-faculty and amentorz-student. Use whenever you create or change a page, component, form, dialog, drawer, table, layout or responsive behaviour, or restyle a screen. It fixes the visual identity (Manrope, purple tokens, 6px radius), the shadcn/ui-first and reuse-first rules, form and dialog patterns, responsive and accessibility rules. Do not use for backend-only work.
---

# Amentorz UI standards

The user should not have to repeat "follow the existing look, reuse components, prefer shadcn/ui, stay responsive". Those are the defaults, and this skill is how. Everything below was read from the three frontend repos; where a convention is not settled it says **undetermined**. Do not fill such a gap with a guess: pick the nearest existing pattern and tell the user.

Related rules that stay in force: each repo's `AGENTS.md` (git, secrets, regions, "the UI design is final"), and the `implement-screen` skill when a Figma frame is involved. This skill covers how things look and behave; it does not replace them.

## Before writing any UI

1. **Say which portal** the work is for (admin, faculty, student) and open the repo's `src/app/globals.css`. Tokens are per repo; the three files are almost the same (see `references/design-system.md`).
2. **Search for what exists** before creating anything: `src/components/shadcn`, `forms`, `layout`, `auth`, `data-table` and the feature folder you are in. Check `references/component-inventory.md` for the list and for what is copied between repos.
3. **Pick the nearest existing screen** that does a similar job and copy its structure, spacing and states.
4. If a Figma frame exists, follow `implement-screen` (read the node, check the frame against our system, never guess a value).

## Mandatory principles

- **Look like the rest of the app.** Manrope, the token colours, 6px control radius, the existing button, input, badge and card styles. A new screen must read as part of the same product. Do not redesign a component to suit a feature.
- **Reuse, then extend, then create.** Use the existing component with its variants. Extend it (a prop, a variant) if it nearly fits. Create a new one only when nothing fits, and place it where the matching ones live. Never add a second component that does the same job with slightly different styling.
- **shadcn/ui first.** When a suitable shadcn primitive exists, use it; see `references/shadcn-guidelines.md` for what is installed, how to add more and the known exceptions.
- **Tokens, not values.** Colours, radii, shadows and the type scale come from `globals.css` token classes (`bg-primary`, `text-muted-foreground`, `border-border-subtle`, `bg-success-subtle text-success-foreground`, `rounded-card`). A missing value is added to `globals.css` from Figma (`get_variable_defs`), never written as a hex in a component.
- **Every state exists.** Loading (Skeleton), empty (`EmptyState`), error (inline message with a retry), disabled, pending (button text changes, control disabled) and, for admin, permission-denied. The frame usually shows only one; build all.
- **Responsive and accessible by default**, not as a final pass. See `references/responsive-and-accessibility.md`.
- **Do not change what a screen shows or collects** without raising it as a pending decision (repo rule: the UI design is final).

## Forms and dialogs (short form; details in `references/forms-and-dialogs.md`)

- Label above the control, `*` (aria-hidden, `text-error-foreground`) for required, hint `text-xs text-muted-foreground`, error text under the control in `text-error-foreground` and tied to it with `aria-describedby` and `aria-invalid`.
- One column on phones, `sm:grid-cols-2` for short paired fields, `gap-4` between a pair and `gap-5` between rows.
- Dropdowns: the shadcn `Select`, wrapped in a labelled field. Admin forms use the native-select wrapper today; keep to the pattern of the portal you are in (see the exceptions list).
- Dialogs use the shadcn `Dialog`; student popups use `AppDialog` (560px, `wide` 720px). Destructive or irreversible actions get a confirmation (`ConfirmDialog` in admin). Long edit forms in admin open in a `Sheet`.
- A dialog or sheet never exceeds the viewport: it scrolls inside, with header and footer fixed.

## Styling restrictions

- No hex, `rgb()` or arbitrary colour in components. (Existing exceptions are the brand panel `#18082f` and the student landing page; do not add more.)
- No inline `style` for look and feel; no duplicate CSS; no new CSS files, UI library, icon set or font. Icons are `lucide-react`; classes merge with `cn` from `@/lib/utils`.
- No gradients, extra shadows or decorative animation unless the frame shows them. Shadows in use: `shadow-card`, `shadow-xs`, `shadow-lg` (dialogs, popovers). Motion uses `tw-animate-css` classes behind `motion-safe:`.
- No random radii: controls `rounded-md`, chips and badges `rounded-pill`, cards `rounded-card`/`rounded-panel` where the repo defines them. Note `rounded-sm|md|lg|xl` are all 6px here.
- No one-off control heights: Input and default Button are `h-10`, large Button `h-12`, small `h-8`.

## Workflow

1. Read `AGENTS.md`, the nearest similar screen, then the relevant reference file.
2. List the components you will reuse and the new ones, with the reason for each new one.
3. Build with the tokens and states above; wire data through `src/lib/api/client.ts`.
4. Check at desktop (about 1440 px) and phone width (about 390 px); keyboard through the screen once; run the typecheck and the tests for the files you changed.
5. Say what you could not verify (browser, backend, other portal).

## Right and wrong

```tsx
// Right: tokens, existing components, labelled field, all inside the portal's patterns
<SelectField id="level" label="Class" value={v} onChange={setV} options={levels} error={errors.level} required />
<Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>

// Wrong: a hex, a custom radius, a hand-built dropdown, a second button style
<div style={{ background: "#913d95", borderRadius: 10 }}>
  <select className="rounded-[10px] h-11 border-[#ccc]">…</select>
  <button className="bg-purple-600 px-5 py-2.5 rounded-lg shadow-xl">Save</button>
</div>
```

```tsx
// Right: a popup that fits small screens (AppDialog caps width at the viewport and scrolls inside)
<AppDialog open={open} onClose={close} title="Guardian review and consent" wide footer={<Button>Sign and Continue</Button>}>…</AppDialog>

// Wrong: a fixed-width fixed-position panel that overflows a phone
<div className="fixed left-1/2 top-20 w-[720px] -translate-x-1/2 bg-white">…</div>
```

## Keeping this accurate

- Never document or use a colour, font, component or package that is not in the repo. When something here no longer matches the code, fix the reference file, not the code.
- When a portal differs from the others, record the difference (the references list the known ones) instead of forcing sameness.
- When you introduce a convention that other screens should follow, add it to the matching reference file in the same change.
- **Undetermined, ask before deciding:** a searchable select/combobox (no `Command` or `Popover` installed), a toast convention for the student portal (none exists), dark theme (none), and whether `Form` from shadcn with react-hook-form should be used (it is not installed and barely used).
