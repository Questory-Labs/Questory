import type { ChangeEvent, DragEvent, RefObject } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";

export type ImportStart = {
  ok: boolean;
  jobId: string;
  source: string;
  status: string;
};

export type ImportJob = {
  id: string;
  source: string;
  status: string;
  fileName?: string | null;
  total: number;
  accepted: number;
  skipped: number;
  processed: number;
  percent: number | null;
  phase: string;
  lastError?: string | null;
  completedAt?: string | null;
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
  nativeScrobbling?: boolean;
};

export type MusicSettingsViewProps = {
  identity: UseResourceResult<IdentityResponse>;
  ingestActive: boolean;
  nativeLocked: boolean;
  lastfmFlash: string | null;
  fileName: string | null;
  message: string | null;
  jobId: string | null;
  job: ImportJob | null;
  restoring: boolean;
  dragging: boolean;
  busy: boolean;
  failed: boolean;
  showProgress: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  setDragging: (dragging: boolean) => void;
};
