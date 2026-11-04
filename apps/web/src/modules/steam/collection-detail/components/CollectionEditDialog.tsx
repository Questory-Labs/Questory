"use client";

import { useState } from "react";
import { Button, Dialog } from "@questorylabs/ui";
import { COLLECTION_COLORS } from "../../collections/steam.collections.constants";
import type { CollectionEditInput } from "../steam.collection-detail.types";

export const CollectionEditDialog = ({
  open,
  initial,
  busy,
  failed,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: { name: string; description: string | null; color?: string | null };
  busy: boolean;
  failed: boolean;
  onClose: () => void;
  onSave: (input: CollectionEditInput) => void;
}) => {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [color, setColor] = useState<string | null>(initial.color ?? null);
  return (
    <Dialog open={open} onClose={onClose} title="Edit collection">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
            description: description.trim(),
            color,
          });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-[var(--muted)]">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            className="field mt-0"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-[var(--muted)]">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            className="field mt-0"
          />
        </label>
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="mb-1.5 text-sm text-[var(--muted)]">Color</legend>
          <button
            type="button"
            aria-pressed={color == null}
            onClick={() => setColor(null)}
            className={`min-h-8 rounded-full border px-3 text-xs ${color == null ? "border-white/40 text-[var(--ink)]" : "border-white/10 text-[var(--muted)]"}`}
          >
            None
          </button>
          {COLLECTION_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
        </fieldset>
        {failed ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            Could not save changes.
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
