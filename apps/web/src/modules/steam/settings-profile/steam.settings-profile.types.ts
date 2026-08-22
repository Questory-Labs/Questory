import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { MeResponse, User } from "@questorylabs/shared";

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
};
