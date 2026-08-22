import { AdminEnrichmentController } from "@/modules/admin/enrichment/admin.enrichment.controller";
import { AdminEnrichmentView } from "@/modules/admin/enrichment/admin.enrichment.view";

const AdminEnrichmentPage = () => (
  <AdminEnrichmentController>
    <AdminEnrichmentView />
  </AdminEnrichmentController>
);

export default AdminEnrichmentPage;
