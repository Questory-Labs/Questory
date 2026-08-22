import { ProfileSettingsController } from "@/modules/steam/settings-profile/steam.settings-profile.controller";
import { ProfileSettingsView } from "@/modules/steam/settings-profile/steam.settings-profile.view";

const ProfileSettingsPage = () => (
  <ProfileSettingsController>
    <ProfileSettingsView />
  </ProfileSettingsController>
);

export default ProfileSettingsPage;
