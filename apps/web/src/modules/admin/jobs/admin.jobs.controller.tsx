"use client";

import { cloneElements } from "@questorylabs/ui";
import type { PropsWithChildren } from "react";
import { useAdminTab } from "../shared/useAdminTab";
import { JOBS_TABS } from "./admin.jobs.constants";
import type { AdminJobsViewProps } from "./admin.jobs.types";

export const AdminJobsController = ({ children }: PropsWithChildren) => {
  const [tab, setTab] = useAdminTab(JOBS_TABS);
  const props: AdminJobsViewProps = { tab, setTab };
  return cloneElements(children, props);
};
