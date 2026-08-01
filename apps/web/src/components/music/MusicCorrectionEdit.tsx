"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MusicCorrectionForm, MusicEntityRef } from "@questorylabs/shared";
import { Button, Dialog, StateMessage } from "@/components/ui";
import { EntityTagInput, type EntityTag } from "@/components/music/EntityTagInput";
import { musicFetch } from "@/lib/music";

type MusicCorrectionEditProps = {
  kind: "track" | "album" | "artist";
  entityId: string;
  saving?: boolean;
  merging?: boolean;
  onSave: (values: {
    trackTitle?: string;
    albumTitle?: string | null;
    artists?: MusicEntityRef[];
    displayName?: string | null;
  }) => Promise<{ trackId?: string } | void>;
  onMerge?: (targetTrackId: string) => Promise<{ trackId?: string } | void>;
  onSaved?: (result?: { trackId?: string }) => void;
};

export function MusicCorrectionEdit({
  kind,
  entityId,
  saving = false,
  merging = false,
  onSave,
  onMerge,
  onSaved,
}: MusicCorrectionEditProps) {
  const [open, setOpen] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [artists, setArtists] = useState<EntityTag[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [mergeTarget, setMergeTarget] = useState<EntityTag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useQuery({
    queryKey: ["music-correction-form", kind, entityId],
    queryFn: () =>
      musicFetch<MusicCorrectionForm>(`/corrections/${kind}s/${entityId}`),
    enabled: open && Boolean(entityId),
  });

  useEffect(() => {
    if (!open || !form.data) return;
    setTrackTitle("");
    setAlbumTitle("");
    setArtists([]);
    setDisplayName("");
    setMergeTarget([]);
    setError(null);
  }, [open, form.data]);

  function handleClose() {
    if (saving || merging) return;
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
      } = {};

      const trimmedDisplayName = displayName.trim();
      if (trimmedDisplayName) {
        payload.displayName = trimmedDisplayName;
      }

      if (kind === "track") {
        const trimmedTrackTitle = trackTitle.trim();
        const trimmedAlbumTitle = albumTitle.trim();
        if (trimmedTrackTitle) payload.trackTitle = trimmedTrackTitle;
        if (trimmedAlbumTitle) payload.albumTitle = trimmedAlbumTitle;
        if (artists.length) {
          payload.artists = artists.map((a) => ({
            id: a.id,
            name: a.name,
          }));
        }
      } else if (kind === "album") {
        const trimmedAlbumTitle = (albumTitle || trackTitle).trim();
        if (trimmedAlbumTitle) payload.albumTitle = trimmedAlbumTitle;
        if (artists.length) {
          payload.artists = artists.map((a) => ({
            id: a.id,
            name: a.name,
          }));
        }
      } else if (artists.length) {
        payload.artists = artists.map((a) => ({
          id: a.id,
          name: a.name,
        }));
      }

      if (Object.keys(payload).length === 0) {
        setError("Change at least one field to save");
        return;
      }

      const result = await onSave(payload);
      setOpen(false);
      onSaved?.(result ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleMerge() {
    if (!onMerge) return;
    const target = mergeTarget[0];
    if (!target?.id) {
      setError("Choose an existing track to merge into");
      return;
    }
    if (target.id === entityId) {
      setError("Cannot merge a track into itself");
      return;
    }

    const listenCount = form.data?.sourceListenCount ?? 0;
    const targetName = target.name;
    const confirmed = window.confirm(
      listenCount > 0
        ? `Move your ${listenCount.toLocaleString()} listen${listenCount === 1 ? "" : "s"} from this track into “${targetName}”? Future scrobbles with the same original metadata will also count toward that track.`
        : `Route future scrobbles with this track’s original metadata into “${targetName}”?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      const result = await onMerge(target.id);
      setOpen(false);
      onSaved?.(result ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    }
  }

  const original = form.data?.original;
  const current = form.data?.current;

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
          <StateMessage variant="loading" className="mt-0" />
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
                    placeholder={current?.title ?? "Leave empty to keep current"}
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
                    placeholder={current?.albumTitle ?? current?.title ?? "Leave empty to keep current"}
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
                placeholder={
                  current?.artists?.length
                    ? `Current: ${current.artists.map((a) => a.name).join(", ")}`
                    : "Type to search…"
                }
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
                  placeholder={
                    current?.albumTitle
                      ? `Current: ${current.albumTitle}`
                      : "Leave empty to keep current"
                  }
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
                  placeholder={
                    current?.displayName
                      ? `Current: ${current.displayName}`
                      : "Rename without reassigning"
                  }
                  className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>

              {kind === "track" && onMerge ? (
                <div className="border-t border-[var(--line)] pt-4">
                  <p className="text-sm text-[var(--muted)]">
                    Merge this historical track into another one in your library.
                    {form.data?.sourceListenCount
                      ? ` You have ${form.data.sourceListenCount.toLocaleString()} listen${form.data.sourceListenCount === 1 ? "" : "s"} here.`
                      : null}
                  </p>
                  <div className="mt-3">
                    <EntityTagInput
                      kind="track"
                      label="Merge into track"
                      value={mergeTarget}
                      onChange={setMergeTarget}
                      multiple={false}
                      placeholder="Search your tracks…"
                      disabled={saving || merging}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleMerge}
                      disabled={saving || merging || mergeTarget.length === 0}
                    >
                      {merging ? "Merging…" : "Merge"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={saving || merging}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving || merging}>
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
