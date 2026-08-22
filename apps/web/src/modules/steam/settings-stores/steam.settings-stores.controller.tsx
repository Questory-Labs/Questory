"use client";

import type { PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { StoreAccountStatus } from "@questorylabs/shared";
import { api } from "@/lib/api";

export const StoresSettingsController = ({ children }: PropsWithChildren) => {
  const stores = useResource({
    id: ["stores"],
    load: () => api<StoreAccountStatus[]>("/stores"),
  });

  return cloneElements(children, { stores });
};
