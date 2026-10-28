import { Suspense } from "react";
import { StateMessage } from "@/components/ui";
import { AdminSystemController } from "@/modules/admin/system/admin.system.controller";
import { AdminSystemView } from "@/modules/admin/system/admin.system.view";

const AdminSystemPage = () => (
  <Suspense fallback={<StateMessage variant="loading" />}>
    <AdminSystemController>
      <AdminSystemView />
    </AdminSystemController>
  </Suspense>
);

export default AdminSystemPage;
