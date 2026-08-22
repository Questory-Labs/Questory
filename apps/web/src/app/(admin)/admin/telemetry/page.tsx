import { TelemetryController } from "@/modules/enterprise/telemetry/enterprise.telemetry.controller";
import { TelemetryView } from "@/modules/enterprise/telemetry/enterprise.telemetry.view";

const AdminTelemetryPage = () => (
  <TelemetryController>
    <TelemetryView />
  </TelemetryController>
);

export default AdminTelemetryPage;
