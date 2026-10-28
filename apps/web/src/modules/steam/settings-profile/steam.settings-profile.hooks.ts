"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { DELETE_ACCOUNT_CONFIRMATION } from "@questorylabs/shared";
import { api, apiOnce } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";
import { useDropEpochBump } from "@/providers/StatusProvider";
import type {
  ApiKeyCreated,
  ApiKeyIdentity,
  ApiKeyType,
  PasswordForm,
  ProfileApiKeys,
  ProfileChangePassword,
  ProfileDeleteAccount,
  ProfileRecap,
  RecapSettings,
} from "./steam.settings-profile.types";
import {
  changePasswordErrorMessage,
  passwordFormError,
} from "./steam.settings-profile.utils";

const CLIPBOARD_ERROR = "Clipboard is unavailable. Select the key and copy it manually.";

export function useProfileApiKeys(): ProfileApiKeys {
  const store = useStore();
  const [plainToken, setPlainToken] = useState<ProfileApiKeys["plainToken"]>(null);
  const [copied, setCopied] = useState<ApiKeyType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identity = useResource({
    id: ["api-keys-identity"],
    load: () => api<ApiKeyIdentity>("/api-keys/identity"),
  });

  const touch = () => {
    void store.touch(["api-keys-identity"]);
    void store.touch(["connections"]);
  };

  const create = useAction({
    run: (type: ApiKeyType) =>
      api<ApiKeyCreated>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ type }),
      }),
    onSuccess: (data, type) => {
      setError(null);
      setCopied(null);
      setPlainToken({ type, token: data.token });
      touch();
    },
    onError: (err: Error) => {
      setPlainToken(null);
      setError(parseApiError(err).message || "Failed to create key");
    },
  });

  const revoke = useAction({
    run: (id: string) => api<unknown>(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPlainToken(null);
      setError(null);
      touch();
    },
    onError: (err: Error) => {
      setError(parseApiError(err).message || "Failed to revoke key");
    },
  });

  const copy = (type: ApiKeyType) => {
    if (!plainToken || plainToken.type !== type) return;
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clip) {
      setError(CLIPBOARD_ERROR);
      return;
    }
    clip.writeText(plainToken.token).then(
      () => setCopied(type),
      () => setError(CLIPBOARD_ERROR),
    );
  };

  return { identity, plainToken, create, revoke, copy, copied, error };
}

export function useRecapSettings(): ProfileRecap {
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  const settings = useResource({
    id: ["recap-settings"],
    load: () => api<RecapSettings>("/recap/settings"),
  });
  const save = useAction({
    run: (monthly: boolean) =>
      api<RecapSettings>("/recap/settings", {
        method: "PUT",
        body: JSON.stringify({ monthly }),
      }),
    onSuccess: () => {
      setError(null);
      void store.touch(["recap-settings"]);
    },
    onError: (err: Error) => setError(parseApiError(err).message || "Failed to save"),
  });
  return { settings, save, error };
}

export function useChangePassword(): ProfileChangePassword {
  const [open, setOpenState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const action = useAction({
    run: (input: { currentPassword: string; newPassword: string }) =>
      apiOnce<{ ok: boolean }>("/auth/password", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      setError(null);
      setDone(true);
      setOpenState(false);
    },
    onError: (err: Error) => setError(changePasswordErrorMessage(err)),
  });

  return {
    open,
    setOpen: (next: boolean) => {
      setOpenState(next);
      setError(null);
      if (next) setDone(false);
    },
    submit: (form: PasswordForm) => {
      const formError = passwordFormError(form);
      if (formError) {
        setError(formError);
        return;
      }
      setError(null);
      action.submit({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
    },
    busy: action.busy,
    error,
    done,
  };
}

export function useDeleteAccount(): ProfileDeleteAccount {
  const router = useRouter();
  const store = useStore();
  const bumpStatus = useDropEpochBump();
  const [open, setOpenState] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const action = useAction({
    run: () =>
      apiOnce<{ ok: boolean }>("/users/me", {
        method: "DELETE",
        body: JSON.stringify({ confirm: DELETE_ACCOUNT_CONFIRMATION }),
      }),
    onSuccess: () => {
      store.drop();
      bumpStatus();
      router.push("/login");
    },
    onError: (err: Error) => {
      setError(parseApiError(err).message || "Could not delete your account.");
    },
  });

  return {
    open,
    setOpen: (next: boolean) => {
      setOpenState(next);
      setConfirmText("");
      setError(null);
    },
    confirmText,
    setConfirmText,
    submit: () => {
      if (confirmText !== DELETE_ACCOUNT_CONFIRMATION) return;
      action.submit();
    },
    busy: action.busy,
    error,
  };
}
