# Amentorz design system (as implemented)

Source: `src/app/globals.css` in each frontend repo (Tailwind CSS v4, `@import "tailwindcss"`, `@import "tw-animate-css"`, tokens in `:root` and exposed through `@theme inline`). The header comment says the tokens come from the Figma "Webapplication" foundations (node 35:2). There is no `tailwind.config`; there is no dark theme (`admin/UI_IMPLEMENTATION.md`: "there is no dark theme because the design has none"; shadcn's `dark:` classes remain in the primitives but nothing switches them on).

Stack in all three apps: Next.js 15.5, React 19, Tailwind 4.1, `radix-ui` 1.8 (the meta package), `lucide-react`, `class-variance-authority`, `tailwind-merge` + `clsx` (via `cn` in `@/lib/utils`), TanStack Query and Table, Zod 4, `tw-animate-css`. `sonner` is installed in all three but used in admin and faculty only. `react-day-picker` is in admin and student.

## Colour tokens (use the Tailwind class, never the hex)

| Role | Token classes | Value |
|---|---|---|
| Brand scale | `purple-50` … `purple-950` | `#f9eef9` (50), `#f5eaf5` (100), `#913d95` (600), `#562b7a` (700), `#452162` (800), `#2a143b` (950) |
| Page / surface | `bg-background`, `bg-card`, `bg-popover`, `bg-sunken`, `bg-muted` | `#f8fafc`, `#fff`, `#fff`, `#f1f5f9`, `#f1f5f9` |
| Text | `text-foreground`, `text-text-secondary`, `text-muted-foreground`, `text-disabled-foreground` | `#0f172a`, `#475569`, `#64748b`, `#94a3b8` |
| Action | `bg-primary` (+ `-hover` `#562b7a`, `-pressed` `#452162`), `text-primary-foreground` | `#913d95` |
| Soft action | `bg-accent text-accent-foreground`, `bg-secondary` | `#f5eaf5` / `#562b7a`; `#f1f5f9` |
| Lines | `border-border`, `border-border-subtle`, `border-border-strong`, `border-input`, `ring-ring` | `#e2e8f0`, `#f1f5f9`, `#cbd5e1`, `#e2e8f0`, `#913d95` |
| Status | `bg-success-subtle text-success-foreground`, `bg-warning-subtle text-warning-foreground` (+ `border-warning-border`), `bg-error-subtle text-error-foreground`, `bg-info-subtle text-info-foreground` (+ `border-info-border`, student only) | green `#dcfce7/#166534`, amber `#fef3c7/#92400e/#d97706`, red `#fee2e2/#991b1b`, blue `#dbeafe/#1e40af/#2563eb` |
| Danger action | `bg-destructive` | `#dc2626` |

Status is shown by a coloured surface plus text, and in the existing components also by an icon or a word; do not rely on colour alone.

## Typography

- One family: **Manrope** (`next/font/google`, variable `--font-manrope`, mapped to `font-sans`). The brand wordmark is an image.
- Weights in use: `font-semibold` (most common: labels, buttons, headings), `font-bold` (page titles), `font-medium`, `font-normal`.
- Sizes in use, most to least common: `text-sm` (controls, body in the admin and faculty portals), `text-xs` (hints, captions, badges), `text-base`, `text-lg`, `text-2xl`, `text-3xl`, `text-4xl`. Figma line heights are set in `@theme`: `text-lg` 26px, `text-3xl` 38px, `text-4xl` 44px.
- Roles: page title `text-2xl leading-8 font-bold tracking-tight` (`PageHeader`); sign-in/up title 30/38 bold (`AuthHeading size="page"`) or `text-2xl leading-8` (`size="form"`); section title `text-base font-semibold`; label `text-sm font-semibold`; hint `text-xs text-muted-foreground`; error `text-sm text-error-foreground` in auth/student forms, `text-xs` with `role="alert"` in the admin `Field`; badge `text-xs font-semibold tracking-[0.02em]`; sidebar group label `text-xs font-semibold uppercase tracking-[0.02em]`.
- **Differs by portal:** `body` is `text-sm` on `bg-background` in admin and faculty, and `text-base` on `bg-card` in student.

## Radius and shadow

- `--radius: 6px` and `--radius-sm|md|lg|xl` all equal it, so **`rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-xl` are all 6px**. Controls, buttons, cards (`Card` is `rounded-md`) use `rounded-md`.
- `rounded-pill` (999px) for badges, chips, step markers; `rounded-full` for avatars and icon discs.
- `rounded-card` (12px) and `rounded-panel` (16px) exist **in the student `globals.css` only** (admin and faculty do not define them). Tailwind's own `rounded-2xl` (16px) is also used in student learning-flow cards.
- Shadows: `shadow-card` (`0 1px 2px rgba(15,23,42,.06)`) on `Card`, `shadow-xs` on controls, `shadow-lg` on dialogs/sheets/popovers, `shadow-sm`/`shadow-md` rarely.

## Spacing and layout

- Authenticated shell: left sidebar `w-60` from `lg:` up (admin and faculty can collapse it to `w-16`; student is fixed at `w-60`); below `lg` it is a `Sheet` drawer. Page content: `<main id="main" className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">`. There is no max-width on page content.
- Sign-in/sign-up: split page, brand panel (`bg-[#18082f]`, `lg:basis-[620px]`, hidden below `lg`) beside the form column. Form column widths: `max-w-[420px]` (login, recovery), `max-w-[681px]` (student registration).
- Form rhythm: field stack `gap-2` (label, control, hint), rows `gap-5`, paired fields `grid grid-cols-1 gap-4 sm:grid-cols-2`, step content `gap-6`.
- Lists of items: bordered rows `rounded-xl border border-border bg-card p-3.5` (student learning list); notes and callouts: `rounded-md border border-<status>-border bg-<status>-subtle p-4`.

## Breakpoints

Tailwind defaults. Observed use: `sm:` (most), `lg:` (shell switch), `md:` and `xl:` rarely. The student app also uses arbitrary widths for the registration stepper and landing page (`min-[1480px]`, `max-[1100px]`, `min-[641px]`, `max-[640px]`). Treat `sm` (640px) and `lg` (1024px) as the two layout switches unless the screen is a one-off.

## Motion

`tw-animate-css` utilities; shadcn components animate with `data-[state=open]:animate-in`. Page-level motion is small and wrapped in `motion-safe:` (for example `motion-safe:animate-in motion-safe:fade-in`). `globals.css` turns smooth scrolling off under `prefers-reduced-motion` (student).

## Known differences between the portals

| Area | admin | faculty | student |
|---|---|---|---|
| `globals.css` tokens | no `info-border`, `radius-card`, `radius-panel` | same as admin | all three defined |
| Body text and background | `text-sm`, `bg-background` | same | `text-base`, `bg-card` |
| Dropdowns in forms | native `<select>` via `NativeSelect` | none yet | shadcn `Select` |
| Toasts | `sonner` `<Toaster richColors />` | same | none |
| Settings-style controls | `components/settings/setting-layout.tsx` has its own `SettingInput`, `SettingButton`, `SettingSelect`, `SettingDialog` (not shadcn) | n/a | n/a |
| Auth page shell | `components/auth/auth-shell.tsx` | same | `auth-page.tsx` (fixed-height split, scrolling form column) |
| Textarea primitive | `min-h-20` | `min-h-16`, `field-sizing-content` | same as faculty |
