"use client";

import { useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { Collection, TasteClusterPreview } from "@questorylabs/shared";
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
    onSuccess: () => {
      store.touch(["collections"]);
      store.touch(["taste-clusters"]);
    },
  });

  const tastePreview = useResource({
    id: ["taste-clusters"],
    load: () => api<TasteClusterPreview>("/recommendations/clusters/preview"),
    when: Boolean(tasteAvailable),
  });

  const saveCluster = useAction({
    run: (clusterId: string) =>
      api<{ available: boolean; saved: boolean }>(
        "/recommendations/clusters/save",
        { method: "POST", body: JSON.stringify({ clusterId }) },
      ),
    onSuccess: () => {
      store.touch(["collections"]);
      store.touch(["taste-clusters"]);
    },
  });

  return cloneElements(children, {
    tastePreview,
    saveCluster,
    list,
    create,
    name,
    setName,
    tasteAvailable,
    groupByTaste,
  });
};
