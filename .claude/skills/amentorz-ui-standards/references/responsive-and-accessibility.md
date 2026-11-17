# Responsive behaviour and accessibility

## Responsive

- **Mobile first.** Write the phone layout, then add `sm:` (640px) and `lg:` (1024px). `md:` and `xl:` are used rarely; arbitrary breakpoints (`min-[1480px]`) exist only in the student registration stepper and landing page. Do not add new ones without a reason.
- **Shell:** below `lg` the sidebar is a `Sheet` drawer opened from the top bar; from `lg` it is a sticky `w-60` column (admin and faculty can collapse to `w-16`). Page padding `p-4 sm:p-6 lg:p-8`, sections `gap-6`.
- **Auth and registration:** the brand panel is hidden below `lg`. From `lg` the page is one screen tall (`lg:h-dvh lg:overflow-hidden`): the panel keeps its size and only the form column scrolls (`AuthPage`). Below `lg` the whole page scrolls. Do not make the brand side depend on the form's height.
- **Grids:** `grid-cols-1` on phones, `sm:grid-cols-2` for pairs; wrap action rows with `flex-wrap`; `PageHeader` already wraps title and actions.
- **No fixed widths that exceed the screen.** Use `w-full max-w-*` or `min(…, 100vw - 2rem)`. Dialogs and sheets keep a side gutter and scroll inside; tables sit in a horizontally scrollable container (`DataTable` handles this); long text uses `min-w-0` and `truncate`.
- **Touch:** interactive targets are at least the size of the existing controls (buttons and inputs `h-10`, nav rows `h-11`); icon-only buttons use `size-8` or larger with an `aria-label`. Hover is never the only way to reach something (hover-revealed buttons such as `CopyValue` also show on keyboard focus and on touch screens).
- **Verify** at about 1440px and 390px (the admin screens were checked at those widths) and, for layouts with a `lg` switch, at 1024px.

## Accessibility

- **Semantics:** one `h1` per page (`PageHeader` / `AuthHeading`); `<main id="main">`; `<nav aria-label="…">`; ordered steps in an `<ol>` with `aria-current="step"` (`Stepper`); lists as `<ul>`; buttons for actions, links (`Link`, `Button asChild`) for navigation.
- **Skip link:** the root layout renders "Skip to content" to `#main`; keep `id="main"` on the page's main element.
- **Labels and names:** every control has a visible `Label` or an `aria-label`; icon-only buttons need `aria-label`; decorative icons and images get `aria-hidden` / `alt=""`; a select inside a composite control (country code) gets its own `aria-label`.
- **Errors and status:** field errors tied with `aria-describedby` and `aria-invalid`; form-level errors `role="alert"`; loading and progress messages `role="status"` with `aria-busy`/`aria-live="polite"`. Do not show a state by colour alone: pair it with text or an icon (status badges carry words).
- **Keyboard and focus:** every interactive element is reachable and operable by keyboard; the focus ring is the shadcn one (`focus-visible:ring-[3px] focus-visible:ring-ring/50`); never `outline-none` without a replacement ring. Dialogs and sheets are Radix: focus is trapped, Escape closes, focus returns. Move focus to the first invalid field after a failed submit.
- **Motion:** wrap decorative animation in `motion-safe:`; no autoplay motion that carries information.
- **Contrast:** use the token pairs (`text-foreground` on `bg-card`, `text-muted-foreground` for secondary text, status foreground on its subtle surface); do not lighten them. `text-disabled-foreground` is for disabled text only.
