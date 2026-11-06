"use client";

import { useStore } from "@questorylabs/qhttp/react";
import { DEMO_READ_ONLY_MESSAGE } from "@questorylabs/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { useUser } from "@/hooks/useUser";
import { apiOnce } from "@/lib/api";
import {
  isDemoBlockedHref,
  notifyDemoBlocked,
  subscribeDemoBlocked,
} from "@/lib/demo-mode";
import { useDropEpochBump } from "@/providers/StatusProvider";
import { useDemoTimeLeft } from "./useDemoTimeLeft";

function ActiveDemoSession({ expiresAt }: { expiresAt: string | undefined }) {
  const router = useRouter();
  const store = useStore();
  const bumpStatus = useDropEpochBump();
  const { expired } = useDemoTimeLeft(expiresAt);
  const ended = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(
    () => subscribeDemoBlocked(() => setMessage(DEMO_READ_ONLY_MESSAGE)),
    [],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isDemoBlockedHref(anchor.href)) return;
      event.preventDefault();
      notifyDemoBlocked();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!expired || ended.current) return;
    ended.current = true;
    void apiOnce("/auth/logout", { method: "POST" }).catch(() => undefined);
    store.drop();
    bumpStatus();
    router.replace("/");
  }, [expired, store, bumpStatus, router]);

  return <AuthErrorToast message={message} onDismiss={() => setMessage(null)} />;
}

export function DemoSession() {
  const { user } = useUser();
  if (user?.isDemo !== true) return null;
  return <ActiveDemoSession expiresAt={user.sessionExpiresAt} />;
}
