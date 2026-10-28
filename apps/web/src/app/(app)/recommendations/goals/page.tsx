import { GoalsController } from "@/modules/enterprise/goals/enterprise.goals.controller";
import { GoalsView } from "@/modules/enterprise/goals/enterprise.goals.view";

const SmartGoalsPage = () => (
  <GoalsController>
    <GoalsView />
  </GoalsController>
);

export default SmartGoalsPage;
