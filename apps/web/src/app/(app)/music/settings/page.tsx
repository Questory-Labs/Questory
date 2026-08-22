import { MusicSettingsController } from "@/modules/music/settings/music.settings.controller";
import { MusicSettingsView } from "@/modules/music/settings/music.settings.view";

const MusicSettingsPage = () => (
  <MusicSettingsController>
    <MusicSettingsView />
  </MusicSettingsController>
);

export default MusicSettingsPage;
