import type { AuthChallenge } from "@/lib/auth-api";
import type { Dispatch, FormEvent, SetStateAction } from "react";

export type RegisterViewProps = {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  pending: boolean;
  challenge: AuthChallenge | null;
  challengeLoading: boolean;
  refreshChallenge: () => Promise<AuthChallenge | null>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  closed: boolean;
};
