import { WatchSettingsController } from "@/modules/watch/settings/watch.settings.controller";
import { WatchSettingsView } from "@/modules/watch/settings/watch.settings.view";

const WatchSettingsPage = () => (
  <WatchSettingsController>
    <WatchSettingsView />
  </WatchSettingsController>
);

export default WatchSettingsPage;
