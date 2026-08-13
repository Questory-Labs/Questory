"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import {
  QMONITOR_CLIENT_ID,
  QMONITOR_REDIRECT_URI,
  QMONITOR_SCOPE,
} from "@questorylabs/shared";
import { api, apiOnce } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";

type MeResponse = { user: { id: string; email?: string | null; personaName?: string } | null };

function safeLoginNext(pathWithQuery: string): string {
  if (!pathWithQuery.startsWith("/oauth/qmonitor/authorize")) {
    return "/oauth/qmonitor/authorize";
  }
  return pathWithQuery;
}

function AuthorizeInner() {
  const router = useRouter();
  const store = useStore();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);

  const query = useMemo(() => {
    return {
      client_id: search.get("client_id") || "",
      redirect_uri: search.get("redirect_uri") || "",
      state: search.get("state") || "",
      scope: search.get("scope") || "",
      code_challenge: search.get("code_challenge") || "",
      code_challenge_method: search.get("code_challenge_method") || "",
      device_id: search.get("device_id") || "",
      response_type: search.get("response_type") || "code",
    };
  }, [search]);

  const queryValid =
    query.client_id === QMONITOR_CLIENT_ID &&
    query.redirect_uri === QMONITOR_REDIRECT_URI &&
    query.scope.split(/\s+/).includes(QMONITOR_SCOPE) &&
    query.code_challenge_method === "S256" &&
    query.state.length >= 8 &&
    query.code_challenge.length >= 43 &&
    query.device_id.length >= 16;

  const me = useResource({
    id: ["me"],
    load: () => apiOnce<MeResponse>("/auth/me"),
    retries: false,
  });

  const loginHref = useMemo(() => {
    const next = safeLoginNext(
      `/oauth/qmonitor/authorize?${search.toString()}`,
    );
    return `/login?next=${encodeURIComponent(next)}`;
  }, [search]);

  const ensurePending = useCallback(async () => {
    if (!queryValid || !me.value?.user) return;
    const res = await api<{ pending: string }>("/oauth/qmonitor/pending", {
      method: "POST",
      body: JSON.stringify(query),
    });
    setPendingToken(res.pending);
  }, [me.value?.user, query, queryValid]);

  useEffect(() => {
    void ensurePending().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not start consent");
    });
  }, [ensurePending]);

  async function onDecline() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirectTo: string }>("/oauth/qmonitor/decline", {
        method: "POST",
        body: JSON.stringify(query),
      });
      window.location.href = res.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed");
      setBusy(false);
    }
  }

  async function onAuthorize() {
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
      window.location.href = res.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorize failed");
      setBusy(false);
    }
  }

  if (!queryValid) {
    return (
      <div className="mt-8 space-y-3">
        <p className="text-sm text-[var(--warm)]">
          Invalid qMonitor authorization request.
        </p>
        <Button type="button" variant="ghost" onClick={() => router.push("/")}>
          Back home
        </Button>
      </div>
    );
  }

  if (me.empty && me.busy) {
    return <p className="mt-8 text-sm text-[var(--muted)]">Checking session…</p>;
  }

  const loggedIn = Boolean(me.value?.user);

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)]">
          Connect qMonitor
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          qMonitor wants permission to push completed game sessions to your
          Questory library. This binding is limited to this device.
        </p>
      </div>

      {error ? (
        <p
          className="border border-[var(--warm)]/40 bg-[var(--warm)]/10 px-3 py-2 text-sm text-[var(--warm)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {!loggedIn ? (
        <div className="flex flex-wrap gap-3">
          <Link href={loginHref} className="btn btn-primary">
            Log in
          </Link>
          <Button type="button" variant="ghost" disabled={busy} onClick={onDecline}>
            Decline
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Signed in as{" "}
            <span className="text-[var(--ink)]">
              {me.value?.user?.email || me.value?.user?.personaName || "you"}
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={busy || !pendingToken} onClick={onAuthorize}>
              Authorize
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={onDecline}>
              Decline
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline"
            onClick={() => setShowManualHint((v) => !v)}
          >
            {showManualHint ? "Hide help" : "Having trouble?"}
          </button>
          {showManualHint ? (
            <p className="text-xs text-[var(--muted)]">
              After you authorize, your browser should return to qMonitor
              automatically. If not, copy the full callback URL from the address
              bar and paste it into qMonitor (never share tokens).
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function QmonitorAuthorizePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark
          href={null}
          size="md"
          wordmark="qMonitor"
          markSrc="/qmonitor-mark.svg"
          wordmarkClassName="text-3xl"
        />
        <Suspense fallback={<p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>}>
          <AuthorizeInner />
        </Suspense>
      </div>
    </div>
  );
}
