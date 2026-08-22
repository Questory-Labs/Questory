import { AdminHomeController } from "@/modules/admin/home/admin.home.controller";
import { AdminHomeView } from "@/modules/admin/home/admin.home.view";

const AdminHomePage = () => (
  <AdminHomeController>
    <AdminHomeView />
  </AdminHomeController>
);

export default AdminHomePage;
