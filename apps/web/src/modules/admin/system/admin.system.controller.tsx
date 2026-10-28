"use client";

import { cloneElements } from "@questorylabs/ui";
import type { PropsWithChildren } from "react";
import { useAdminTab } from "../shared/useAdminTab";
import { SYSTEM_TABS } from "./admin.system.constants";
import type { AdminSystemViewProps } from "./admin.system.types";

export const AdminSystemController = ({ children }: PropsWithChildren) => {
  const [tab, setTab] = useAdminTab(SYSTEM_TABS);
  const props: AdminSystemViewProps = { tab, setTab };
  return cloneElements(children, props);
};
