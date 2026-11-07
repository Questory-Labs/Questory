"use client";

import type { PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { BacklogSummary } from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { withTz } from "@/lib/dates";

export const BacklogController = ({ children }: PropsWithChildren) => {
  const summary = useResource({
    id: ["library-backlog"],
    load: () => api<BacklogSummary>(withTz("/library/backlog")),
  });

  return cloneElements(children, { summary });
};
