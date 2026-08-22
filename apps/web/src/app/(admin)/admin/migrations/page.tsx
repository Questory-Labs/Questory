import { AdminMigrationsController } from "@/modules/admin/migrations/admin.migrations.controller";
import { AdminMigrationsView } from "@/modules/admin/migrations/admin.migrations.view";

const AdminMigrationsPage = () => (
  <AdminMigrationsController>
    <AdminMigrationsView />
  </AdminMigrationsController>
);

export default AdminMigrationsPage;
