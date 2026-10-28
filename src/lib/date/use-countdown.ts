'use client';
import { useEffect, useState } from 'react';
import { remainingSeconds } from './slots';
export function useCountdown(endsAt: string) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => { const tick = () => setSeconds(remainingSeconds(endsAt)); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, [endsAt]);
  return seconds;
}
// Use backend endsAt (normally startsAt + 20 minutes). Never reset duration on page reload.
