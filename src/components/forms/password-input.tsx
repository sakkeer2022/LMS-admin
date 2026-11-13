"use client";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/shadcn/input";
import { cn } from "@/lib/utils";
import { RevealButton } from "./reveal-button";

/** An `Input` for a password with a show/hide toggle. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <RevealButton visible={visible} onToggle={() => setVisible((value) => !value)} />
    </div>
  );
}
