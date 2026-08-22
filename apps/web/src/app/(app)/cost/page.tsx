import { CostController } from "@/modules/steam/cost/steam.cost.controller";
import { CostView } from "@/modules/steam/cost/steam.cost.view";

const CostPage = () => (
  <CostController>
    <CostView />
  </CostController>
);

export default CostPage;
