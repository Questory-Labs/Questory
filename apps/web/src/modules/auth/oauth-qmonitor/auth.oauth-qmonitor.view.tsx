"use client";

import { AuthAlert, AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui";
import Link from "next/link";
import type { QmonitorAuthorizeViewProps } from "./auth.oauth-qmonitor.types";
import { OAuthLinkAside } from "./components/OAuthLinkAside";
import { OAuthPermissions } from "./components/OAuthPermissions";

const Heading = () => (
  <div>
    <p className="label-mono q-in m-0 text-[11px] [--i:1]">Authorize app</p>
    <h1 className="q-in mt-2.5 text-[40px] font-light leading-[1.05] tracking-[-0.045em] [--i:2]">
      Connect <span className="font-serif text-[#bfe6dc]">qMonitor</span>
    </h1>
    <p className="q-in mt-2 mb-6 text-[var(--muted)] [--i:3]">
      qMonitor wants permission to push completed game sessions to your
      Questory library. This binding is limited to this device.
    </p>
  </div>
);

const Footnote = () => (
  <p className="mt-5 text-center font-mono text-[10.5px] text-[var(--faint)]">
    You can revoke this any time in Settings → Connections.
  </p>
);

const ActionRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2.5">{children}</div>
);

function Body(props: QmonitorAuthorizeViewProps) {
  const {
    queryValid,
    isLoading,
    loggedIn,
    userLabel,
    loginHref,
    error,
    busy,
    pendingReady,
    outcome,
    onAuthorize,
    onDecline,
    onBackHome,
  } = props;

  if (!queryValid) {
    return (
      <div className="flex flex-col items-start gap-4">
        <AuthAlert>Invalid qMonitor authorization request.</AuthAlert>
        <Button type="button" variant="ghost" onClick={onBackHome}>
          Back home
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <p role="status" className="label-mono text-[var(--muted)]">
        Checking session…
      </p>
    );
  }

  if (outcome) {
    return (
      <div
        role="status"
        className="panel q-pop rounded-[var(--radius-panel)] p-[22px]"
      >
        <p className="m-0 text-[22px] font-light tracking-[-0.03em]">
          {outcome === "approved" ? "qMonitor connected" : "Request declined"}
        </p>
        <p className="mt-1.5 mb-0 text-sm text-[var(--muted)]">
          Returning to qMonitor…
        </p>
      </div>
    );
  }

  const decline = (
    <Button
      type="button"
      variant="ghost"
      className="min-h-[50px]"
      disabled={busy}
      onClick={onDecline}
    >
      Decline
    </Button>
  );

  return (
    <>
      <Heading />
      <div className="flex flex-col gap-3.5">
        <OAuthPermissions />
        {error ? <AuthAlert>{error}</AuthAlert> : null}
        {!loggedIn ? (
          <ActionRow>
            {decline}
            <Link href={loginHref} className="btn btn-primary min-h-[50px]">
              Log in
            </Link>
          </ActionRow>
        ) : (
          <>
            <p className="m-0 text-sm text-[var(--muted)]">
              Signed in as{" "}
              <span className="text-[var(--ink)]">{userLabel}</span>
              {" · "}
              <Link
                href={loginHref}
                className="underline decoration-[var(--line-strong)] underline-offset-4 hover:text-[var(--ink)]"
              >
                Not you?
              </Link>
            </p>
            <ActionRow>
              {decline}
              <Button
                type="button"
                variant="primary"
                className="min-h-[50px]"
                disabled={busy || !pendingReady}
                onClick={onAuthorize}
              >
                Authorize
              </Button>
            </ActionRow>
            <details className="text-xs text-[var(--muted)]">
              <summary className="cursor-pointer underline decoration-[var(--line-strong)] underline-offset-4 hover:text-[var(--ink)]">
                Having trouble?
              </summary>
              <p className="mt-2 mb-0 leading-relaxed">
                After you authorize, your browser should return to qMonitor
                automatically. If not, copy the full callback URL from the
                address bar and paste it into qMonitor (never share tokens).
              </p>
            </details>
          </>
        )}
      </div>
    </>
  );
}

export const QmonitorAuthorizeView = (props: Record<string, unknown>) => {
  const p = props as QmonitorAuthorizeViewProps;
  return (
    <AuthSplitLayout
      brand={
        <BrandMark
          href={null}
          size="sm"
          wordmark="qMonitor"
          markSrc="/qmonitor-mark.svg"
          wordmarkClassName="text-lg"
        />
      }
      aside={<OAuthLinkAside state={p.linkState} />}
    >
      <div className="w-full max-w-[420px]">
        <Body {...p} />
        <Footnote />
      </div>
    </AuthSplitLayout>
  );
};
