# Interaction and list-screen patterns (admin)

The Students screen (`src/features/students/`) is the **reference implementation**. Every list screen (faculty, users, library, pricing, and anything new) should behave the same way. When in doubt, open that folder and copy its structure. Verified in a browser (desktop 1440px and phone 390px) before this was written.

Admin only for now. The shared pieces below live in the admin repo; copy them to faculty or student when those portals adopt a pattern, and note it in `component-inventory.md`.

## 1. Shared pieces to use (do not rebuild)

| Need | Use | Where |
|---|---|---|
| Copy an email, phone, ID or fingerprint | `CopyValue` (value + hover button) or `CopyButton` | `components/feedback/copy-button.tsx` |
| A keyboard key in an instruction | `Kbd` | `components/shadcn/kbd.tsx` |
| A status pill | `StatusBadge status="active|approved|completed|pending|processing|inactive|cancelled|rejected|failed"` | `components/feedback/status-badge.tsx` |
| Icon-only control explanation | `Tip` (tooltip wrapper; `label` may hold a `Kbd`) | `components/feedback/tip.tsx` |
| Initials circle with a stable tint | `PersonAvatar` (students, tutors, any named person) | `components/feedback/person-avatar.tsx` |
| Form that disables itself while saving; a spinner button; a dialog that cannot be closed mid-request | `Form`, `PendingButton`, `FormDialog` | `components/forms/` |
| Search box for a list (icon, clear button, `/` focuses, `Esc` clears) | `SearchInput` | `components/forms/search-input.tsx` |
| Removable active-filter pill | `FilterChip` inside `<ul aria-label="Active filters">` | `components/feedback/filter-chip.tsx` |
| Exact date + "3 days ago" | `formatDate`, `relativeDate` | `lib/format/dates.ts` |
| Table with loading line, fade-in rows, clickable rows, icon empty state | `DataTable` (`onRowClick`, `canClickRow`) | `components/data-table/data-table.tsx` |
| Empty panel with an icon | `EmptyState icon={...}` | `components/layout/empty-state.tsx` |
| Failed load with retry | `PanelMessage onRetry` | `components/layout/panel-message.tsx` |

## 2. Rules by theme

### Cursor and hover
- A pointer cursor on anything pressable is set **once, globally** in `globals.css` (buttons, tabs, options, menu items, checkboxes, switches, selects, `label[for]`). Disabled controls show `not-allowed` through the `Button` styles. Do not repeat `cursor-pointer` per component, **except** on non-button elements that act as buttons (a clickable `<tr>`, a `<div onClick>`): add `cursor-pointer` there, and prefer a real `<button>` inside so the row is keyboard reachable.
- Hover is a soft background (`hover:bg-accent/40` for rows and cards, `hover:bg-sunken` for outline buttons) with `transition-colors`; no layout shift, no scaling beyond the Button's `active:scale-[0.98]`.
- When you replace a `className` string, re-read what you removed. (A fade-in edit once dropped `cursor-pointer` from the Students rows.)

### Typography and hierarchy
- Name or primary value: `text-sm font-semibold`. Email, description, timestamp: `text-xs text-text-secondary` or `text-muted-foreground`. Hashes and reference IDs: `font-mono text-xs text-text-secondary`. Numbers and ages: `tabular-nums`.
- Table headers: `text-xs font-semibold tracking-wide uppercase text-text-secondary` on a `bg-sunken/60` header row.
- Dates: exact date in `text-text-secondary`, the relative form under it in `text-xs text-muted-foreground`. Money (when it arrives): right-aligned, `tabular-nums`, one currency format everywhere, negative values distinguished by sign and colour.
- Long names and emails: `truncate` plus `title={full value}` so nothing is lost.

### Copy to clipboard
- Add it only where an admin really reuses the value: email, phone, IDs, payment or booking references, file fingerprints. Not names, not every field.
- Shows on hover and on keyboard focus, always on touch (`pointer-coarse`). Click turns the icon into a check for 1.5 s, tooltip says "Copied". If the clipboard is refused, a `toast.error` says so. The button stops click propagation.
- Never put a `CopyButton` inside another button or a clickable row's button (invalid HTML). Use it in drawers and detail views; in tables only where the cell is not itself a button.

