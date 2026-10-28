export type ButtonStyle = {
  variant?: "secondary" | "primary" | "danger" | "ghost" | "tab" | "overlay";
  size?: "sm" | "md" | "icon";
};
export function buttonClass({ variant = "secondary", size = "md" }: ButtonStyle) {
  return `ui-button ui-button--${variant} ui-button--${size}`;
}
