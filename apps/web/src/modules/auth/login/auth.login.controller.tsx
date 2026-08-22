"use client";

import { readAbuseFields } from "@/components/auth/AuthFormAbuseFields";
import { useUser } from "@/hooks/useUser";
import {
  fetchLoginChallenge,
  formatAuthError,
  isChallengeKeepAliveError,
  loginAccount,
  parseApiError,
  shouldAutoRetryChallenge,
  type AuthChallenge,
} from "@/lib/auth-api";
import { useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";
import { safeNextPath } from "./auth.login.utils";

export const LoginController = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const store = useStore();
  const search = useSearchParams();
  const nextPath = safeNextPath(search.get("next"));
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { isAuthenticated } = useUser();

  useEffect(() => {
    if (isAuthenticated) router.replace(nextPath);
  }, [isAuthenticated, router, nextPath]);

  const refreshChallenge = useCallback(async () => {
    setChallengeLoading(true);
    try {
      const c = await fetchLoginChallenge();
      setChallenge(c);
      return c;
    } catch {
      setChallenge(null);
      setError("Could not start sign-in. Try again.");
      return null;
    } finally {
      setChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshChallenge();
  }, [refreshChallenge]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const abuse = readAbuseFields(form);
    const credentials = {
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
      ...abuse,
    };

    const attempt = async (ch: AuthChallenge) => {
      await loginAccount({
        ...credentials,
        challengeId: ch.challengeId,
        challengeToken: ch.token,
      });
      await store.touch(["me"]);
      router.replace(nextPath);
    };

    try {
      await attempt(challenge);
    } catch (err) {
      const parsed = parseApiError(err);
      if (isChallengeKeepAliveError(parsed.message)) {
        setError(formatAuthError(err, "login"));
        return;
      }
      if (shouldAutoRetryChallenge(parsed.message)) {
        const fresh = await refreshChallenge();
        if (fresh) {
          try {
            await attempt(fresh);
            return;
          } catch (retryErr) {
            const retryParsed = parseApiError(retryErr);
            setError(formatAuthError(retryErr, "login"));
            if (!isChallengeKeepAliveError(retryParsed.message)) {
              await refreshChallenge();
            }
            return;
          }
        }
      }
      setError(formatAuthError(err, "login"));
      await refreshChallenge();
    } finally {
      setPending(false);
    }
  };

  return cloneElements(children, {
    challenge,
    challengeLoading,
    error,
    setError,
    pending,
    refreshChallenge,
    onSubmit,
  });
};
