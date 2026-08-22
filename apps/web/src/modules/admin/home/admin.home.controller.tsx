"use client";

import { api } from "@/lib/api";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren } from "react";
import type { Overview } from "./admin.home.types";

export const AdminHomeController = ({ children }: PropsWithChildren) => {
  const overview = useResource({
    id: ["admin-overview"],
    load: () => api<Overview>("/admin/overview"),
    refreshEvery: 30_000,
  });

  return cloneElements(children, { overview });
};
