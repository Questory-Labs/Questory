import { AdminUsersController } from "@/modules/admin/users/admin.users.controller";
import { AdminUsersView } from "@/modules/admin/users/admin.users.view";

const AdminUsersPage = () => (
  <AdminUsersController>
    <AdminUsersView />
  </AdminUsersController>
);

export default AdminUsersPage;
