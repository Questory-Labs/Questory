"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MusicCorrectionForm, MusicEntityRef } from "@questorylabs/shared";
import { Button, Dialog } from "@/components/ui";
import { EntityTagInput, type EntityTag } from "@/components/music/EntityTagInput";
import { musicFetch } from "@/lib/music";

type MusicCorrectionEditProps = {
  kind: "track" | "album" | "artist";
  entityId: string;
  saving?: boolean;
  onSave: (values: {
    trackTitle?: string;
    albumTitle?: string | null;
    artists?: MusicEntityRef[];
    displayName?: string | null;
  }) => Promise<{ trackId?: string } | void>;
  onSaved?: (result?: { trackId?: string }) => void;
};

function toTags(
  artists?: Array<{ id: string; name: string }>,
): EntityTag[] {
  return (artists ?? []).map((a) => ({ id: a.id, name: a.name }));
}

export function MusicCorrectionEdit({
  kind,
  entityId,
  saving = false,
  onSave,
  onSaved,
}: MusicCorrectionEditProps) {
  const [open, setOpen] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [artists, setArtists] = useState<EntityTag[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const form = useQuery({
    queryKey: ["music-correction-form", kind, entityId],
    queryFn: () =>
      musicFetch<MusicCorrectionForm>(`/corrections/${kind}s/${entityId}`),
    enabled: open && Boolean(entityId),
  });

  useEffect(() => {
    if (!open || !form.data) return;
    const c = form.data.current;
    setTrackTitle(c.title ?? "");
    setAlbumTitle(c.albumTitle ?? "");
    setArtists(toTags(c.artists));
    setDisplayName(c.displayName ?? "");
    setError(null);
  }, [open, form.data]);

  function handleClose() {
    if (saving) return;
    setOpen(false);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    try {
      const payload: {
        trackTitle?: string;
        albumTitle?: string | null;
        artists?: MusicEntityRef[];
        displayName?: string | null;
      } = {
        displayName: displayName.trim() || null,
      };

      if (kind === "track") {
        payload.trackTitle = trackTitle.trim();
        payload.albumTitle = albumTitle.trim() || null;
        payload.artists = artists.map((a) => ({
          id: a.id,
          name: a.name,
        }));
        if (!payload.trackTitle) {
          setError("Track title is required");
          return;
        }
        if (!payload.artists?.length) {
          setError("At least one artist is required");
          return;
        }
      } else if (kind === "album") {
        payload.albumTitle = albumTitle.trim() || trackTitle.trim();
        payload.artists = artists.map((a) => ({
          id: a.id,
          name: a.name,
        }));
        if (!payload.albumTitle) {
          setError("Album title is required");
          return;
        }
        if (!payload.artists?.length) {
          setError("At least one artist is required");
          return;
        }
      } else {
        payload.artists = artists.map((a) => ({
          id: a.id,
          name: a.name,
        }));
        if (!payload.artists?.length) {
          setError("Artist is required");
          return;
        }
      }

      const result = await onSave(payload);
      setOpen(false);
      onSaved?.(result ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const original = form.data?.original;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        Edit
      </button>

      <Dialog open={open} onClose={handleClose} title="Metadata">
        {form.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : (
          <>
            {original ? (
              <p className="text-sm text-[var(--muted)]">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  Original scrobble
                </span>
                <span className="mt-1 block text-[var(--ink)]">
                  {kind === "track" ? (
                    <>
                      {original.title}
                      {original.artistName ? ` · ${original.artistName}` : ""}
                      {original.albumTitle ? ` · ${original.albumTitle}` : ""}
                    </>
                  ) : kind === "album" ? (
                    <>
                      {original.albumTitle ?? original.title}
                      {original.artistName ? ` · ${original.artistName}` : ""}
                    </>
                  ) : (
                    original.artistName
                  )}
                </span>
              </p>
            ) : null}

            <div className="mt-5 space-y-4">
              {kind === "track" ? (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                    Track title
                  </span>
                  <input
                    type="text"
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </label>
              ) : null}

              {kind === "album" ? (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                    Album title
                  </span>
                  <input
                    type="text"
                    value={albumTitle || trackTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </label>
              ) : null}

              <EntityTagInput
                kind="artist"
                label={kind === "artist" ? "Correct artist" : "Artists"}
                value={artists}
                onChange={setArtists}
                multiple={kind !== "artist"}
                disabled={saving}
              />

              {kind === "track" ? (
                <EntityTagInput
                  kind="album"
                  label="Album (optional)"
                  value={
                    albumTitle.trim()
                      ? [{ name: albumTitle.trim() }]
                      : []
                  }
                  onChange={(tags) => setAlbumTitle(tags[0]?.name ?? "")}
                  multiple={false}
                  placeholder="Leave empty if unknown"
                  disabled={saving}
                />
              ) : null}

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  Display name (optional)
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Rename without reassigning"
                  className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>

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
          </>
        )}
      </Dialog>
    </>
  );
}
