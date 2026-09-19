"use client";

import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  MeResponse,
  ProfileExportStatus,
  ProfileImportJob,
} from "@questorylabs/shared";
import { api, apiBlob } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";
import { PROFILE_DATA_POLL_MS } from "@/lib/polling";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useUser } from "@/hooks/useUser";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import type { PriceRegion } from "./steam.settings-profile.types";

export const ProfileSettingsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const music = useMusicEnabled();
  const watch = useWatchEnabled();
  const { user } = useUser();
  const [countryCode, setCountryCode] = useState("IN");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const prevImportStatus = useRef<string | undefined>(undefined);
  const awaitingImportCompletion = useRef(false);

  const regions = useResource({
    id: ["price-regions"],
    load: () => api<PriceRegion[]>("/users/price-regions"),
  });

  const exportStatus = useResource({
    id: ["profile-export"],
    load: () => api<ProfileExportStatus>("/users/me/export"),
    refreshEvery: (value) =>
      value?.inProgress ? PROFILE_DATA_POLL_MS : false,
  });

  const importJob = useResource({
    id: ["profile-import"],
    load: () => api<ProfileImportJob | null>("/users/me/import/active"),
    refreshEvery: (value) =>
      value?.status === "running" ? PROFILE_DATA_POLL_MS : false,
  });

  useEffect(() => {
    const cc = user?.countryCode;
    if (cc) setCountryCode(cc.toUpperCase());
  }, [user?.countryCode]);

  useEffect(() => {
    const status = importJob.value?.status;
    const prev = prevImportStatus.current;
    prevImportStatus.current = status;
    const fromRunning = prev === "running" && status === "completed";
    const fromThisSubmit =
      awaitingImportCompletion.current && status === "completed";
    if (!fromRunning && !fromThisSubmit) return;
    awaitingImportCompletion.current = false;
    store.touch(["profile-import"]);
    store.touch(["library"]);
    store.touch(["collections"]);
    store.touch(["wishlist"]);
    store.touch(["cost-summary"]);
    store.touch(["music-overview"]);
    store.touch(["watch-overview"]);
    store.touch(["read-library"]);
  }, [importJob.value?.status, importJob.value?.id, store]);

  const save = useAction({
    run: async (nextCountry: string) => {
      return api<MeResponse>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ countryCode: nextCountry }),
      });
    },
    onSuccess: (data) => {
      setError(null);
      const currency = data.user?.currency || "USD";
      setMessage(
        `Price region set to ${data.user?.countryCode || "—"} (${currency}).`,
      );
      store.touch(["me"]);
      store.touch(["cost-summary"]);
      store.touch(["cost-roi"]);
      store.touch(["dashboard"]);
      store.touch(["wishlist"]);
      store.touch(["family-insights"]);
      store.touch(["family-library"]);
      store.touch(["library"]);
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(parseApiError(err).message || "Failed to update price region");
    },
  });

  const generateExport = useAction({
    run: () =>
      api<ProfileExportStatus>("/users/me/export", { method: "POST" }),
    onSuccess: () => {
      store.touch(["profile-export"]);
    },
  });

  const downloadExport = useAction({
    run: async () => {
      const blob = await apiBlob("/users/me/export/file");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportStatus.value?.fileName || "questory-profile.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });

  const runImport = useAction({
    run: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api<ProfileImportJob>("/users/me/import", {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      setImportConfirmOpen(false);
      awaitingImportCompletion.current = true;
      store.touch(["profile-import"]);
    },
  });

  const selected = (regions.value || []).find(
    (r) => r.countryCode === countryCode,
  );
  const dirty = (user?.countryCode || "").toUpperCase() !== countryCode;

  const onCountryChange = (code: string) => {
    setCountryCode(code);
    setMessage(null);
    setError(null);
  };

  return cloneElements(children, {
    regions,
    countryCode,
    onCountryChange,
    save,
    message,
    error,
    selected,
    dirty,
    user,
    showMusic: music.showMusicNav,
    showWatch: watch.showWatchNav,
    exportStatus,
    generateExport,
    downloadExport,
    importJob,
    importFile,
    importConfirmOpen,
    onPickImportFile: setImportFile,
    onOpenImportConfirm: () => setImportConfirmOpen(true),
    onCloseImportConfirm: () => setImportConfirmOpen(false),
    runImport,
  });
};
