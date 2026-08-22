import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";

export type Settings = {
  signupEnabled: boolean;
  signupOpen: boolean;
  abuse: Record<string, number>;
};

export type AdminSettingsViewProps = {
  settings: UseResourceResult<Settings>;
  patch: UseActionResult<unknown, boolean>;
};
