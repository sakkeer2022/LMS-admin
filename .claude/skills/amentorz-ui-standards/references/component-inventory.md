# Component inventory

Verified against the repos (admin and faculty on `development`, student on `development` plus the LMS-105 branch where noted). Look here before writing a component; open the file for the exact props. Components that are the same in all three repos are copied, not published (`amentorz-student/SHARED.md`): if you change a shared one, say so, and keep the copies in step.

## Primitives: `src/components/shadcn` (all repos)

`avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `sheet`, `skeleton`, `table`, `tabs`, `textarea`, `tooltip`. Identical across the repos except as listed under "Only in one repo". Add `calendar` (admin, student). See `shadcn-guidelines.md`.

- `Button`: variants `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `default` (h-10), `xs`, `sm` (h-8), `lg` (h-12), `icon`, `icon-xs`, `icon-sm`, `icon-lg`. `asChild` renders a link as a button.
- `Badge`: variants `default`, `secondary`, `success`, `warning`, `info`, `destructive`, `outline`, `ghost`, `link`; pill shaped, `text-xs`.
- `Input` (h-10), `Textarea`, `Label`, `Checkbox` (size-4, 4px corners), `Select` (trigger default h-9, `size="sm"` h-8), `Tabs` (variants `default` and `line`), `Card` (`rounded-md`, `shadow-card`), `Table`, `Tooltip`, `Skeleton`, `Avatar`, `DropdownMenu`.
- `Dialog` (default `sm:max-w-lg`, `rounded-lg` = 6px, close button top right) and `Sheet` (side drawer; widths set per use: `w-60` for the nav, `sm:max-w-md|lg|xl` for admin forms).

Only in one repo: `native-select` and `switch` (admin), `progress` (faculty). Admin's `textarea` differs from the other two.

## Page structure: `src/components/layout`

| Component | Where | Use |
|---|---|---|
| `PageHeader({title, description?, actions?})` | all | Page `h1` (`text-2xl font-bold`) with optional description and right-hand actions; wraps on phones. |
| `EmptyState({title, description?, action?})` | all | Dashed-border empty panel. Use instead of a blank page or a static placeholder. |
| `PanelMessage({children, onRetry?})` | all | Inline panel message; with `onRetry` it is `role="alert"` and shows a Retry button. Use for a failed load. |
| `AdminShell` / `FacultyShell` / `StudentShell` | per repo | Sidebar (drawer below `lg`), top bar, `<main id="main">`. Do not build another shell. |
| `SidebarNav`, `Topbar` | admin, faculty | Navigation lists come from `layout/admin/navigation.ts`, `faculty-nav.ts`, `student-nav.ts`. |
| `PageSkeleton({rows})` | admin | Loading placeholder for a client page that suspends. |
| `initialsOf` | all | Initials for an `Avatar` fallback. |

## Data display: `src/components/data-table`

`DataTable` (TanStack Table; define columns as `ColumnDef[]`, `meta: { align: "right" }` for numbers, takes a `caption`) and `TablePagination` (server pagination: result count, Previous, Next). Used by admin (4 places); present in faculty and student, not yet used there.

## Forms

| Component | Where | Use |
|---|---|---|
| `Field`, `TextField`, `TextareaField`, `SelectField`, `CheckField`, `FormError` | admin `components/forms/field.tsx` | Label + control + hint + error with ids wired. `SelectField` here wraps the **native** select. `FormError` is the form-level `role="alert"` message. |
| `AuthField`, `AuthDateField`, `AuthCheckbox`, `AuthError`, `AuthSubmit`, `AuthHead`, `AuthHeading`, `AuthFormShell`, `AuthSuccess`, `AuthStack`, `AuthLinkButton`, `AuthSecondaryButton` | `components/auth/auth-controls.tsx` (all; `AuthDateField` student only) | The label-above-control field used by sign-in, recovery and student registration: required `*`, hint, error, optional leading icon (`mail`, `lock`), password reveal, verified tick. Reuse for any simple text field in a form on those pages. |
| `DatePicker` | admin and student `components/forms` (identical) | Type `dd / mm / yyyy` or pick from a calendar with month/year dropdowns; value is `YYYY-MM-DD` or `""`. |
| `OtpInput`, `SignaturePad`, `ColumnPicker` | student `components/forms` | Six-box code; drawn signature (`onInkChange`); cascading single-choice columns. |
| `SelectField({id,label,value,onChange,options,placeholder,error,hint,required})` | student `components/forms/SelectField.tsx` (added in LMS-105; on `development` only once that branch is merged) | Labelled shadcn `Select` with an `h-10` trigger to match `Input`. The student-portal dropdown. |
| `PhoneField({id,label,countries,value,onChange,...})` | student `components/forms/PhoneField.tsx` (LMS-105) | Country-code `Select` beside the number input; codes come from `GET /regions/countries`, never typed in code. |
| `SettingInput`, `SettingSelect`, `SettingButton`, `SettingDialog`, … | admin `components/settings/setting-layout.tsx` | Settings page only; it has its own control styling. Do not copy it into other pages. |

## Dialogs, drawers and feedback

| Component | Where | Use |
|---|---|---|
| `ConfirmDialog({open,title,description?,confirmLabel,destructive,pending,onConfirm,onCancel})` | admin `components/forms/confirm-dialog.tsx` | Confirm step for destructive or irreversible actions: Cancel (outline) + confirm (default or destructive); blocks closing while `pending`. |
| `AppDialog({open,onClose,title,subtitle?,footer?,dismissible?,wide?})` | student `components/forms/AppDialog.tsx` | Student popups. Width `min(560px, 100vw-2rem)`, `wide` is 720px; `rounded-panel`, header and footer separated by `border-subtle`, body scrolls (`max-h-[calc(100vh-2rem)]`); `dismissible={false}` for steps that must be finished; focus goes to `[data-autofocus]`. |
| `BannerProvider`, `useBlockers` | admin `components/feedback` | Page-level blocking banners. |
| `Toaster` + `toast.success|error|warning|info` (sonner) | admin, faculty `app/providers.tsx` | Transient messages. Student has none. |
| `ReauthProvider`, `useWithReauth`, `SensitiveBoundary`, `PermissionProvider`, `Can`, `usePermission` | admin `components/security` | Password re-entry dialog for sensitive actions; hide controls the user may not use (the backend still enforces). |

## Student feature components (not shared; read before similar work)

`features/signup/components`: `Stepper` (registration steps), `GroupBuilder`, `GroupCard` (list entry with Edit, Remove and "Add another class"), `learning-parts` (`CategoryTile`, `ClassGrid`, `PillGroup`, `Stage`, `SubjectTile`, `TileSkeleton`), `ConsentDialog`, `VerifyEmailDialog`, `EducationCard`, `ReferralCard`, `AccountCreated`. `components/auth/auth-page.tsx` is the fixed-height split page (brand panel never stretches; the form column scrolls). `features/landing/*` is the public landing page with its own look (several literal hex values); do not use it as a pattern for app screens.

## When to create a new component

Only if (1) nothing above or in the feature folder fits, (2) extending one with a prop or variant would distort it, and (3) at least two places will use it. Put it next to its siblings (`forms/`, `layout/`, or the feature), name it like them (admin files are kebab-case, `forms/` in student is PascalCase for older files; follow the folder), and add it to this list.
