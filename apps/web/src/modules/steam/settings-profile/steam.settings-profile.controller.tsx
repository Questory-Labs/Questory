"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { MeResponse } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useUser } from "@/hooks/useUser";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import type { PriceRegion } from "./steam.settings-profile.types";

export const ProfileSettingsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const music = useMusicEnabled();
  const watch = useWatchEnabled();
  const { user } = useUser();
  const [countryCode, setCountryCode] = useState("IN");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regions = useResource({
    id: ["price-regions"],
    load: () => api<PriceRegion[]>("/users/price-regions"),
  });

  useEffect(() => {
    const cc = user?.countryCode;
    if (cc) setCountryCode(cc.toUpperCase());
  }, [user?.countryCode]);

  const save = useAction({
    run: async (nextCountry: string) => {
      return api<MeResponse>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ countryCode: nextCountry }),
      });
    },
    onSuccess: (data) => {
      setError(null);
      const currency = data.user?.currency || "USD";
      setMessage(
        `Price region set to ${data.user?.countryCode || "—"} (${currency}).`,
      );
      store.touch(["me"]);
      store.touch(["cost-summary"]);
      store.touch(["cost-roi"]);
      store.touch(["dashboard"]);
      store.touch(["wishlist"]);
      store.touch(["family-insights"]);
      store.touch(["family-library"]);
      store.touch(["library"]);
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(parseApiError(err).message || "Failed to update price region");
    },
  });

  const selected = (regions.value || []).find(
    (r) => r.countryCode === countryCode,
  );
  const dirty = (user?.countryCode || "").toUpperCase() !== countryCode;

  const onCountryChange = (code: string) => {
    setCountryCode(code);
    setMessage(null);
    setError(null);
  };

  return cloneElements(children, {
    regions,
    countryCode,
    onCountryChange,
    save,
    message,
    error,
    selected,
    dirty,
    user,
    showMusic: music.showMusicNav,
    showWatch: watch.showWatchNav,
  });
};
