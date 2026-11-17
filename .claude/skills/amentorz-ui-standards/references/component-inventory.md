# Component inventory

Verified against the repos (admin and faculty on `development`, student on `development` plus the LMS-105 branch where noted). Look here before writing a component; open the file for the exact props. Components that are the same in all three repos are copied, not published (`amentorz-student/SHARED.md`): if you change a shared one, say so, and keep the copies in step.

## Primitives: `src/components/shadcn` (all repos)

`avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `sheet`, `skeleton`, `table`, `tabs`, `textarea`, `tooltip`. (`kbd` is admin only.) Identical across the repos except as listed under "Only in one repo". Add `calendar` (admin, student). See `shadcn-guidelines.md`.

- `Button`: variants `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `default` (h-10), `xs`, `sm` (h-8), `lg` (h-12), `icon`, `icon-xs`, `icon-sm`, `icon-lg`. `asChild` renders a link as a button.
- `Badge`: variants `default`, `secondary`, `success`, `warning`, `info`, `destructive`, `outline`, `ghost`, `link`; pill shaped, `text-xs`.
- `Input` (h-10), `Textarea`, `Label`, `Checkbox` (size-4, 4px corners), `Select` (trigger default h-9, `size="sm"` h-8), `Tabs` (variants `default` and `line`), `Card` (`rounded-md`, `shadow-card`), `Table`, `Tooltip`, `Skeleton`, `Avatar`, `DropdownMenu`.
- `Dialog` (default `sm:max-w-lg`, `rounded-lg` = 6px, close button top right) and `Sheet` (side drawer; widths set per use: `w-60` for the nav, `sm:max-w-md|lg|xl` for admin forms).

Only in one repo: `native-select` and `switch` (admin), `progress` (faculty). Admin's `textarea` differs from the other two.

## Page structure: `src/components/layout`

| Component | Where | Use |
|---|---|---|
| `PageHeader({title, description?, actions?})` | all | Page `h1` (`text-2xl font-bold`) with optional description and right-hand actions; wraps on phones. |
| `EmptyState({icon?, title, description?, action?})` | all | Dashed-border empty panel; the optional lucide `icon` sits in an accent circle (admin). Use instead of a blank page or a static placeholder. |
| `PanelMessage({children, onRetry?})` | all | Inline panel message; with `onRetry` it is `role="alert"` and shows a Retry button. Use for a failed load. |
| `AdminShell` / `FacultyShell` / `StudentShell` | per repo | Sidebar (drawer below `lg`), top bar, `<main id="main">`. Do not build another shell. |
| `SidebarNav`, `Topbar` | admin, faculty | Navigation lists come from `layout/admin/navigation.ts`, `faculty-nav.ts`, `student-nav.ts`. |
| `PageSkeleton({rows})` | admin | Loading placeholder for a client page that suspends. |
| `initialsOf` | all | Initials for an `Avatar` fallback. |

## Data display: `src/components/data-table`

`DataTable` (TanStack Table; define columns as `ColumnDef[]`, `meta: { align: "right" }` for numbers, takes a `caption`; the table from `md` and **phone cards below it** (generated from the columns, steered with `meta.mobile`, `meta.mobileHideWhen` or `renderCard`); header band, "Loading…" line, fade-in rows and an icon empty state are built in; `onRowClick`, `canClickRow` and `isRowSelected` make rows clickable and highlight the open one) and `TablePagination` (server pagination: result count, Previous, Next). Used by admin (4 places); present in faculty and student, not yet used there.

## Forms

