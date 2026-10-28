"use client";
import { useCountdown } from "@/lib/date/use-countdown";
import { Typography } from '@/components/ui';
export function SessionTimer({ endsAt }: { endsAt: string }) {
  const seconds = useCountdown(endsAt);
  return (
    <Typography role="timer" aria-label="Session time remaining">
      {seconds === null
        ? "Synchronizing…"
        : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
    </Typography>
  );
}
