"use client";
import { Button } from "@/components/shadcn/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">This workspace is temporarily unavailable</h1>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
