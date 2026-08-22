import { AdminSettingsController } from "@/modules/admin/settings/admin.settings.controller";
import { AdminSettingsView } from "@/modules/admin/settings/admin.settings.view";

const AdminSettingsPage = () => (
  <AdminSettingsController>
    <AdminSettingsView />
  </AdminSettingsController>
);

export default AdminSettingsPage;
