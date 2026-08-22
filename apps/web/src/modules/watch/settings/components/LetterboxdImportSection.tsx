"use client";

import { SourcesSectionHeading } from "@/components/sources/SourcesSectionHeading";
import { LETTERBOXD_KINDS } from "../watch.settings.constants";
import type { WatchSettingsViewProps } from "../watch.settings.types";
import { LetterboxdProgress } from "./LetterboxdProgress";
import { SourceCard } from "./SourceCard";
import { StatusPill } from "./StatusPill";

type ImportProps = Pick<
  WatchSettingsViewProps,
  | "file"
  | "dragging"
  | "busy"
  | "progress"
  | "include"
  | "importMsg"
  | "importOk"
  | "importFailed"
  | "isCsv"
  | "inputRef"
  | "onInputChange"
  | "onDrop"
  | "setDragging"
  | "toggleKind"
  | "onImport"
  | "clearFile"
>;

export const LetterboxdImportSection = ({
  file,
  dragging,
  busy,
  progress,
  include,
  importMsg,
  importOk,
  importFailed,
  isCsv,
  inputRef,
  onInputChange,
  onDrop,
  setDragging,
  toggleKind,
  onImport,
  clearFile,
}: ImportProps) => (
  <section>
    <SourcesSectionHeading
      eyebrow="Enrich"
      title="Enrich with history"
      description="Import a Letterboxd export to backfill past watches. This does not replace a live source."
    />
    <div className="grid gap-4 md:grid-cols-2">
      <SourceCard
        label="Import"
        title="Letterboxd"
        blurb="Drop the official Letterboxd export zip (or a single CSV). Pick which files to import — or use scrape sync above."
        status={
          importOk ? (
            <StatusPill tone="ok">Done</StatusPill>
          ) : importFailed ? (
            <StatusPill tone="warn">Error</StatusPill>
          ) : importMsg?.startsWith("Import") ? (
            <StatusPill tone="warn">Running</StatusPill>
          ) : (
            <StatusPill tone="idle">Upload</StatusPill>
          )
        }
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragging(false);
          }}
          onDrop={onDrop}
          className={`rounded border border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? "border-[var(--accent)] bg-[var(--accent-dim)]"
              : "border-[var(--line)] bg-[var(--bg-2)] hover:border-[var(--muted)]"
          }`}
        >
          <p className="text-sm text-[var(--ink)]">
            {file ? file.name : "Drop letterboxd export.zip or a CSV here"}
          </p>
          <p className="mt-1 text-xs text-[var(--faint)]">
            or click to choose · max 20&nbsp;MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.zip,text/csv,application/zip"
            className="sr-only"
            disabled={busy}
            onChange={onInputChange}
          />
        </div>

        <fieldset className="mt-4 space-y-2" disabled={busy}>
          <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Include
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {LETTERBOXD_KINDS.map((k) => (
              <label
                key={k.id}
                className={`flex cursor-pointer items-start gap-2 rounded border px-2.5 py-2 text-sm ${
                  include[k.id]
                    ? "border-[var(--line)] bg-[var(--bg-2)] text-[var(--ink)]"
                    : "border-transparent text-[var(--muted)]"
                } ${isCsv && !include[k.id] ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={include[k.id]}
                  disabled={isCsv && !include[k.id]}
                  onChange={() => toggleKind(k.id)}
                />
                <span>
                  <span className="font-mono text-[12px]">{k.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--faint)]">
                    {k.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!file || busy}
            onClick={() => void onImport()}
          >
            {busy ? "Importing…" : "Import"}
          </button>
          {file ? (
            <button
              type="button"
              className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
              disabled={busy}
              onClick={clearFile}
            >
              Clear
            </button>
          ) : null}
        </div>

        {importMsg ? (
          <p
            className={`mt-3 text-sm ${
              importOk
                ? "text-[var(--accent)]"
                : importMsg.startsWith("Import")
                  ? "text-[var(--muted)]"
                  : "text-[var(--danger)]"
            }`}
          >
            {importMsg}
          </p>
        ) : null}
        {progress ? <LetterboxdProgress job={progress} /> : null}
      </SourceCard>
    </div>
  </section>
);
