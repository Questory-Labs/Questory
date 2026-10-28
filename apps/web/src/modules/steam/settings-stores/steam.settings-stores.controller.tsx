"use client";

import type { PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { StoreAccountStatus } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { useNavCounts } from "@/hooks/useNavCounts";

export const StoresSettingsController = ({ children }: PropsWithChildren) => {
  const stores = useResource({
    id: ["stores"],
    load: () => api<StoreAccountStatus[]>("/stores"),
  });
  const navCounts = useNavCounts();

  return cloneElements(children, { stores, navCounts });
};
