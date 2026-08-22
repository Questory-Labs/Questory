"use client";

import { api } from "@/lib/api";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren } from "react";
import type { Settings } from "./admin.settings.types";

export const AdminSettingsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const settings = useResource({
    id: ["admin-settings"],
    load: () => api<Settings>("/admin/settings"),
  });

  const patch = useAction({
    run: (signupEnabled: boolean) =>
      api("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ signupEnabled }),
      }),
    onSuccess: () => {
      store.touch(["admin-settings"]);
      store.touch(["admin-overview"]);
      store.touch(["signup-status"]);
    },
  });

  return cloneElements(children, { settings, patch });
};
