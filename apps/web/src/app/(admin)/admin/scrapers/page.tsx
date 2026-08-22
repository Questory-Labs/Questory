import { AdminScrapersController } from "@/modules/admin/scrapers/admin.scrapers.controller";
import { AdminScrapersView } from "@/modules/admin/scrapers/admin.scrapers.view";

const AdminScrapersPage = () => (
  <AdminScrapersController>
    <AdminScrapersView />
  </AdminScrapersController>
);

export default AdminScrapersPage;
