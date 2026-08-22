import { DashboardController } from "@/modules/steam/dashboard/steam.dashboard.controller";
import { DashboardView } from "@/modules/steam/dashboard/steam.dashboard.view";

const DashboardPage = () => (
  <DashboardController>
    <DashboardView />
  </DashboardController>
);

export default DashboardPage;
