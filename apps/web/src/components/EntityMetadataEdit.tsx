"use client";

import { useEffect, useState } from "react";
import { Button, Dialog } from "@/components/ui";

type EntityMetadataEditProps = {
  displayNameLabel?: string;
  coverLabel?: string;
  initialDisplayName?: string | null;
  initialCoverUrl?: string | null;
  canonicalName?: string;
  showCover?: boolean;
  onSave: (values: {
    displayName: string;
    coverUrl: string;
  }) => Promise<void>;
  saving?: boolean;
};

export function EntityMetadataEdit({
  displayNameLabel = "Nickname",
  coverLabel = "Cover URL",
  initialDisplayName,
  initialCoverUrl,
  canonicalName,
  showCover = true,
  onSave,
  saving = false,
}: EntityMetadataEditProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialDisplayName ?? "");
    setCoverUrl(initialCoverUrl ?? "");
    setError(null);
  }, [open, initialDisplayName, initialCoverUrl]);

  function handleClose() {
    if (saving) return;
    setOpen(false);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    try {
      await onSave({ displayName, coverUrl });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        Edit
      </button>

      <Dialog open={open} onClose={handleClose} title="Edit metadata">
        {canonicalName ? (
          <p className="text-sm text-[var(--muted)]">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Canonical
            </span>
            <span className="mt-1 block text-[var(--ink)]">{canonicalName}</span>
          </p>
        ) : null}
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              {displayNameLabel}
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Leave blank to use canonical name"
              className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
            />
          </label>
          {showCover ? (
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                {coverLabel}
              </span>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </label>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
