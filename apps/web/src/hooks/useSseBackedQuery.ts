"use client";

import { useEffect, useRef, useState } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@questorylabs/qhttp/react";
import { subscribeSse } from "@/lib/sse-client";

type UseSseBackedQueryOpts<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  streamUrl: string;
  enabled?: boolean;
  staleTime?: number;
  pollInterval: (data: T | undefined) => number | false;
};

function queryKeyId(key: QueryKey): string {
  return JSON.stringify(key);
}

/** React Query data fed by an authenticated SSE stream; polls only if the stream fails. */
export function useSseBackedQuery<T>({
  queryKey,
  queryFn,
  streamUrl,
  enabled = true,
  staleTime = 5_000,
  pollInterval,
}: UseSseBackedQueryOpts<T>) {
  const qc = useQueryClient();
  const [pollFallback, setPollFallback] = useState(false);
  const queryKeyRef = useRef(queryKey);
  const pollIntervalRef = useRef(pollInterval);
  queryKeyRef.current = queryKey;
  pollIntervalRef.current = pollInterval;

  const stableKeyId = queryKeyId(queryKey);

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    refetchInterval: pollFallback
      ? (ctx) => pollIntervalRef.current(ctx.data as T | undefined)
      : false,
    refetchOnWindowFocus: pollFallback,
  });

  useEffect(() => {
    if (!enabled) return;

    const ac = new AbortController();

    void subscribeSse(
      streamUrl,
      {
        onMessage: (raw) => {
          try {
            const data = JSON.parse(raw) as T;
            qc.setQueryData(queryKeyRef.current, data);
            setPollFallback(false);
          } catch {
            // ignore malformed frames
          }
        },
      },
      ac.signal,
    );

    return () => {
      ac.abort();
    };
  }, [enabled, stableKeyId, streamUrl, qc]);

  return query;
}
