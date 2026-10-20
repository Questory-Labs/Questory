import { RecapSettingsPanel } from "@/components/RecapSettingsPanel";
import { ProfileSettingsController } from "@/modules/steam/settings-profile/steam.settings-profile.controller";
import { ProfileSettingsView } from "@/modules/steam/settings-profile/steam.settings-profile.view";

const ProfileSettingsPage = () => (
  <ProfileSettingsController>
    <ProfileSettingsView />
    <RecapSettingsPanel />
  </ProfileSettingsController>
);

export default ProfileSettingsPage;
