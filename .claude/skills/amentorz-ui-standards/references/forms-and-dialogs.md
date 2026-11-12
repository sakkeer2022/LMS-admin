# Forms, dialogs, drawers and feedback

How the existing screens do it. Copy the pattern of the portal you are in. Items marked **undetermined** have no settled convention.

## Forms

- **Field anatomy:** `Label` (`text-sm font-semibold`) above the control, gap `gap-2` (admin `Field` uses `gap-1.5`); required marked with `*` in `text-error-foreground`, `aria-hidden`, and the control gets `required`; hint under it (`text-xs text-muted-foreground`, hidden while an error shows); error under it (`text-sm text-error-foreground` in auth/student forms, `text-xs` with `role="alert"` in admin `Field`).
- **Wiring:** label `htmlFor` = control `id`; `aria-invalid` when there is an error; `aria-describedby` points at the error or hint. `AuthField`, admin `Field`/`TextField` and the student `SelectField`/`PhoneField` already do this: use them.
- **Layout:** single column; pairs in `grid grid-cols-1 gap-4 sm:grid-cols-2`; rows `gap-5`; form sections `gap-6`; form width capped (`max-w-[420px]` for auth, `max-w-[681px]` for the registration steps).
- **Control sizes:** Input and default Button `h-10`, large submit `h-12` (`AuthSubmit` uses `size="lg"`), Select trigger set to `h-10` where it sits beside an Input. Textarea `min-h-16` (student/faculty) or `min-h-20` (admin).
- **Validation:** Zod schemas next to the feature (`schema.ts`, `schemas/`). Validate on submit; map the first issue of each field to its message (`next[path[0]] ??= issue.message`); show it under the field, set `aria-invalid`, move focus to the first invalid control (see `AuthForm`). Messages say what to do ("Enter your city", "Choose your country"), not what is wrong in code terms. Server field errors come back as `ApiError.fields` and are shown in the same place. Never trust client validation alone: the backend validates again.
- **Form-level error:** `AuthError` (student/faculty/admin auth) or admin `FormError`, both `role="alert"` on `bg-error-subtle`.
- **Submitting:** disable the button and change its label while pending ("Creating…", "Saving…"); wrap the form body in `<fieldset disabled={pending} className="contents">` and set `aria-busy` (see `AuthFormShell`, `AccountStep`); guard against double submit with a ref.
- **Disabled:** the primitives dim to 50% and block pointer events; give a reason in a hint when a button is disabled and the user cannot tell why.
- **Multi-step:** the student registration is the pattern: `Stepper` at the top, a title and a lead line "Step N of 4 · …", **Back** (`variant="ghost"`) on the left and the primary action on the right in `flex items-center justify-between`, optional steps labelled "(optional)", state kept in the parent flow so Back loses nothing. A long step uses a sticky footer (`sticky bottom-0 border-t bg-background/90 backdrop-blur`).
- **Searchable select / combobox:** undetermined (see `shadcn-guidelines.md`).
- **Dates:** `DatePicker`; values are `YYYY-MM-DD`. **Phone:** `PhoneField` (country code from the API). **Money:** integer paise, INR everywhere. Never hard-code countries, dial codes, time zones or age rules (`AGENTS.md`).

## Dialogs

- Use `Dialog` (shadcn). Student popups use `AppDialog`; admin confirmations use `ConfirmDialog`.
- **Width:** `AppDialog` is `min(560px, 100vw - 2rem)`, `wide` is `min(720px, …)`; stock `Dialog` is `sm:max-w-lg` (admin invite modal); the document preview dialog in the admin faculty review uses `sm:max-w-3xl`. Always keep the `calc(100% - 2rem)` side margin so a phone shows a gutter. Use `wide` only for content that needs room (a document preview, a signature pad).
- **Height and scroll:** `max-h-[calc(100vh-2rem)]`, content `overflow-y-auto` inside, header and footer stay put. Do not let the page behind scroll (Radix handles it).
- **Anatomy:** header (title `text-xl font-semibold`, optional `text-xs` subtitle, close button top right), body (`p-6`, `gap-5`), footer (`justify-end gap-3`, border above). The title says what the person is doing ("Guardian review and consent"), not a generic "Confirm".
- **Actions:** the primary action is on the right, Cancel (`outline` or `ghost`) to its left; destructive confirmations use `variant="destructive"`. Block closing while a request is pending. `dismissible={false}` only for steps that must be finished.
- **Focus:** focus lands on the first control or the element marked `data-autofocus`; Escape closes unless the dialog is not dismissible; focus returns to the trigger (Radix).
- **Confirmation:** anything destructive or irreversible asks first (`ConfirmDialog`); say what will happen in the description.

## Drawers (Sheet)

For viewing or editing a record beside its list (admin faculty review `sm:max-w-xl`, student sheet `sm:max-w-lg`, pricing rule `sm:max-w-md`): `w-full … overflow-y-auto sm:max-w-*`, opened by a URL parameter where the page is shareable (`?tutor=<id>`). The mobile navigation is a left `Sheet` `w-60`.

## Feedback

- **Loading:** `Skeleton` in the shape of the content (see `SignupSkeleton`); a slow load may add a reassuring line (`aria-live="polite"`). Pages that suspend use `PageSkeleton` (admin).
- **Empty:** `EmptyState` with a title, one sentence and the next action. No static placeholder screens when the endpoint is missing.
- **Error:** inline `PanelMessage` with Retry, or `AuthError`; the API client turns failures into `ApiError` with a message to show. Keep the raw error and trace id out of the UI.
- **Success / info:** admin and faculty use `toast.success|info|warning|error`; the student portal has no toast: use an inline `role="status"` line or a result screen (`AccountCreated`). A toast convention for the student portal is **undetermined**.
- **Status labels:** `Badge` with the matching variant plus text.
