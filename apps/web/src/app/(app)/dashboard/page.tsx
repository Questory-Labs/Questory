import { DashboardController } from "@/modules/dashboard/dashboard.controller";
import { DashboardView } from "@/modules/dashboard/dashboard.view";

export default function DashboardPage() {
  return (
    <DashboardController>
      <DashboardView />
    </DashboardController>
  );
};