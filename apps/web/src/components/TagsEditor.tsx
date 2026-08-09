"use client";

import { useEffect, useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type MediaTagType =
  | "steam_game"
  | "music_track"
  | "watch_title"
  | "read_title";

type TagsResponse = {
  mediaType: MediaTagType;
  mediaId: string;
  tags: { id: string; name: string; isUserModified: boolean; weight: number }[];
};

function parseItemKey(itemKey: string): {
  mediaType: MediaTagType;
  mediaId: string;
} | null {
  const idx = itemKey.indexOf(":");
  if (idx <= 0) return null;
  const mediaType = itemKey.slice(0, idx);
  const mediaId = itemKey.slice(idx + 1);
  if (
    mediaType !== "steam_game" &&
    mediaType !== "music_track" &&
    mediaType !== "watch_title" &&
    mediaType !== "read_title"
  ) {
    return null;
  }
  if (!mediaId) return null;
  return { mediaType, mediaId };
}

export function TagsEditor({ itemKey }: { itemKey: string }) {
  const parsed = parseItemKey(itemKey);
  const store = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const resource = useResource({
    id: ["media-tags", parsed?.mediaType, parsed?.mediaId],
    load: () => {
      if (!parsed) throw new Error("Invalid item key");
      const params = new URLSearchParams({
        mediaType: parsed.mediaType,
        mediaId: parsed.mediaId,
      });
      return api<TagsResponse>(`/tags?${params}`);
    },
    when: parsed != null,
  });

  useEffect(() => {
    if (resource.value) {
      setTags(resource.value.tags.map((t) => t.name));
    }
  }, [resource.value]);

  const save = useAction({
    run: (next: string[]) => {
      if (!parsed) throw new Error("Invalid item key");
      return api<TagsResponse>("/tags/modify", {
        method: "POST",
        body: JSON.stringify({
          mediaType: parsed.mediaType,
          mediaId: parsed.mediaId,
          tags: next,
        }),
      });
    },
    onSuccess: () => {
      store.touch(["media-tags", parsed?.mediaType, parsed?.mediaId]);
      setIsEditing(false);
    },
  });

  if (!parsed) {
    return (
      <Panel className="p-4">
        <p className="text-sm text-[var(--danger)]">Invalid tag target.</p>
      </Panel>
    );
  }

  const handleAdd = () => {
    const next = draft.trim();
    if (!next) return;
    if (!tags.includes(next)) setTags([...tags, next]);
    setDraft("");
  };

  const handleRemove = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-[var(--ink)]">Tags</h3>
        {!isEditing ? (
          <Button
            variant="secondary"
            onClick={() => setIsEditing(true)}
            className="px-2.5 py-1 text-xs"
          >
            Edit
          </Button>
        ) : null}
      </div>

      {resource.empty && !resource.value ? (
        <p className="text-sm text-[var(--muted)]">Loading tags…</p>
      ) : null}
      {resource.failed ? (
        <p className="text-sm text-[var(--warm)]">
          {(resource.error as Error).message}
        </p>
      ) : null}

      {resource.value ? (
        <>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center rounded bg-[var(--bg-2)] px-2.5 py-1 text-xs text-[var(--ink)]"
              >
                {tag}
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(tag)}
                    className="ml-2 text-[var(--muted)] hover:text-[var(--danger)]"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
            {tags.length === 0 && !isEditing ? (
              <span className="text-xs text-[var(--muted)]">No tags yet.</span>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Add tag…"
                className="min-w-[10rem] flex-1 rounded border border-[var(--line)] bg-[var(--bg-1)] px-3 py-1.5 text-sm"
              />
              <Button variant="secondary" onClick={handleAdd}>
                Add
              </Button>
              <Button
                variant="primary"
                disabled={save.busy}
                onClick={() => save.submit(tags)}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                disabled={save.busy}
                onClick={() => {
                  setTags(resource.value?.tags.map((t) => t.name) ?? []);
                  setDraft("");
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : null}

          {save.failed ? (
            <p className="mt-2 text-xs text-[var(--warm)]">
              {(save.error as Error).message}
            </p>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
