"use client";

import { useLiveResource } from "@questorylabs/qhttp/react";
import type { ResourceId } from "@questorylabs/qhttp/react";
import { subscribeSse } from "@/lib/sse-client";

type UseSseBackedQueryOpts<T> = {
  /** @deprecated use `id` */
  queryKey?: ResourceId;
  /** @deprecated use `load` */
  queryFn?: () => Promise<T>;
  id?: ResourceId;
  load?: () => Promise<T>;
  streamUrl: string;
  enabled?: boolean;
  staleTime?: number;
  pollInterval?: (data: T | undefined) => number | false;
};

/** @deprecated Use useLiveResource from @questorylabs/qhttp/react */
export function useSseBackedQuery<T>({
  queryKey,
  queryFn,
  id,
  load,
  streamUrl,
  enabled = true,
  staleTime = 5_000,
}: UseSseBackedQueryOpts<T>) {
  const resourceId = id ?? queryKey;
  const resourceLoad = load ?? queryFn;
  if (!resourceId || !resourceLoad) {
    throw new Error("useSseBackedQuery requires id/load (or queryKey/queryFn)");
  }

  return useLiveResource<T>({
    id: resourceId,
    load: resourceLoad,
    when: enabled,
    freshFor: staleTime,
    subscribe: (onEvent, signal) =>
      subscribeSse(streamUrl, { onMessage: onEvent }, signal),
  });
}
