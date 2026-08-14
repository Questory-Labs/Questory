"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { EntityTagInput, type EntityTag } from "@/components/music/EntityTagInput";

type MusicCorrectionMergePanelProps = {
  entityId: string;
  listenCount: number;
  merging?: boolean;
  disabled?: boolean;
  onMerge: (targetTrackId: string) => Promise<{ trackId?: string } | void>;
  onMerged?: (result?: { trackId?: string }) => void;
};

export function MusicCorrectionMergePanel({
  entityId,
  listenCount,
  merging = false,
  disabled = false,
  onMerge,
  onMerged,
}: MusicCorrectionMergePanelProps) {
  const [mergeTarget, setMergeTarget] = useState<EntityTag[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = mergeTarget[0];

  function requestConfirm() {
    setError(null);
    if (!target?.id) {
      setError("Choose an existing track to merge into");
      return;
    }
    if (target.id === entityId) {
      setError("Cannot merge a track into itself");
      return;
    }
    setConfirming(true);
  }

  async function handleConfirm() {
    if (!target?.id) return;
    setError(null);
    try {
      const result = await onMerge(target.id);
      setConfirming(false);
      onMerged?.(result ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
      setConfirming(false);
    }
  }

  const confirmBody =
    listenCount > 0
      ? `Move your ${listenCount.toLocaleString()} listen${listenCount === 1 ? "" : "s"} from this track into “${target?.name ?? "that track"}”? Future scrobbles with the same original metadata will also count toward that track.`
      : `Route future scrobbles with this track’s original metadata into “${target?.name ?? "that track"}”?`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Merge this historical track into another one in your library.
        {listenCount
          ? ` You have ${listenCount.toLocaleString()} listen${listenCount === 1 ? "" : "s"} here.`
          : null}
      </p>

      {confirming ? (
        <p className="text-sm text-[var(--ink)]">{confirmBody}</p>
      ) : (
        <EntityTagInput
          kind="track"
          label="Merge into track"
          value={mergeTarget}
          onChange={setMergeTarget}
          multiple={false}
          placeholder="Search your tracks…"
          disabled={disabled || merging}
        />
      )}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex justify-end gap-2">
        {confirming ? (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={merging}
            >
              Back
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={merging}>
              {merging ? "Merging…" : "Confirm merge"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={requestConfirm}
            disabled={disabled || merging || mergeTarget.length === 0}
          >
            Merge
          </Button>
        )}
      </div>
    </div>
  );
}
