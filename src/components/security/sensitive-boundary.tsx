"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent } from "@/components/shadcn/card";
import { Can } from "./permission-provider";

export function SensitiveBoundary({
  permission,
  label,
  children,
}: {
  permission: string;
  label: string;
  children: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Can permission={permission}>
      <Card aria-label={label}>
        <CardContent className="flex flex-col items-start gap-3 py-5">
          <p className="text-sm">
            Sensitive action: {label}. Activity must be audited by the backend.
          </p>
          {revealed ? (
            children
          ) : (
            <Button variant="outline" onClick={() => setRevealed(true)}>
              Review sensitive action
            </Button>
          )}
        </CardContent>
      </Card>
    </Can>
  );
}
