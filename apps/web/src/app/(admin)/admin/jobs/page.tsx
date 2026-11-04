import { Suspense } from "react";
import { StateMessage } from "@/components/ui";
import { AdminJobsController } from "@/modules/admin/jobs/admin.jobs.controller";
import { AdminJobsView } from "@/modules/admin/jobs/admin.jobs.view";

const AdminJobsPage = () => (
  <Suspense fallback={<StateMessage variant="loading" />}>
    <AdminJobsController>
      <AdminJobsView />
    </AdminJobsController>
  </Suspense>
);

export default AdminJobsPage;
