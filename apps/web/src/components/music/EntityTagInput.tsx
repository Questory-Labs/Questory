"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MusicCatalogSuggestItem } from "@questorylabs/shared";
import { musicFetch } from "@/lib/music";

export type EntityTag = {
  id?: string;
  name: string;
};

type EntityTagInputProps = {
  kind: "artist" | "album" | "track";
  label: string;
  value: EntityTag[];
  onChange: (value: EntityTag[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

export function EntityTagInput({
  kind,
  label,
  value,
  onChange,
  multiple = false,
  placeholder = "Type to search…",
  disabled = false,
}: EntityTagInputProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MusicCatalogSuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void musicFetch<{ items: MusicCatalogSuggestItem[] }>(
        `/catalog/suggest?kind=${kind}&q=${encodeURIComponent(query)}`,
      ).then((res) => {
        setSuggestions(res.items);
        setActiveIndex(0);
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [kind, query, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addTag(tag: EntityTag) {
    const name = tag.name.trim();
    if (!name) return;
    if (!multiple) {
      onChange([{ id: tag.id, name }]);
      setQuery("");
      setOpen(false);
      return;
    }
    if (value.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      setQuery("");
      setOpen(false);
      return;
    }
    onChange([...value, { id: tag.id, name }]);
    setQuery("");
    setOpen(false);
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function commitQuery() {
    const trimmed = query.trim();
    if (!trimmed) return;
    const match = suggestions[activeIndex];
    if (match) {
      addTag({ id: match.id, name: match.name });
      return;
    }
    addTag({ name: trimmed });
  }

  return (
    <div ref={wrapRef} className="relative">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {label}
      </span>
      <div className="mt-1.5 flex min-h-[42px] flex-wrap items-center gap-1.5 rounded border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1.5">
        {value.map((tag, i) => (
          <span
            key={`${tag.id ?? "new"}-${tag.name}-${i}`}
            className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink)]"
          >
            {tag.name}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label={`Remove ${tag.name}`}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        {!disabled && (multiple || value.length === 0) ? (
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                commitQuery();
              } else if (e.key === "Backspace" && !query && value.length > 0) {
                removeTag(value.length - 1);
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm text-[var(--ink)] outline-none"
            aria-autocomplete="list"
            aria-controls={listId}
          />
        ) : null}
      </div>
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-[var(--line)] bg-[var(--bg-1)] py-1 shadow-lg"
        >
          {suggestions.map((item, i) => (
            <li key={`${item.id ?? "new"}-${item.name}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === activeIndex
                    ? "bg-[var(--bg-0)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--bg-0)] hover:text-[var(--ink)]"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag({ id: item.id, name: item.name })}
              >
                {item.isNew ? `Create “${item.name}”` : item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
