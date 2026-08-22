import { api } from "@/lib/api";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useState } from "react";
import type { ChartShelf, FriendsShelf, GlobalShelf } from "./steam.trending.types";


export const TrendingController = ({ children }: PropsWithChildren) => {
  const friends = useResource({
    id: ["trending", "friends"],
    load: () => api<FriendsShelf>("/trending/friends"),
  });

  const global = useResource({
    id: ["trending", "global"],
    load: () => api<GlobalShelf>("/trending/global"),
  });

  const concurrent = useResource({
    id: ["trending", "concurrent"],
    load: () => api<ChartShelf>("/trending/concurrent"),
  });

  const deck = useResource({
    id: ["trending", "deck"],
    load: () => api<ChartShelf>("/trending/deck"),
  });

  const topReleases = useResource({
    id: ["trending", "top-releases"],
    load: () => api<ChartShelf>("/trending/top-releases"),
  });

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  
  const props = {
    friends,
    global,
    concurrent,
    deck,
    topReleases,
    selectedAppId,
    setSelectedAppId,
  };
  
  return cloneElements(children, props);
};