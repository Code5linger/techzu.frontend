import { useEffect, useState } from 'react';

export function useCountdown(expiresAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return 0;

  const target = new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((target - now) / 1000));
}
