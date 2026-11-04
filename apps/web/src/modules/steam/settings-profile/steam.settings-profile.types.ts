import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type {
  MeResponse,
  ProfileExportStatus,
  ProfileImportJob,
  User,
} from "@questorylabs/shared";

export type PriceRegion = {
  countryCode: string;
  currency: string;
  label: string;
};

export type ApiKeyType = "music_ingest" | "watch_webhook";

export type ApiKeyMeta = {
  id: string;
  type: string;
  tokenPrefix: string;
  label?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

export type ApiKeyIdentity = {
  steamId: string | null;
  listenbrainzUsername: string | null;
  keys: ApiKeyMeta[];
  nativeScrobbling?: boolean;
};

export type ApiKeyCreated = {
  id: string;
  type: string;
  tokenPrefix: string;
  token: string;
  listenbrainzUsername?: string | null;
};

export type RecapSettings = { monthly: boolean; global: boolean };

export type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ProfileApiKeys = {
  identity: UseResourceResult<ApiKeyIdentity>;
  plainToken: { type: ApiKeyType; token: string } | null;
  create: UseActionResult<ApiKeyCreated, ApiKeyType>;
  revoke: UseActionResult<unknown, string>;
  copy: (type: ApiKeyType) => void;
  copied: ApiKeyType | null;
  error: string | null;
};

export type ProfileRecap = {
  settings: UseResourceResult<RecapSettings>;
  save: UseActionResult<RecapSettings, boolean>;
  error: string | null;
};

export type ProfileChangePassword = {
  open: boolean;
  setOpen: (open: boolean) => void;
  submit: (form: PasswordForm) => void;
  busy: boolean;
  error: string | null;
  done: boolean;
};

export type ProfileDeleteAccount = {
  open: boolean;
  setOpen: (open: boolean) => void;
  confirmText: string;
  setConfirmText: (value: string) => void;
  submit: () => void;
  busy: boolean;
  error: string | null;
};

export type ProfileSettingsViewProps = {
  regions: UseResourceResult<PriceRegion[]>;
  countryCode: string;
  onCountryChange: (code: string) => void;
  save: UseActionResult<MeResponse, string>;
  message: string | null;
  error: string | null;
  selected: PriceRegion | undefined;
  dirty: boolean;
  user: User | null;
  showMusic: boolean;
  showWatch: boolean;
  exportStatus: UseResourceResult<ProfileExportStatus>;
  generateExport: UseActionResult<ProfileExportStatus, void>;
  downloadExport: UseActionResult<void, void>;
  importJob: UseResourceResult<ProfileImportJob | null>;
  importFile: File | null;
  importConfirmOpen: boolean;
  onPickImportFile: (file: File | null) => void;
  onOpenImportConfirm: () => void;
  onCloseImportConfirm: () => void;
  runImport: UseActionResult<ProfileImportJob, File>;
  apiKeys: ProfileApiKeys;
  recap: ProfileRecap;
  changePassword: ProfileChangePassword;
  deleteAccount: ProfileDeleteAccount;
};
