"use client";

import { useEffect, useRef } from "react";

/** Fixed error toast for auth forms (login / register). */
export function AuthErrorToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message || !onDismissRef.current) return;
    const t = window.setTimeout(() => onDismissRef.current?.(), 8_000);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 border border-[var(--warm)] bg-[var(--bg-1)] px-4 py-3 text-sm text-[var(--warm)] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
    >
      {message}
    </div>
  );
}
