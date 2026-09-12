"use client";

import { Button, Dialog, Panel } from "@/components/ui";
import type { ProfileSettingsViewProps } from "./steam.settings-profile.types";

type Props = Pick<
  ProfileSettingsViewProps,
  | "exportStatus"
  | "generateExport"
  | "downloadExport"
  | "importJob"
  | "importFile"
  | "importConfirmOpen"
  | "onPickImportFile"
  | "onOpenImportConfirm"
  | "onCloseImportConfirm"
  | "runImport"
>;

export const ProfileDataPanel = ({
  exportStatus,
  generateExport,
  downloadExport,
  importJob,
  importFile,
  importConfirmOpen,
  onPickImportFile,
  onOpenImportConfirm,
  onCloseImportConfirm,
  runImport,
}: Props) => {
  const status = exportStatus.value;
  const generating = Boolean(status?.inProgress) || generateExport.busy;
  const downloadReady = Boolean(status?.downloadReady);
  const importRunning = importJob.value?.status === "running" || runImport.busy;
  const expiresLabel = status?.expiresAt
    ? new Date(status.expiresAt).toLocaleString()
    : null;

  return (
    <>
      <Panel wrapperClassName="max-w-lg" className="p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Your data
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Download a zip of your Questory data (collections, prices, listens,
          watch/read history, play sessions). It does not include logins or API
          keys — reconnect services under Connections, then import this file.
          Zips are kept for 7 days.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={generating}
            onClick={() => generateExport.submit()}
          >
            {generating ? "Preparing…" : "Generate export"}
          </Button>
          <Button
            variant="secondary"
            disabled={!downloadReady || downloadExport.busy}
            onClick={() => downloadExport.submit()}
          >
            {downloadExport.busy ? "Downloading…" : "Download zip"}
          </Button>
        </div>

        {status?.inProgress ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Export in progress. You can still download a previous zip if one is
            ready.
          </p>
        ) : null}
        {downloadReady && expiresLabel ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Available until {expiresLabel}
            {status?.fileName ? ` · ${status.fileName}` : ""}
          </p>
        ) : null}
        {status?.status === "failed" && status.lastError ? (
          <p className="mt-3 text-sm text-[var(--danger)]">{status.lastError}</p>
        ) : null}
        {generateExport.failed ? (
          <p className="mt-3 text-sm text-[var(--danger)]">
            Could not start export
            {generateExport.error instanceof Error
              ? `: ${generateExport.error.message}`
              : ""}
          </p>
        ) : null}

        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <p className="text-sm text-[var(--muted)]">
            Import a Questory profile zip. Existing data is merged; duplicates
            are skipped.
          </p>
          <label className="mt-3 block text-sm">
            <span className="text-[var(--muted)]">Profile zip</span>
            <input
              type="file"
              accept=".zip,application/zip"
              disabled={importRunning}
              className="mt-1.5 block w-full text-sm"
              onChange={(e) =>
                onPickImportFile(e.target.files?.[0] ?? null)
              }
            />
          </label>
          <div className="mt-4">
            <Button
              variant="secondary"
              disabled={!importFile || importRunning}
              onClick={onOpenImportConfirm}
            >
              {importRunning ? "Importing…" : "Import zip"}
            </Button>
          </div>
          {importJob.value?.status === "running" ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Importing…
              {importJob.value.total > 0
                ? ` ${importJob.value.processed.toLocaleString()} / ${importJob.value.total.toLocaleString()}`
                : ""}
            </p>
          ) : null}
          {importJob.value?.status === "completed" ? (
            <p className="mt-3 text-sm text-[var(--accent)]">
              Imported {importJob.value.accepted} records (
              {importJob.value.skipped} skipped).
            </p>
          ) : null}
          {importJob.value?.status === "failed" && importJob.value.lastError ? (
            <p className="mt-3 text-sm text-[var(--danger)]">
              {importJob.value.lastError}
            </p>
          ) : null}
        </div>
      </Panel>

      <Dialog
        open={importConfirmOpen}
        onClose={onCloseImportConfirm}
        title="Import profile data?"
      >
        <p className="text-sm text-[var(--muted)]">
          This merges the zip into your account. It does not reconnect Steam or
          other services, and it will not delete existing data. Duplicate
          history is skipped.
        </p>
        {importFile ? (
          <p className="mt-3 font-mono text-xs text-[var(--faint)]">
            {importFile.name}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCloseImportConfirm}>
            Cancel
          </Button>
          <Button
            disabled={!importFile || runImport.busy}
            onClick={() => {
              if (!importFile) return;
              runImport.submit(importFile);
            }}
          >
            {runImport.busy ? "Importing…" : "Import"}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
