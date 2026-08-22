import { AdminCronController } from "@/modules/admin/cron/admin.cron.controller";
import { AdminCronView } from "@/modules/admin/cron/admin.cron.view";

const AdminCronPage = () => (
  <AdminCronController>
    <AdminCronView />
  </AdminCronController>
);

export default AdminCronPage;
