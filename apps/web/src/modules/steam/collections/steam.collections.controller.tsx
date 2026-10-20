"use client";

import { useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { Collection } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { useEnterpriseEnabled } from "@/providers/EnterpriseEnabledProvider";

export const CollectionsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const { enabled: tasteAvailable } = useEnterpriseEnabled();
  const [name, setName] = useState("");
  const list = useResource({
    id: ["collections"],
    load: () => api<Collection[]>("/collections"),
  });
  const create = useAction({
    run: () =>
      api("/collections", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName("");
      store.touch(["collections"]);
    },
  });

  const groupByTaste = useAction({
    run: () =>
      api<{ available: boolean; collections: number }>(
        "/recommendations/clusters/collections",
        { method: "POST" },
      ),
    onSuccess: () => store.touch(["collections"]),
  });

  return cloneElements(children, {
    list,
    create,
    name,
    setName,
    tasteAvailable,
    groupByTaste,
  });
};
