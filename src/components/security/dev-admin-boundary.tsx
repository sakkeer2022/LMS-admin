"use client";
import { useEffect, useState, type ReactNode } from 'react';
import { hasDevAdminSession } from '@/lib/auth/dev-admin';
import { Typography } from '@/components/ui';

export function DevAdminBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (hasDevAdminSession()) setReady(true);
    else window.location.replace('/login');
    const check = () => { if (!hasDevAdminSession()) window.location.replace('/login'); };
    window.addEventListener('pageshow', check);
    return () => window.removeEventListener('pageshow', check);
  }, []);
  return ready ? <>{children}</> : <Typography role="status">Checking development session…</Typography>;
}
