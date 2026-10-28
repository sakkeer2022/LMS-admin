"use client";
import { Button, Typography } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" role="alert">
      <Typography variant="h1">
        This workspace is temporarily unavailable
      </Typography>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
