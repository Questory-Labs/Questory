"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type {
  PlaySessionAssignResult,
  PlaySessionGameSuggestItem,
  PlaySessionGameSuggestPage,
  PlaySessionItem,
  PlaySessionSimilar,
} from "@questorylabs/shared";
import { Button, Dialog, StateMessage } from "@/components/ui";
import { api } from "@/lib/api";

type SessionAssignDialogProps = {
  open: boolean;
  session: PlaySessionItem;
  onClose: () => void;
};

export const SessionAssignDialog = ({
  open,
  session,
  onClose,
}: SessionAssignDialogProps) => {
  const store = useStore();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<PlaySessionGameSuggestItem | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const similar = useResource({
    id: ["play-session-similar", session.id],
    load: () =>
      api<PlaySessionSimilar>(`/play-sessions/${session.id}/similar`),
    when: open,
  });

  const suggest = useResource({
    id: ["play-session-game-suggest", debounced],
    load: () =>
      api<PlaySessionGameSuggestPage>(
        `/play-sessions/game-suggest?q=${encodeURIComponent(debounced)}`,
      ),
    when: open,
  });

  const assign = useAction({
    run: (gameId: string) =>
      api<PlaySessionAssignResult>(`/play-sessions/${session.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ gameId }),
      }),
    onSuccess: () => {
      store.touch(["play-sessions"]);
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebounced("");
    setSelected(null);
    setError(null);
    setPickerOpen(false);
    setActiveIndex(0);
  }, [open, session.id]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleClose = () => {
    if (assign.busy) return;
    onClose();
  };

  const items = suggest.value?.items ?? [];
  const matchLabel =
    similar.value?.matchKind === "exe"
      ? similar.value.matchValue
      : similar.value
        ? `“${similar.value.matchValue}”`
        : null;

  return (
    <Dialog open={open} onClose={handleClose} title="Assign session">
      {similar.empty ? (
        <StateMessage variant="loading" className="mt-0" />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Original
            </span>
            <span className="mt-1 block text-[var(--ink)]">
              {session.title}
              {session.exe ? ` · ${session.exe}` : ""}
            </span>
          </p>

          {similar.value ? (
            <p className="text-sm text-[var(--muted)]">
              {similar.value.count.toLocaleString()} session
              {similar.value.count === 1 ? "" : "s"} match{" "}
              {similar.value.matchKind === "exe" ? "exe" : "title"}{" "}
              {matchLabel}.
            </p>
          ) : null}

          <div ref={wrapRef}>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                Library game
              </span>
              {selected ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-[var(--ink)]">
                    {selected.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 px-2 py-1"
                    onClick={() => setSelected(null)}
                    disabled={assign.busy}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  value={query}
                  disabled={assign.busy}
                  placeholder="Search your library…"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPickerOpen(true);
                    setActiveIndex(0);
                  }}
                  onFocus={() => setPickerOpen(true)}
                  onKeyDown={(e) => {
                    if (!pickerOpen || items.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveIndex((i) =>
                        Math.min(i + 1, items.length - 1),
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveIndex((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const item = items[activeIndex];
                      if (item) {
                        setSelected(item);
                        setQuery("");
                        setPickerOpen(false);
                      }
                    }
                  }}
                  className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              )}
            </label>
            {pickerOpen && !selected && items.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className="mt-1 max-h-48 overflow-auto rounded border border-[var(--line)] bg-[var(--bg-1)]"
              >
                {items.map((item, i) => (
                  <li key={item.gameId} role="option" aria-selected={i === activeIndex}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        i === activeIndex
                          ? "bg-[var(--bg-2)] text-[var(--ink)]"
                          : "text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        setSelected(item);
                        setQuery("");
                        setPickerOpen(false);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {selected && similar.value ? (
            <p className="text-sm text-[var(--muted)]">
              Assign {similar.value.count.toLocaleString()} session
              {similar.value.count === 1 ? "" : "s"} matching {matchLabel} to
              “{selected.name}”? Future sessions with the same{" "}
              {similar.value.matchKind} will also count toward that game.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={assign.busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selected || assign.busy || similar.empty}
              onClick={() => {
                if (!selected) return;
                setError(null);
                assign.submit(selected.gameId);
              }}
            >
              {assign.busy ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
