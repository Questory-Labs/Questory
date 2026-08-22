import { RecommendationsController } from "@/modules/enterprise/recommendations/enterprise.recommendations.controller";
import { RecommendationsView } from "@/modules/enterprise/recommendations/enterprise.recommendations.view";

const RecommendationsPage = () => (
  <RecommendationsController>
    <RecommendationsView />
  </RecommendationsController>
);

export default RecommendationsPage;
