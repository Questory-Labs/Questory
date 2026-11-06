"use client";

import { useUser } from "@/hooks/useUser";
import { useDemoTimeLeft } from "./useDemoTimeLeft";

function ActiveDemoBanner({ expiresAt }: { expiresAt: string | undefined }) {
  const { minutesLeft } = useDemoTimeLeft(expiresAt);
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-[var(--radius)] border border-[var(--line)] px-3.5 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--muted)]"
    >
      <span aria-hidden className="dot h-[5px] w-[5px] text-[var(--warm)]" />
      Read-only demo · {minutesLeft} min left
    </p>
  );
}

export function DemoBanner() {
  const { user } = useUser();
  if (user?.isDemo !== true) return null;
  return <ActiveDemoBanner expiresAt={user.sessionExpiresAt} />;
}
