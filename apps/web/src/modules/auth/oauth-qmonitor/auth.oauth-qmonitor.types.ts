import type { LinkState } from "@/components/dots/dot-painters";

export type OAuthOutcome = "approved" | "declined" | null;

export type QmonitorAuthorizeViewProps = {
  queryValid: boolean;
  isLoading: boolean;
  loggedIn: boolean;
  userLabel: string;
  loginHref: string;
  error: string | null;
  busy: boolean;
  pendingReady: boolean;
  outcome: OAuthOutcome;
  linkState: LinkState;
  onAuthorize: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
  onBackHome: () => void;
};
