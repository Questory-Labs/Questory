"use client";

import { PageHeader } from "@/components/ui";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AdminMigrationsController } from "../migrations/admin.migrations.controller";
import { AdminMigrationsView } from "../migrations/admin.migrations.view";
import { AdminSettingsController } from "../settings/admin.settings.controller";
import { AdminSettingsView } from "../settings/admin.settings.view";
import { SYSTEM_TAB_OPTIONS } from "./admin.system.constants";
import type { AdminSystemViewProps } from "./admin.system.types";

export const AdminSystemView = (props: Record<string, unknown>) => {
  const { tab, setTab } = props as AdminSystemViewProps;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        eyebrow="Instance configuration"
        title={
          <>
            System, <span className="font-serif">switches and moves</span>
          </>
        }
        actions={
          <SegmentedControl
            label="System section"
            value={tab}
            onChange={setTab}
            options={SYSTEM_TAB_OPTIONS}
          />
        }
      />

      {tab === "settings" ? (
        <AdminSettingsController>
          <AdminSettingsView />
        </AdminSettingsController>
      ) : null}
      {tab === "migrations" ? (
        <AdminMigrationsController>
          <AdminMigrationsView />
        </AdminMigrationsController>
      ) : null}
    </div>
  );
};
