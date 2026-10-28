import type { PriceRegion } from "./steam.settings-profile.types";

export const PROFILE_INPUT_CLASS =
  "min-h-[46px] w-full rounded-full border border-white/[0.08] bg-black/30 px-[18px] font-sans text-[15px] font-light normal-case tracking-normal text-[var(--ink)] outline-none transition-colors duration-300 hover:border-white/20 focus:border-white/20";

export const DEFAULT_PRICE_REGIONS: PriceRegion[] = [
  { countryCode: "IN", currency: "INR", label: "India (INR)" },
];
