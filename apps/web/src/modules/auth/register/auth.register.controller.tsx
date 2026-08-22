"use client";

import { readAbuseFields } from "@/components/auth/AuthFormAbuseFields";
import { useUser } from "@/hooks/useUser";
import {
  fetchRegisterChallenge,
  fetchSignupStatus,
  formatAuthError,
  isChallengeKeepAliveError,
  parseApiError,
  registerAccount,
  shouldAutoRetryChallenge,
  type AuthChallenge,
} from "@/lib/auth-api";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";

export const RegisterController = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const store = useStore();
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { isAuthenticated } = useUser();
  const signup = useResource({
    id: ["signup-status"],
    load: fetchSignupStatus,
    retries: false,
  });

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const refreshChallenge = useCallback(async () => {
    setChallengeLoading(true);
    try {
      const c = await fetchRegisterChallenge();
      setChallenge(c);
      return c;
    } catch {
      setChallenge(null);
      setError("Could not start registration. Try again.");
      return null;
    } finally {
      setChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signup.value && !signup.value.open) {
      setChallengeLoading(false);
      return;
    }
    if (!signup.value) return;
    void refreshChallenge();
  }, [signup.value, refreshChallenge]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }
    const abuse = readAbuseFields(form);
    const credentials = {
      email: String(fd.get("email") || ""),
      password,
      confirmPassword,
      ...abuse,
    };

    const attempt = async (ch: AuthChallenge) => {
      const res = await registerAccount({
        ...credentials,
        challengeId: ch.challengeId,
        challengeToken: ch.token,
      });
      if (res.ok && res.user) {
        await store.touch(["me"]);
        router.replace("/dashboard");
        return;
      }
      // Honeypot fake success or odd response
      if (res.ok && !res.user) {
        router.replace("/login");
        return;
      }
      setError("Unable to create account");
      await refreshChallenge();
    };

    try {
      await attempt(challenge);
    } catch (err) {
      const parsed = parseApiError(err);
      if (isChallengeKeepAliveError(parsed.message)) {
        setError(formatAuthError(err, "register"));
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
            setError(formatAuthError(retryErr, "register"));
            if (!isChallengeKeepAliveError(retryParsed.message)) {
              await refreshChallenge();
            }
            return;
          }
        }
      }
      setError(formatAuthError(err, "register"));
      await refreshChallenge();
    } finally {
      setPending(false);
    }
  };

  const closed = Boolean(signup.value && !signup.value.open);

  return cloneElements(children, {
    challenge,
    challengeLoading,
    error,
    setError,
    pending,
    refreshChallenge,
    onSubmit,
    closed,
  });
};
