import { TrendingController } from "@/modules/steam/trending/steam.trending.controller";
import { TrendingView } from "@/modules/steam/trending/steam.trending.view";

const TrendingPage = () => (
  <TrendingController>
    <TrendingView />
  </TrendingController>
);

export default TrendingPage;
