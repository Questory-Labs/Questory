"use client";

import { useUser } from "@/hooks/useUser";
import { api } from "@/lib/api";
import { useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { OAuthOutcome } from "./auth.oauth-qmonitor.types";
import {
  isAuthorizeQueryValid,
  readAuthorizeQuery,
  safeLoginNext,
} from "./auth.oauth-qmonitor.utils";

export const QmonitorAuthorizeController = ({
  children,
}: PropsWithChildren) => {
  const router = useRouter();
  const store = useStore();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<OAuthOutcome>(null);

  const query = useMemo(() => readAuthorizeQuery(search), [search]);
  const queryValid = isAuthorizeQueryValid(query);

  const { user, isAuthenticated, isLoading } = useUser();

  const loginHref = useMemo(() => {
    const next = safeLoginNext(
      `/oauth/qmonitor/authorize?${search.toString()}`,
    );
    return `/login?next=${encodeURIComponent(next)}`;
  }, [search]);

  const ensurePending = useCallback(async () => {
    if (!queryValid || !user) return;
    const res = await api<{ pending: string }>("/oauth/qmonitor/pending", {
      method: "POST",
      body: JSON.stringify(query),
    });
    setPendingToken(res.pending);
  }, [user, query, queryValid]);

  useEffect(() => {
    void ensurePending().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not start consent");
    });
  }, [ensurePending]);

  const onDecline = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirectTo: string }>("/oauth/qmonitor/decline", {
        method: "POST",
        body: JSON.stringify(query),
      });
      setOutcome("declined");
      window.location.href = res.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed");
      setBusy(false);
    }
  };

  const onAuthorize = async () => {
    if (!pendingToken) {
      setError("Consent not ready — try again");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirectTo: string }>("/oauth/qmonitor/approve", {
        method: "POST",
        body: JSON.stringify({ pending: pendingToken }),
      });
      await store.touch(["me"]);
      setOutcome("approved");
      window.location.href = res.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorize failed");
      setBusy(false);
    }
  };

  return cloneElements(children, {
    queryValid,
    isLoading,
    loggedIn: isAuthenticated,
    userLabel: user?.email || user?.personaName || "you",
    loginHref,
    error,
    busy,
    pendingReady: Boolean(pendingToken),
    outcome,
    linkState:
      outcome === "approved" ? "ok" : outcome === "declined" ? "no" : "pending",
    onAuthorize,
    onDecline,
    onBackHome: () => router.push("/"),
  });
};
