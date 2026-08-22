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
import { musicUrl } from "@/lib/music";
import type {
  IdentityResponse,
  ImportJob,
  ImportStart,
} from "./music.settings.types";
import { isMusicImportFile } from "./music.settings.utils";

export const MusicSettingsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [lastfmFlash, setLastfmFlash] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const identity = useResource({
    id: ["api-keys-identity"],
    load: () => api<IdentityResponse>("/api-keys/identity"),
  });
  const ingestActive = Boolean(
    (identity.value?.keys || []).find((k) => k.type === "music_ingest"),
  );
  const nativeLocked = Boolean(identity.value?.nativeScrobbling);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const applyJob = (next: ImportJob) => {
    setJob(next);
    setJobId(next.id);
    if (next.fileName) setFileName(next.fileName);

    if (next.status === "completed") {
      stopPoll();
      setMessage(
        `Imported ${next.accepted} listens (${next.skipped} skipped).`,
      );
      void store.touch(["music-overview"]);
      void store.touch(["music-recent"]);
      void store.touch(["shell-sync-status"]);
      return;
    }
    if (next.status === "failed") {
      stopPoll();
      setMessage(next.lastError || "Import failed");
      return;
    }
    if (next.phase === "parsing") {
      setMessage("Parsing import file…");
      return;
    }
    setMessage(
      `Importing… ${next.processed.toLocaleString()} / ${next.total.toLocaleString()}`,
    );
  };

  const startPoll = (id: string) => {
    stopPoll();
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(musicUrl(`/imports/${id}`), {
            credentials: "include",
            cache: "no-store",
          });
          if (!res.ok) throw new Error(await res.text());
          const next = (await res.json()) as ImportJob;
          applyJob(next);
        } catch (err) {
          stopPoll();
          setMessage(err instanceof Error ? err.message : "Import failed");
        }
      })();
    }, 1000);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(musicUrl("/imports/active"), {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const active = (await res.json()) as ImportJob | null;
        if (cancelled) return;
        if (active?.status === "running") {
          applyJob(active);
          startPoll(active.id);
        }
      } catch {
        // No active job / music briefly unavailable — ignore on load.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume once on mount
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lastfm = params.get("lastfm");
    if (lastfm === "connected") setLastfmFlash("connected");
    if (lastfm === "error") setLastfmFlash(params.get("reason") || "error");
  }, []);

  const busy =
    job?.status === "running" || restoring || message === "Uploading…";

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setMessage("Uploading…");
    setJob(null);
    setJobId(null);
    stopPoll();

    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch(musicUrl("/imports"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await res.json()) as ImportStart &
        ImportJob & {
          message?: string | { message?: string; jobId?: string };
          jobId?: string;
        };
      const conflictJobId =
        typeof json.jobId === "string"
          ? json.jobId
          : typeof json.message === "object" &&
              json.message &&
              typeof json.message.jobId === "string"
            ? json.message.jobId
            : null;
      if (res.status === 409 && conflictJobId) {
        setMessage("An import is already in progress — resuming…");
        startPoll(conflictJobId);
        const activeRes = await fetch(musicUrl(`/imports/${conflictJobId}`), {
          credentials: "include",
          cache: "no-store",
        });
        if (activeRes.ok) {
          applyJob((await activeRes.json()) as ImportJob);
        }
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof json.message === "string" && json.message
            ? json.message
            : JSON.stringify(json),
        );
      }
      setJobId(json.jobId);
      setMessage(`Import started (${json.source})…`);
      if ("phase" in json) {
        applyJob(json as ImportJob);
      }
      startPoll(json.jobId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    }
  };

  const applyFile = (file: File | null) => {
    if (!file || busy) return;
    if (!isMusicImportFile(file)) {
      setMessage("Use a .db / .sqlite, .json, or .zip music export file.");
      return;
    }
    void onUpload(file);
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

  const failed =
    job?.status === "failed" ||
    (message != null &&
      !message.startsWith("Imported") &&
      !message.startsWith("Import") &&
      !message.startsWith("Upload") &&
      !message.startsWith("Parsing") &&
      !message.startsWith("An import"));

  const showProgress =
    job != null &&
    (job.status === "running" ||
      job.status === "completed" ||
      job.status === "failed");

  return cloneElements(children, {
    identity,
    ingestActive,
    nativeLocked,
    lastfmFlash,
    fileName,
    message,
    jobId,
    job,
    restoring,
    dragging,
    busy,
    failed,
    showProgress,
    inputRef,
    onInputChange,
    onDrop,
    setDragging,
  });
};
