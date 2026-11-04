"use client";

import { AuthStatusLine } from "@/components/auth/AuthSplitLayout";
import { DotCanvas } from "@/components/dots/DotCanvas";
import {
  createLinkPainter,
  type LinkState,
} from "@/components/dots/dot-painters";
import { useMemo } from "react";

const STATUS: Record<LinkState, { text: string; tone: "ok" | "warn" | "muted" }> = {
  pending: { text: "Waiting for approval", tone: "warn" },
  ok: { text: "Linked", tone: "ok" },
  no: { text: "Not linked", tone: "muted" },
};

export function OAuthLinkAside({ state }: { state: LinkState }) {
  const paint = useMemo(() => createLinkPainter(state), [state]);
  const status = STATUS[state];

  return (
    <>
      <div className="relative mx-auto w-full max-w-[640px]">
        <DotCanvas paint={paint} width={640} height={320} className="w-full" />
        <div
          aria-hidden
          className="label-mono pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-[10%] text-[var(--muted)]"
        >
          <span>qMonitor</span>
          <span>Questory</span>
        </div>
      </div>
      <div className="relative">
        <p className="m-0 text-[clamp(28px,3.2vw,44px)] font-light leading-[1.05] tracking-[-0.045em]">
          Your PC, linked to{" "}
          <span className="font-serif text-[#a1a1a6]">your library.</span>
        </p>
      </div>
      <AuthStatusLine tone={status.tone}>{status.text}</AuthStatusLine>
    </>
  );
}
