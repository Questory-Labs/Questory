import { DashboardController } from "@/modules/steam/dashboard/steam.dashboard.controller";
import { DashboardView } from "@/modules/steam/dashboard/steam.dashboard.view";

export default function DashboardPage() {
  return (
    <DashboardController>
      <DashboardView />
    </DashboardController>
  );
};