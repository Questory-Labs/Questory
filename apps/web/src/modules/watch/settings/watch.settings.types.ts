import type { ChangeEvent, DragEvent, RefObject } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { LetterboxdKind } from "./watch.settings.constants";

export type ConnStatus = {
  connected: boolean;
  userId?: string;
  lastSyncedAt?: string | null;
};

export type LetterboxdJob = {
  id: string;
  status: string;
  total: number;
  accepted: number;
  skipped: number;
  processed: number;
  percent: number | null;
  fileName?: string | null;
  lastError?: string | null;
};

export type ApiKeyMeta = {
  id: string;
  type: string;
  tokenPrefix: string;
  label?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

export type IdentityResponse = {
  steamId: string | null;
  listenbrainzUsername: string | null;
  keys: ApiKeyMeta[];
};

export type LiveSourceId = "trakt" | "anilist" | "webhook";

export type UnusedSource = {
  id: LiveSourceId;
  label: string;
  hint: string;
};

export type WatchSettingsViewProps = {
  trakt: UseResourceResult<ConnStatus>;
  traktConnected: boolean;
  showTrakt: boolean;
  showAnilist: boolean;
  showWebhook: boolean;
  showingLive: boolean;
  webhookActive: boolean;
  chooserOptions: UnusedSource[];
  addOpen: boolean;
  setAddOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  selectSource: (id: LiveSourceId) => void;
  file: File | null;
  dragging: boolean;
  busy: boolean;
  progress: LetterboxdJob | null;
  include: Record<LetterboxdKind, boolean>;
  importMsg: string | null;
  importOk: boolean;
  importFailed: boolean;
  isCsv: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  setDragging: (dragging: boolean) => void;
  toggleKind: (kind: LetterboxdKind) => void;
  onImport: () => void;
  clearFile: () => void;
};
