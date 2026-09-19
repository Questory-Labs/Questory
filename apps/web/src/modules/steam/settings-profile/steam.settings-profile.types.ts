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
};
