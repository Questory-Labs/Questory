import { StoresSettingsController } from "@/modules/steam/settings-stores/steam.settings-stores.controller";
import { StoresSettingsView } from "@/modules/steam/settings-stores/steam.settings-stores.view";

const StoresSettingsPage = () => (
  <StoresSettingsController>
    <StoresSettingsView />
  </StoresSettingsController>
);

export default StoresSettingsPage;
