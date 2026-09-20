import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  AdminInstanceSettings,
  PatchFeatureFlags,
} from "@questorylabs/shared";

export type Settings = AdminInstanceSettings;

export type AdminSettingsViewProps = {
  settings: UseResourceResult<Settings>;
  patch: UseActionResult<Settings, PatchFeatureFlags>;
};