### Keyboard
- Show keys with `Kbd`, never as plain text or backticks in the UI.
- Shortcuts in use: `/` focuses the list search (ignored while typing in a field or in a dialog), `Esc` clears the search or closes a drawer or dialog, `K` and `J` step to the previous and next record in an open drawer. Add a shortcut only when it cannot clash with the browser or with typing; show it in a tooltip or as a `Kbd` hint next to the control it triggers. No global `Cmd+K`-style shortcuts until a command palette exists.

### Status badges
- Use `StatusBadge` and keep the **label** as the meaning; colour and an optional icon only reinforce it. Same status, same colour on every screen: active/approved/completed green, pending amber, processing blue, inactive/cancelled grey, rejected/failed red. Business statuses that are not in the table map to the closest tone; do not invent a new colour.
- Domain badges (for example `ConsentBadge`) wrap `StatusBadge`; they do not pick their own colours.

### Tooltips
- Every icon-only button gets `aria-label` **and** a `Tip`. Explain unfamiliar badges ("Minor": what it means). Disabled actions that need a reason get one. Do not add a tooltip that repeats the visible label.
- Radix tooltips need a `TooltipProvider` (admin provides it in `providers.tsx`; unit tests must wrap what they render).

### Loading, empty, error, success
- **Loading:** skeleton rows in the exact layout of real rows (same heights and columns), a one-line `role="status"` line with a spinner ("Loading students…"), real rows fade in (`motion-safe:animate-in fade-in-0`). Counts show a `Skeleton` until known. Only the part that loads is replaced, never the whole page. Keep previous rows while a new page or filter loads (`keepPreviousData`).
- **Empty:** `EmptyState` with an icon and one sentence on what to do next. A filtered empty list says "No … match" and offers Clear filters; an empty list says when data will appear.
- **Error:** plain sentence, `Try again` / `PanelMessage onRetry`. Never show raw API text, codes or stack traces.
- **Success:** a `toast.success` for saves and approvals; copying is confirmed in place by the check icon.
- Animations are short (150-300 ms), `motion-safe:` or `motion-reduce:transition-none`, and carry meaning (arrival of data, state change). None purely decorative.

## 2b. The listing standard (every list, current and future)

A listing is any screen that shows records in a table or card list. It must match Students in all of this, **before** it is called done:
- [ ] **Search.** A `SearchInput` in the toolbar (server-side where the API supports it; debounced 300 ms; a new search returns to page 1). A listing without search is a bug unless the API has none, and then the reason goes in `tests/listing-consistency.test.ts` EXCEPTIONS. That test fails if a listing feature has no `SearchInput`.
- [ ] **Toolbar.** `border-b border-border-subtle p-4`, search first (`sm:w-72`), then filters, "Clear filters" on the right, active filters as `FilterChip`s underneath. No card title or description above the table that repeats the page header (no "Onboarding queue" style headings).
- [ ] **Table and phone cards.** Use `DataTable`, never the raw `Table`. It is the table from `md` and a card list below it, so there is no phone layout to write: the first column becomes the card title, a column with a non-text header (the row menu) becomes the corner action, the rest become label and value pairs. Steer it with column `meta`: `mobile: "title" | "action" | "hide"`, `mobileHideWhen: (row) => boolean` to drop a field with nothing to show, or `renderCard` for a hand-made card (Students). Spacing is the standard: 20px at both ends of a row, 64px rows, 40px header band. Do not set your own row height or padding. Clamp long cell text (`line-clamp-2` plus `title`) so rows stay 64px.
- [ ] **Pagination.** `TablePagination` with `onLimit`, so rows per page (10, 20, 50; default 20) works the same everywhere. For URL-driven screens keep `limit` in the URL, and only accept 10, 20 or 50. Do not write a footer by hand.
- [ ] **Filters** are shadcn `Select`s with the "all" sentinel and an active style; no native selects in a toolbar.
- [ ] **Empty state** with an icon, a sentence, and "Clear filters" when filters or a search are active.
- [ ] **Row behaviour.** Clickable rows (`onRowClick`) get the pointer cursor, hover, the selected state while their drawer is open (`isRowSelected`), and a real button inside for the keyboard. Menus inside a row stop click propagation.
- [ ] **Loading** line plus skeleton rows, **error** with retry, **phone width** without page overflow.

