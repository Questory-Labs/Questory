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
      className="fixed bottom-6 left-1/2 z-50 flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 gap-2.5 rounded-[var(--radius)] border border-[var(--danger)]/25 bg-[rgba(20,20,22,0.85)] px-3.5 py-3 text-sm text-[#ffb0b0] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur-[18px]"
    >
      <span aria-hidden className="dot mt-2 h-[5px] w-[5px] text-[var(--danger)]" />
      <span>{message}</span>
    </div>
  );
}
