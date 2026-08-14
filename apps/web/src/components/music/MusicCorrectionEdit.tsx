"use client";

import { useEffect, useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { MusicCorrectionForm, MusicEntityRef } from "@questorylabs/shared";
import { Button, Dialog, StateMessage } from "@/components/ui";
import { EntityTagInput, type EntityTag } from "@/components/music/EntityTagInput";
import { MusicCorrectionMergePanel } from "@/components/music/MusicCorrectionMergePanel";
import { musicFetch } from "@/lib/music";

type CorrectionTab = "edit" | "merge";

type MusicCorrectionEditProps = {
  kind: "track" | "album" | "artist";
  entityId: string;
  saving?: boolean;
  merging?: boolean;
  onSave: (values: {
    trackTitle?: string;
    albumTitle?: string | null;
    artists?: MusicEntityRef[];
    artistName?: string;
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
  const [tab, setTab] = useState<CorrectionTab>("edit");
  const [trackTitle, setTrackTitle] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [artistCredit, setArtistCredit] = useState("");
  const [artists, setArtists] = useState<EntityTag[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const showMergeTab = kind === "track" && Boolean(onMerge);

  const form = useResource({
    id: ["music-correction-form", kind, entityId],
    load: () =>
      musicFetch<MusicCorrectionForm>(`/corrections/${kind}s/${entityId}`),
    when: open && Boolean(entityId),
  });

  useEffect(() => {
    if (!open || !form.value) return;
    setTrackTitle("");
    setAlbumTitle("");
    setArtistCredit("");
    setDisplayName("");
    setError(null);
    setTab("edit");

    const currentArtists = form.value.current.artists ?? [];
    const hasSplit =
      Boolean(form.value.current.artistCredit) || currentArtists.length > 1;
    setArtists(
      kind === "track"
        ? hasSplit
          ? currentArtists.map((a) => ({ id: a.id, name: a.name }))
          : []
        : [],
    );
  }, [open, form.value, kind]);

  function handleClose() {
    if (saving || merging) return;
    setOpen(false);
    setError(null);
    setTab("edit");
  }

  async function handleSave() {
    setError(null);
    try {
      const payload: {
        trackTitle?: string;
        albumTitle?: string | null;
        artists?: MusicEntityRef[];
        artistName?: string;
        displayName?: string | null;
      } = {};

      const trimmedDisplayName = displayName.trim();
      if (trimmedDisplayName) {
        payload.displayName = trimmedDisplayName;
      }

      if (kind === "track") {
        const trimmedTrackTitle = trackTitle.trim();
        const trimmedAlbumTitle = albumTitle.trim();
        const trimmedCredit = artistCredit.trim();
        if (trimmedTrackTitle) payload.trackTitle = trimmedTrackTitle;
        if (trimmedAlbumTitle) payload.albumTitle = trimmedAlbumTitle;
        if (trimmedCredit) payload.artistName = trimmedCredit;
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

  const original = form.value?.original;
  const current = form.value?.current;
  const creditPlaceholder =
    current?.artistCredit ||
    original?.artistName ||
    (current?.artists?.length
      ? current.artists.map((a) => a.name).join(", ")
      : "Leave empty to keep original credit");

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
        {form.empty ? (
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

            {showMergeTab ? (
              <div
                className="mt-5 flex flex-wrap gap-1 border-b border-[var(--line)] pb-3"
                role="tablist"
                aria-label="Metadata actions"
              >
                {(
                  [
                    { value: "edit", label: "Edit" },
                    { value: "merge", label: "Merge" },
                  ] as const
                ).map((item) => {
                  const active = tab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setTab(item.value);
                        setError(null);
                      }}
                      className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                        active
                          ? "text-[var(--ink)] underline decoration-[var(--accent)] underline-offset-8"
                          : "text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {tab === "merge" && showMergeTab && onMerge ? (
              <div className="mt-5">
                <MusicCorrectionMergePanel
                  entityId={entityId}
                  listenCount={form.value?.sourceListenCount ?? 0}
                  merging={merging}
                  disabled={saving}
                  onMerge={onMerge}
                  onMerged={(result) => {
                    setOpen(false);
                    onSaved?.(result);
                  }}
                />
                <div className="mt-4 flex items-center justify-end border-t border-[var(--line)] pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={saving || merging}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
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
                      placeholder={
                        current?.albumTitle ??
                        current?.title ??
                        "Leave empty to keep current"
                      }
                      className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                    />
                  </label>
                ) : null}

                {kind === "track" ? (
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                      Artists
                    </span>
                    <input
                      type="text"
                      value={artistCredit}
                      onChange={(e) => setArtistCredit(e.target.value)}
                      placeholder={creditPlaceholder}
                      className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                    />
                  </label>
                ) : (
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
                )}

                {kind === "track" ? (
                  <div>
                    <EntityTagInput
                      kind="artist"
                      label="Individual artists"
                      value={artists}
                      onChange={setArtists}
                      multiple
                      placeholder="Enter each artist one by one…"
                      disabled={saving}
                    />
                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      This track will appear under all of them. The credited name
                      stays the same.
                    </p>
                  </div>
                ) : null}

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
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || merging}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
