import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { initialsOf } from "@/components/layout/initials";
import { cn } from "@/lib/utils";

// A stable tint per name, from the existing palette, so a long list is easier to scan
const TINTS = [
  "bg-accent text-accent-foreground",
  "bg-info-subtle text-info-foreground",
  "bg-success-subtle text-success-foreground",
];
const tintOf = (name: string): number =>
  [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TINTS.length;

/** Initials in a tinted circle, for a student, faculty member or any named person. */
export function PersonAvatar({
  name,
  size = "default",
  className,
}: {
  name: string;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback
        className={cn(
          "font-semibold",
          TINTS[tintOf(name)],
          size === "lg" && "text-base",
        )}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
