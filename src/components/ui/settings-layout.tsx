"use client";
import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import "./settings-layout.css";

/* Settings-style building blocks from the Figma Settings content (node 207:6913).
   Native controls and headings live here so screens stay inside the shared UI boundary. */

export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="settings-page">{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="sp-header">
      <div className="sp-header-copy">
        <h1 className="sp-title">{title}</h1>
        <p className="sp-lede">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function SettingCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section className="sp-card" aria-label={title}>
      <div className="sp-card-header">
        <h2 className="sp-card-title">{title}</h2>
        {caption && <p className="sp-card-caption">{caption}</p>}
      </div>
      <div className="sp-card-body">{children}</div>
    </section>
  );
}

export function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: ReactNode;
  /** Id of the control this row labels */
  htmlFor?: string;
  children?: ReactNode;
}) {
  return (
    <div className="sp-row">
      <div className="sp-row-copy">
        {htmlFor ? (
          <label className="sp-row-label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <p className="sp-row-label">{label}</p>
        )}
        {description && <p className="sp-row-description">{description}</p>}
      </div>
      {children && <div className="sp-row-control">{children}</div>}
    </div>
  );
}

export function SettingCallout({ children }: { children: ReactNode }) {
  return (
    <div className="sp-callout" role="note">
      {children}
    </div>
  );
}

export const SettingInput = forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & { error?: string }
>(function SettingInput({ error, className, ...props }, ref) {
  const errorId = error && props.id ? `${props.id}-error` : undefined;
  return (
    <div style={{ flex: "1 1 0", minWidth: 0 }}>
      <input
        {...props}
        ref={ref}
        className={`sp-input ${className ?? ""}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
      />
      {error && (
        <p id={errorId} className="sp-field-error">
          {error}
        </p>
      )}
    </div>
  );
});

export function SettingSelect({
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select {...props} className="sp-input">
      {children}
    </select>
  );
}

export function SettingButton({
  variant = "secondary",
  size,
  pending,
  pendingLabel = "Please wait…",
  children,
  type = "button",
  disabled,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm";
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`sp-btn sp-btn--${variant}${size ? ` sp-btn--${size}` : ""}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function SettingPill({
  tone,
  children,
}: {
  tone?: "warning";
  children: ReactNode;
}) {
  return (
    <span className={`sp-pill${tone ? ` sp-pill--${tone}` : ""}`}>
      {children}
    </span>
  );
}

export function SettingPills({ children }: { children: ReactNode }) {
  return <div className="sp-pills">{children}</div>;
}

export function SettingEmpty({ children }: { children: ReactNode }) {
  return <p className="sp-empty">{children}</p>;
}

export function StickyBar({
  message,
  children,
}: {
  message: string;
  children: ReactNode;
}) {
  return (
    <div className="sp-bar" role="region" aria-label="Save changes">
      <p className="sp-bar-text" role="status">
        {message}
      </p>
      {children}
    </div>
  );
}

/** A password input with a show/hide toggle. */
export const SettingPasswordInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<"input">, "type"> & { error?: string }
>(function SettingPasswordInput({ error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="sp-password">
      <SettingInput
        {...props}
        ref={ref}
        error={error}
        type={visible ? "text" : "password"}
        className="sp-password__input"
      />
      <button
        type="button"
        className="sp-password__toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeOff size={18} aria-hidden />
        ) : (
          <Eye size={18} aria-hidden />
        )}
      </button>
    </div>
  );
});

/** A modal dialog in the settings style: icon, title, description, content and a footer for actions. */
export function SettingDialog({
  open,
  onClose,
  title,
  description,
  icon,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previous = document.activeElement as HTMLElement | null;
      dialog.showModal();
      return () => {
        dialog.close();
        previous?.focus();
      };
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sp-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close.current();
      }}
    >
      <div className="sp-dialog__panel">
        <div className="sp-dialog__head">
          <span className="sp-dialog__icon">{icon}</span>
          <div>
            <h2 id={titleId} className="sp-dialog__title">
              {title}
            </h2>
            <p className="sp-dialog__description">{description}</p>
          </div>
        </div>
        <div className="sp-dialog__body">{children}</div>
        {footer && <div className="sp-dialog__footer">{footer}</div>}
      </div>
    </dialog>
  );
}

/** A label above a control, for stacked forms such as the dialog. */
export function SettingField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="sp-field">
      <label className="sp-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
