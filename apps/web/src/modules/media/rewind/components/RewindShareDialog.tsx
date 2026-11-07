"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type {
  RewindBadge,
  RewindBadgeCreated,
  RewindBadgeListResponse,
  RewindShare,
  RewindShareCreated,
  RewindShareListResponse,
} from "@questorylabs/shared";
import { Button, Dialog } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { periodLabel } from "../media.rewind.format";
import type { RewindScope } from "../media.rewind.types";

const SHARES_KEY = ["rewind-shares"];
const BADGES_KEY = ["rewind-badges"];

const pill =
  "inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 text-[13px] text-ink transition-colors duration-300 hover:border-white/22 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50";
const row = "flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2";

const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-transparent px-3 py-2 text-xs text-ink"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => setState((await copyText(value)) ? "copied" : "failed")}
        >
          {state === "copied" ? "Copied" : state === "failed" ? "Select & copy" : "Copy"}
        </Button>
      </div>
    </div>
  );
};

export const RewindShareDialog = ({
  domain,
  period,
}: {
  domain: RewindScope;
  period: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={pill}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
        Share link
      </button>
      {open ? (
        <RewindShareDialogBody domain={domain} period={period} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};

const RewindShareDialogBody = ({
  domain,
  period,
  onClose,
}: {
  domain: RewindScope;
  period: string;
  onClose: () => void;
}) => {
  const store = useStore();
  const [includeAi, setIncludeAi] = useState(false);
  const [created, setCreated] = useState<RewindShareCreated | null>(null);
  const [createdBadge, setCreatedBadge] = useState<RewindBadgeCreated | null>(null);
  const [revoking, setRevoking] = useState<{ kind: "share" | "badge"; id: string } | null>(null);

  const shares = useResource({
    id: SHARES_KEY,
    load: () => api<RewindShareListResponse>("/rewind/shares"),
  });
  const badges = useResource({
    id: BADGES_KEY,
    load: () => api<RewindBadgeListResponse>("/rewind/badges"),
  });

  const createShare = useAction({
    run: () =>
      api<RewindShareCreated>("/rewind/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          period,
          includeAi,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }),
    onSuccess: (share) => {
      setCreated(share);
      void store.touch(SHARES_KEY);
    },
  });

  const createBadge = useAction({
    run: () => api<RewindBadgeCreated>("/rewind/badges", { method: "POST" }),
    onSuccess: (badge) => {
      setCreatedBadge(badge);
      void store.touch(BADGES_KEY);
    },
  });

  const revoke = useAction({
    run: (target: { kind: "share" | "badge"; id: string }) =>
      api(`/rewind/${target.kind === "share" ? "shares" : "badges"}/${target.id}`, {
        method: "DELETE",
      }),
    onSuccess: (_result, target) => {
      if (target.kind === "share") {
        if (created?.id === target.id) setCreated(null);
        void store.touch(SHARES_KEY);
      } else {
        if (createdBadge?.id === target.id) setCreatedBadge(null);
        void store.touch(BADGES_KEY);
      }
      setRevoking(null);
    },
  });

  const shareItems: RewindShare[] = shares.value?.items ?? [];
  const badgeItems: RewindBadge[] = badges.value?.items ?? [];
  const scopeLabel = domain === "all" ? "all" : domain;

  return (
    <>
      <Dialog open onClose={onClose} title="Share your Rewind" size="lg">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Creates a public, read-only snapshot of your {periodLabel(period)} {scopeLabel} rewind.
              Anyone with the link can view it until you revoke it.
            </p>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeAi}
                onChange={(e) => setIncludeAi(e.target.checked)}
              />
              Include the AI rewind text (if generated)
            </label>
            <div className="flex items-center gap-3">
              <Button onClick={() => createShare.submit()} disabled={createShare.busy}>
                {createShare.busy ? "Creating…" : "Create share link"}
              </Button>
              {createShare.error ? (
                <span className="text-xs text-[var(--danger,#e07a7a)]">
                  {createShare.error.message || "Could not create share link"}
                </span>
              ) : null}
            </div>
            {created ? <CopyField label="Share link" value={created.url} /> : null}
          </section>

          {shareItems.length ? (
            <section className="flex flex-col gap-2">
              <span className="label-mono">Active links</span>
              {shareItems.map((item) => (
                <div key={item.id} className={row}>
                  <div className="min-w-0 text-xs">
                    <div className="truncate text-ink">
                      {periodLabel(item.period)} · {item.domain}
                      {item.includesAi ? " · with AI" : ""}
                    </div>
                    <div className="text-muted">
                      {item.tokenPrefix}… · {item.viewCount} views
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost-danger"
                    onClick={() => setRevoking({ kind: "share", id: item.id })}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </section>
          ) : null}

          <section className="flex flex-col gap-3 border-t border-white/10 pt-5">
            <div>
              <span className="label-mono">Now-playing badge</span>
              <p className="mt-1 text-sm text-muted">
                A live SVG showing your most recent game. Paste the Markdown into a README or profile.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => createBadge.submit()}
                disabled={createBadge.busy}
              >
                {createBadge.busy ? "Creating…" : "Create badge"}
              </Button>
              {createBadge.error ? (
                <span className="text-xs text-[var(--danger,#e07a7a)]">
                  {createBadge.error.message || "Could not create badge"}
                </span>
              ) : null}
            </div>
            {createdBadge ? (
              <>
                <img src={createdBadge.svgUrl} alt="Now playing badge preview" className="max-w-full" />
                <CopyField label="Markdown" value={createdBadge.markdown} />
              </>
            ) : null}
            {badgeItems.length ? (
              <div className="flex flex-col gap-2">
                {badgeItems.map((item) => (
                  <div key={item.id} className={row}>
                    <div className="text-xs text-muted">
                      {item.tokenPrefix}… · {item.viewCount} views
                    </div>
                    <Button
                      size="sm"
                      variant="ghost-danger"
                      onClick={() => setRevoking({ kind: "badge", id: item.id })}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </Dialog>

      <Dialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={revoking?.kind === "badge" ? "Revoke badge?" : "Revoke share link?"}
        size="sm"
      >
        <p className="text-sm text-muted">
          Anyone holding this link will get a 404 immediately. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRevoking(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={revoke.busy}
            onClick={() => (revoking ? revoke.submit(revoking) : undefined)}
          >
            {revoke.busy ? "Revoking…" : "Revoke"}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