| Component | Where | Use |
|---|---|---|
| `Field`, `TextField`, `TextareaField`, `SelectField`, `CheckField`, `FormError` | admin `components/forms/field.tsx` | Label + control + hint + error with ids wired. `SelectField` here wraps the **native** select. `FormError` is the form-level `role="alert"` message. |
| `AuthField`, `AuthDateField`, `AuthCheckbox`, `AuthError`, `AuthSubmit`, `AuthHead`, `AuthHeading`, `AuthFormShell`, `AuthSuccess`, `AuthStack`, `AuthLinkButton`, `AuthSecondaryButton` | `components/auth/auth-controls.tsx` (all; `AuthDateField` student only) | The label-above-control field used by sign-in, recovery and student registration: required `*`, hint, error, optional leading icon (`mail`, `lock`), password reveal, verified tick. Reuse for any simple text field in a form on those pages. |
| `DatePicker` | admin and student `components/forms` (identical) | Type `dd / mm / yyyy` or pick from a calendar with month/year dropdowns; value is `YYYY-MM-DD` or `""`. |
| `OtpInput`, `SignaturePad`, `ColumnPicker` | student `components/forms` | Six-box code; drawn signature (`onInkChange`); cascading single-choice columns. |
| `SelectField({id,label,value,onChange,options,placeholder,error,hint,required})` | student `components/forms/SelectField.tsx` (added in LMS-105; on `development` only once that branch is merged) | Labelled shadcn `Select` with an `h-10` trigger to match `Input`. The student-portal dropdown. |
| `PhoneField({id,label,countries,value,onChange,...})` | student `components/forms/PhoneField.tsx` (LMS-105) | Country-code `Select` beside the number input; codes come from `GET /regions/countries`, never typed in code. |
| `PasswordField`, `PasswordInput`, `RevealButton` | admin `components/forms` (`field.tsx`, `password-input.tsx`, `reveal-button.tsx`) | A labelled password field with the show/hide eye; the auth screens use the same `RevealButton`. |
| `Form({pending})` | admin `components/forms/form.tsx` | A form that disables every control inside while it saves. |
| `PendingButton({pending, pendingLabel})` | admin `components/forms/pending-button.tsx` | A `Button` that shows a spinner and its own label while an action runs. |
| `FormDialog({open, onClose, busy, title, description, footer})` | admin `components/forms/form-dialog.tsx` | A dialog for a form: cannot be closed (Esc, outside click, close button) while `busy`. Used by re-authentication, change password and policy upload. |
| `SettingsPage`, `SettingCard`, `SettingRow({label, description, htmlFor, error, narrow})`, `SettingCallout`, `SettingPills`, `StickyBar` | admin `components/settings/setting-layout.tsx` | Layout of a settings-style page. Controls inside a row are the standard ones. |

## Interaction pieces (admin; see `interaction-patterns.md`)

| Component | Where | Use |
|---|---|---|
| `CopyValue({value,label,children?})`, `CopyButton({value,label})` | `components/feedback/copy-button.tsx` | Copy an email, phone, ID or fingerprint: hover/focus button, check icon for 1.5 s, toast on clipboard failure. |
| `StatusBadge({status})` | `components/feedback/status-badge.tsx` | One colour per status (active/approved/completed green, pending amber, processing blue, inactive/cancelled grey, rejected/failed red). |
| `Kbd` | `components/shadcn/kbd.tsx` | A keyboard key inside an instruction or tooltip. |
| `Tip({label, children})` | `components/feedback/tip.tsx` | Tooltip for an icon-only control; `label` may hold a `Kbd`. |
| `PersonAvatar({name, size?})` | `components/feedback/person-avatar.tsx` | Initials in a tinted circle (students, tutors). |
| `SearchInput({value, onChange, label, placeholder})` | `components/forms/search-input.tsx` | List search with icon, clear button, `/` to focus and `Esc` to clear. |
| `FilterChip({label, onRemove})` | `components/feedback/filter-chip.tsx` | Removable active-filter pill. |
| `formatDate`, `relativeDate` | `lib/format/dates.ts` | Exact date and "3 days ago". |
| `ConsentBadge`, `MinorBadge` | `features/students/student-ui.tsx` | Students-specific badges built on `StatusBadge` and `Tip`. |
| `StudentsList`, `StudentsFilters`, `StudentsPagination`, `StudentSheet`, `Stat` (in `students-page.tsx`) | `features/students/` | The reference list screen: table + phone cards, filters with chips, pagination, detail drawer, summary tiles. Copy the structure for other lists. |

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
