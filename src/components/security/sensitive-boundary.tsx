"use client";
import { Button, Card, Typography } from "@/components/ui";
import { useState, type ReactNode } from "react";
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
        <Typography>
          Sensitive action: {label}. Activity must be audited by the backend.
        </Typography>
        {revealed ? (
          children
        ) : (
          <Button onClick={() => setRevealed(true)}>
            Review sensitive action
          </Button>
        )}
      </Card>
    </Can>
  );
}
