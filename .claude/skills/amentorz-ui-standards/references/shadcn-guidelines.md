# shadcn/ui in Amentorz

## Setup (verified, identical in the three repos)

`components.json`: style `new-york`, `rsc: true`, `tsx: true`, Tailwind v4 (`tailwind.config` empty, CSS at `src/app/globals.css`), `baseColor: neutral`, CSS variables on, icon library `lucide`. Aliases: components `@/components`, **ui `@/components/shadcn`**, utils `@/lib/utils`, lib `@/lib`, hooks `@/hooks`.

Primitives import from `radix-ui` (the single meta package), not from `@radix-ui/react-*`. Import a primitive as `@/components/shadcn/<name>`.

## Rule

When a suitable shadcn primitive exists, use it instead of writing a custom one. "Suitable" means it gives the behaviour you need (focus handling, keyboard, ARIA) without fighting its styling. Do not add every shadcn component in advance; add one when a screen needs it.

## Installed (all repos unless noted)

`avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `sheet`, `skeleton`, `table`, `tabs`, `textarea`, `tooltip`; `calendar` (admin, student); `native-select`, `switch`, `kbd` (admin); `progress` (faculty).

## Not installed

`alert`, `alert-dialog`, `accordion`, `command`, `popover`, `radio-group`, `scroll-area`, `separator`, `form` (the react-hook-form wrapper), `toggle`, `sonner` wrapper (the app uses `Toaster` from `sonner` directly in `providers.tsx`). `cmdk` is not a dependency. `react-hook-form` is installed but used in only 3 files across the repos; forms are normally Zod plus local state or `FormData`.

## Mapping a need to a component

| Need | Use | Note |
|---|---|---|
| Modal | `Dialog`; student popups via `AppDialog`; admin confirmations via `ConfirmDialog` | `AlertDialog` is not installed; `ConfirmDialog` is the existing confirm pattern. |
| Side panel for a record or long form | `Sheet` (`w-full … sm:max-w-md|lg|xl`, `overflow-y-auto`) | Admin faculty review and pricing use it. |
| Choose one of a short list | `Select` (student, and admin list filters) / `NativeSelect` through the admin `SelectField` (admin forms) | See exceptions and `interaction-patterns.md` (Radix details). |
| Choose from a long or searchable list | **undetermined**: no `Command`/`Popover` yet | Ask the user; if approved, `npx shadcn@latest add popover command` (new-york, `@/components/shadcn`), then check the generated files against `globals.css` tokens. |
| Row actions menu | `DropdownMenu` | |
| Tabs | `Tabs`, `variant="line"` for page status tabs (admin faculty page) | |
| Switch / checkbox | `Switch` (admin) / `Checkbox` | Pair with `Label`; checkbox rows are `flex items-center gap-2`. |
| Date | `DatePicker` (`components/forms`) | Built on `Calendar` and `react-day-picker`. |
| Table | `DataTable` + `TablePagination`, built on `Table` | |
| Tooltip | `Tooltip` inside a `TooltipProvider` (admin provides it in `providers.tsx`) | |
| Toast | `toast` from `sonner` (admin, faculty) | Student: undetermined. |
| Loading | `Skeleton` shaped like the final content | |

## How to add or change a primitive

1. Check the three repos first; a copy may exist (`cmp` the files). Copy it rather than regenerating when it is already there, so the repos stay identical.
2. To generate one: `npx shadcn@latest add <name>` in the repo. It writes to `src/components/shadcn` because of `components.json`. Review the result: colours must be token classes, radius must resolve to the project's radius, and sizes must match the existing controls (h-10 for inputs and default buttons).
3. Customise in the primitive only when every use should change. For one screen, pass `className` and use existing variants/sizes first. Do not fork a primitive under another name.
4. Mention in your summary that a primitive was added or changed, and update `component-inventory.md`.

## Existing customisations worth knowing

- Tokens are Amentorz's, not shadcn's neutral defaults: `Button` default is `bg-primary hover:bg-primary-hover active:bg-primary-pressed`; `Badge` variants map to the status tokens; `Card` uses `shadow-card`.
- `Button` is `font-semibold`, base size `h-10`; there are `xs` and `icon-*` sizes beyond stock shadcn.
- `Select` trigger is stock `h-9`; the student `SelectField` sets `data-[size=default]:h-10` so it lines up with `Input`.
- `Dialog` is stock (`rounded-lg` = 6px here); `AppDialog` overrides radius, width and header/footer layout for the student popups.

## Exceptions and open questions

- **Admin dropdowns: filters use shadcn, forms still native.** The Students filters and rows-per-page use the shadcn `Select` (icon in the trigger, active state, "all" sentinel for no filter). `SelectField` in `amentorz-admin/src/components/forms/field.tsx` still renders `NativeSelect` for forms. Do not mix both in one form; migrate forms module by module and say so when you do.
- **Settings-style screens** (Settings, Profile) use the standard controls. `components/settings/setting-layout.tsx` is layout only (`SettingsPage`, `SettingCard`, `SettingRow`, `SettingCallout`, `SettingPills`, `StickyBar`); its old `SettingInput`, `SettingSelect`, `SettingButton`, `SettingDialog` and friends are gone, and `tests/standard-controls.test.ts` fails if they return. The time-zone list stays a native select on purpose (about 400 options, the browser lets you type to find one).
- **Admin's `implement-screen` skill is out of date**: it points at `src/components/ui` and a "UI lint" that no longer exist (the primitives are in `src/components/shadcn`, there is no `scripts/` folder or lint script, and `UI_IMPLEMENTATION.md` says the AST lint was retired). Follow the actual folders; the other two repos' copies of that skill are correct.
