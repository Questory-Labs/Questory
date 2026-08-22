import { GuardrailsController } from "@/modules/enterprise/guardrails/enterprise.guardrails.controller";
import { GuardrailsView } from "@/modules/enterprise/guardrails/enterprise.guardrails.view";

const AdminGuardrailsPage = () => (
  <GuardrailsController>
    <GuardrailsView />
  </GuardrailsController>
);

export default AdminGuardrailsPage;
