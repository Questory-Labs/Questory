"use client";

import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { getMusicUrl } from "@/lib/music";
import { useState } from "react";
import { MusicSourceCard, MusicStatusPill } from "./MusicSourceCard";

export const MultiScrobblerCard = ({
  active,
  nativeLocked,
}: {
  active: boolean;
  nativeLocked: boolean;
}) => {
  const baseUrl = getMusicUrl();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyBaseUrl = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <MusicSourceCard
      label="Live ingest"
      title="Multi-scrobbler"
      blurb={
        nativeLocked
          ? "ListenBrainz-compatible ingest is disabled because native Last.fm scrobbling is on. Disconnect Last.fm to use multi-scrobbler again."
          : "Submit new listens via the ListenBrainz-compatible API. Generate a music ingest key and set LZ_URL to the base URL below."
      }
      status={
        nativeLocked ? (
          <MusicStatusPill tone="warn">Disabled</MusicStatusPill>
        ) : active ? (
          <MusicStatusPill tone="ok">Active</MusicStatusPill>
        ) : (
          <MusicStatusPill tone="idle">Setup</MusicStatusPill>
        )
      }
    >
      {nativeLocked ? (
        <p className="font-mono text-[11px] text-[var(--muted)]">
          POST /1/submit-listens and related ListenBrainz routes return 403 for
          this account.
        </p>
      ) : (
        <>
          <div className="mb-4 rounded border border-[var(--accent)]/35 bg-[var(--bg-2)] px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
              LZ_URL / base URL
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-sm text-[var(--ink)]">
                {baseUrl}
              </code>
              <button
                type="button"
                onClick={() => void copyBaseUrl()}
                className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--accent)]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)] hover:text-[var(--muted)]"
            >
              {showDetails ? "Hide endpoints" : "Show endpoints"}
            </button>
            {showDetails ? (
              <ul className="mt-2 space-y-1.5 border-t border-[var(--line)] pt-2 font-mono text-[11px] text-[var(--muted)]">
                <li className="break-all">
                  <span className="text-[var(--faint)]">POST</span> {baseUrl}
                  /1/submit-listens
                </li>
                <li className="break-all">
                  <span className="text-[var(--faint)]">GET</span> {baseUrl}
                  /1/validate-token
                </li>
              </ul>
            ) : null}
          </div>
          <ApiKeyPanel
            embedded
            type="music_ingest"
            title="Ingest key"
            description="Shown once when generated. Rotate anytime."
          />
        </>
      )}
    </MusicSourceCard>
  );
}
