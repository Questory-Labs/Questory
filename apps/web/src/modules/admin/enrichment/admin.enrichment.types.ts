import type { Dispatch, SetStateAction } from "react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";

export type Domain = "music" | "watch" | "game";
export type StatusFilter = "all" | "pending" | "running" | "completed" | "failed";

export type StatusBucket = {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
};

export type EnrichmentItem = {
  id: string;
  refId: string;
  label: string;
  detail: string | null;
  status: string;
  attempts: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  startedAt?: string | null;
};

export type EnrichmentResponse = {
  domain: Domain;
  page: number;
  pageSize: number;
  total: number;
  counts: {
    music: StatusBucket;
    watch: StatusBucket;
    game: StatusBucket;
  };
  items: EnrichmentItem[];
};

export type AdminEnrichmentViewProps = {
  domain: Domain;
  setDomain: Dispatch<SetStateAction<Domain>>;
  status: StatusFilter;
  setStatus: Dispatch<SetStateAction<StatusFilter>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  data: UseResourceResult<EnrichmentResponse>;
  trigger: UseActionResult<unknown, void>;
};