**Two kinds of screen are not plain listings, and keep their own body but not their own chrome:**
- **An editing grid** (Pricing: checkboxes, inline price inputs, a bulk save bar). It keeps its own `Table` rows and scrolls sideways on a phone, because a card cannot hold a row of inputs. Everything around the body follows the standard: `SearchInput`, shadcn Select filters with chips, "Clear filters", header band, 64px rows, `StatusBadge`, `TablePagination` with `onLimit` and `limit` in the URL, icon empty state, loading line. It is the only entry in `OWN_TABLE` in the guard test.
- **A tree manager** (Catalogue): not paginated, so the table rules do not apply. It still uses `SearchInput`, `Kbd` for its keyboard help, `Tip` on icon-only row buttons, `StatusBadge`, icon `EmptyState`s with a next step, and icons on its main buttons.

When you change a shared listing piece (`DataTable`, `TablePagination`, `SearchInput`, `FilterChip`), check Students, Faculty and Users, because they all use it. When you build or change one listing, open Students next to it in the browser and compare spacing, not only behaviour.

## 3. List screen anatomy (copy from Students)

1. **`PageHeader`** with title and one-sentence description.
2. **Summary tiles** (`Stat` in `students-page.tsx`): an icon chip (`bg-accent text-primary`, amber when it flags a problem), label, value (`text-2xl font-bold`), hint, and an optional thin progress bar for a share of a whole (`role="progressbar"`). Each tile is a real `<button aria-pressed>` that doubles as a quick filter. Counts come from existing list endpoints (`limit: 1` and read `meta.total`); do not add metrics the API does not return.
3. **One `Card`** (`gap-0 overflow-hidden`) containing, top to bottom: filters, the list, the pagination bar.
4. **Filters** (`students-filters.tsx`): `SearchInput` (debounce the value in the page, 300 ms); the shadcn `Select` for each filter with a leading icon and an active style (`border-primary bg-accent/40`); removable chips for active filters; a "Clear filters" button. Any filter or search change returns to page 1. Search is debounced (300 ms).
5. **The list** (`students-table.tsx`, which is `DataTable` with a hand-made phone card; Faculty, Users, Library and the Dashboard use the same component with generated cards. It supplies the header band, loading line, fade-in, icon empty state, clickable and selected rows; wrap a row's menu in a `stopPropagation` div, because clicks inside a portaled menu still bubble to the row): from `md` a table, below `md` a card list showing the same facts. Fixed row height (`h-16`), the whole row clickable with the name also a real `<button>` (keyboard), selected row `data-state="selected"`, trailing `ChevronRight` icon button with a `Tip`. Keys are ids for data rows; skeleton rows use an index key.
6. **Pagination** (`students-pagination.tsx`; simple lists use the shared `TablePagination`, which has the same range, "Page x of y" and chevron buttons): "Showing a-b of n", rows per page (10/20/50, shadcn `Select`), "Page x of y", Previous/Next with chevrons.
7. **Detail drawer** (`student-sheet.tsx`): `Sheet` `sm:max-w-xl`. Header band (`bg-accent/40`) with avatar, name, copyable email, badges, previous/next buttons. Warnings first (amber banner for missing consent), then sections: an icon in a small accent square, a title, a label-above-value two-column `Facts` grid, `Empty` text when a section has nothing. Header shows the list row's name immediately while the detail loads. Load error: sentence plus Try again.
8. **Files and documents:** view and download go through `useWithReauth` and `apiBlob` (`lib/api/client.ts`), which sends the `x-portal` header and retries after a session refresh. Raw `fetch` to `/api/v1/...` fails with "Missing or invalid Authorization token". View in a `Dialog` with an `iframe` from a blob URL; revoke the URL on close.

## 4. shadcn and Radix details that bite

- **Dropdowns on list screens are the shadcn `Select`**, not the native one. Radix `Select` cannot hold an empty-string value, so "no filter" uses a sentinel (`ALL = "all"`) mapped back to `""` on change. `SelectValue` ignores `className`: style the `SelectTrigger`. Radix also renders a hidden `<select aria-hidden>`: a test that says "no `<select>` on the page" must check `data-slot="select-trigger"` instead. Plain forms keep the native `SelectField` until they are migrated (see `shadcn-guidelines.md`).
- Radix Select and dropdown items use `cursor-pointer` (changed from `cursor-default`).
- Tests use `renderToStaticMarkup` (no jsdom, no testing-library in admin). Assert on text with tags stripped when markup is split into spans.

## 4b. Error text and contract drift

- Never show a raw schema or API message. `describeApiError` turns a `ZodError` (a response that no longer matches the admin schema) into a plain sentence. When a drawer or list shows that sentence for one record, suspect that the backend and admin are on different branches (for example a backend change not merged locally) before changing the schema.
- A list or drawer that depends on a new backend field must be checked against the running backend, not only the unit tests.

## 5. Definition of done for a screen

Check each item and say which you could not check:
- [ ] Pointer cursor on every clickable thing; hover and keyboard-focus state visible; disabled looks disabled.
- [ ] Hierarchy: primary value strong, secondary muted, IDs mono, numbers tabular.
- [ ] Status shown with `StatusBadge`; labels unchanged.
- [ ] Icon-only buttons have `aria-label` and a tooltip.
- [ ] Copy buttons only where reuse is likely; none inside another button.
- [ ] Loading skeleton matches the layout; empty, error (with retry) and success feedback exist.
- [ ] Long text truncates with a title; no horizontal scroll at 390px; table has a card list below `md`.
- [ ] Keys shown with `Kbd`; no shortcut clashes.
- [ ] `motion-safe` / `motion-reduce` respected.
- [ ] Typecheck, unit tests, and (where a backend is up) one browser pass at 1440 and 390px.

## 6. Where the UX polish brief is covered

The admin UX polish brief (19 sections) maps to this skill as follows. "Not applicable" means the admin app has no such screen yet; apply the same pattern when it does.

| Brief section | Where covered |
|---|---|
| 1 Inspect first | `SKILL.md` "Before writing any UI" |
| 2 Typography and hierarchy | Section 2, Typography |
| 3 Copy to clipboard | Section 2, Copy to clipboard; `CopyValue` |
| 4 Hover and feedback | Section 2, Cursor and hover |
| 5 Keyboard shortcuts | Section 2, Keyboard; `Kbd` |
| 6 Status badges | Section 2, Status badges; `StatusBadge` |
| 7 Tables | Section 3 (list, pagination); Section 2 (dates, money, truncation) |
| 8 Forms | `forms-and-dialogs.md` (unchanged; Students has no form) |
| 9 Modals and drawers | Section 3 item 7 and `forms-and-dialogs.md`; unsaved-changes guard still to build when a form drawer needs it |
| 10 Loading, empty, error, success | Section 2 |
| 11 Dashboard cards and charts | Summary tiles (Section 3 item 2); charts not applicable yet |
| 12 Navigation and search | Search pattern (Section 3 item 4); sidebar not yet audited |
| 13 Tooltips | Section 2, Tooltips |
| 14 Animations | Section 2, Loading (short, reduced-motion safe) |
| 15 Icons | `lucide-react` only; leading icons on filters and section headings |
| 16 Accessibility and responsive | `responsive-and-accessibility.md`; this file's checklist |
| 17 Module-wide consistency | Rollout order: faculty, catalogue, library, pricing, legal, users, settings. Bookings, payments, payouts, reviews, reports: not applicable yet |
| 18 Implementation rules | Reuse first; no business logic, API or permission changes; dark theme is out of scope |
| 19 Plan first, approve, implement | Workflow: plan, one representative module, verify, then reuse |
