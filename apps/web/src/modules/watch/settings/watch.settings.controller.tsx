"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PropsWithChildren,
} from "react";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { watchFetch, watchUrl } from "@/lib/watch";
import { LETTERBOXD_KINDS, type LetterboxdKind } from "./watch.settings.constants";
import type {
  ConnStatus,
  IdentityResponse,
  LetterboxdJob,
  LiveSourceId,
} from "./watch.settings.types";
import {
  includeFromFile,
  isLetterboxdFile,
  letterboxdImportTone,
  watchLiveSourceState,
} from "./watch.settings.utils";

export const WatchSettingsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LetterboxdJob | null>(null);
  const [include, setInclude] = useState<Record<LetterboxdKind, boolean>>({
    diary: true,
    ratings: true,
    watched: false,
    watchlist: true,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<LiveSourceId, boolean>>>(
    {},
  );

  const trakt = useResource({
    id: ["trakt-status"],
    load: () => watchFetch<ConnStatus>("/trakt/status"),
  });
  const anilist = useResource({
    id: ["watch-anilist-status"],
    load: () => watchFetch<ConnStatus>("/anilist/status"),
  });
  const identity = useResource({
    id: ["api-keys-identity"],
    load: () => api<IdentityResponse>("/api-keys/identity"),
  });

  const applyFile = (next: File | null) => {
    if (!next) return;
    if (!isLetterboxdFile(next)) {
      setImportMsg("Use a Letterboxd export .zip or a .csv file.");
      return;
    }
    setFile(next);
    setImportMsg(null);
    setInclude(includeFromFile(next));
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files?.[0] ?? null);
  };

  const toggleKind = (kind: LetterboxdKind) => {
    setInclude((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startProgressPoll = () => {
    stopPoll();
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const job = await watchFetch<LetterboxdJob | null>("/imports/active");
          if (!job || job.status !== "running") return;
          setProgress(job);
          if (job.total > 0) {
            setImportMsg(
              `Importing… ${job.processed.toLocaleString()} / ${job.total.toLocaleString()}`,
            );
          } else if (job.processed > 0) {
            setImportMsg(`Importing… ${job.processed.toLocaleString()} rows`);
          }
        } catch {
          // ignore transient poll errors while POST is in flight
        }
      })();
    }, 800);
  };

  useEffect(() => () => stopPoll(), []);

  const onImport = async () => {
    if (!file || busy) return;
    const selected = LETTERBOXD_KINDS.filter((k) => include[k.id]).map(
      (k) => k.id,
    );
    if (!selected.length) {
      setImportMsg("Pick at least one CSV to import.");
      return;
    }

    setBusy(true);
    setProgress(null);
    setImportMsg("Importing…");
    startProgressPoll();
    void store.touch(["watch-sync-status"]);
    void store.touch(["shell-sync-status"]);

    const body = new FormData();
    body.append("file", file);
    body.append("include", selected.join(","));
    try {
      const res = await fetch(watchUrl("/imports/letterboxd"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await res.json()) as {
        accepted?: number;
        skipped?: number;
        files?: string[];
        warnings?: string[];
        message?: string | string[];
      };
      if (!res.ok) {
        const msg = Array.isArray(json.message)
          ? json.message.join("; ")
          : typeof json.message === "string"
            ? json.message
            : JSON.stringify(json);
        throw new Error(msg);
      }
      const used = json.files?.length ? ` · ${json.files.join(", ")}` : "";
      const warn = json.warnings?.length
        ? ` · warnings: ${json.warnings.join("; ")}`
        : "";
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              accepted: json.accepted ?? prev.accepted,
              skipped: json.skipped ?? prev.skipped,
              processed:
                (json.accepted ?? prev.accepted) +
                (json.skipped ?? prev.skipped),
              percent: 100,
            }
          : {
              id: "done",
              status: "completed",
              total: (json.accepted ?? 0) + (json.skipped ?? 0),
              accepted: json.accepted ?? 0,
              skipped: json.skipped ?? 0,
              processed: (json.accepted ?? 0) + (json.skipped ?? 0),
              percent: 100,
            },
      );
      setImportMsg(
        `Imported ${json.accepted ?? 0} rows (${json.skipped ?? 0} skipped)${used}${warn}.`,
      );
      void store.touch(["watch-overview"]);
      void store.touch(["watch-recent"]);
      void store.touch(["watch-sync-status"]);
      void store.touch(["shell-sync-status"]);
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed");
      setProgress(null);
    } finally {
      stopPoll();
      setBusy(false);
    }
  };

  const traktConnected = Boolean(trakt.value?.connected);
  const anilistConnected = Boolean(anilist.value?.connected);
  const webhookActive = Boolean(
    (identity.value?.keys || []).find((k) => k.type === "watch_webhook"),
  );
  const live = watchLiveSourceState({
    traktConnected,
    anilistConnected,
    webhookActive,
    expanded,
  });
  const { importOk, importFailed } = letterboxdImportTone(importMsg);
  const isCsv = Boolean(file?.name.toLowerCase().endsWith(".csv"));

  const selectSource = (id: LiveSourceId) => {
    setExpanded((prev) => ({ ...prev, [id]: true }));
    setAddOpen(false);
  };

  return cloneElements(children, {
    trakt,
    traktConnected,
    showTrakt: live.showTrakt,
    showAnilist: live.showAnilist,
    showWebhook: live.showWebhook,
    showingLive: live.showingLive,
    webhookActive,
    chooserOptions: live.chooserOptions,
    addOpen,
    setAddOpen,
    selectSource,
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
    clearFile: () => {
      setFile(null);
      setImportMsg(null);
    },
  });
};
