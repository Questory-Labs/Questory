import { WatchHomeController } from "@/modules/watch/home/watch.home.controller";
import { WatchHomeView } from "@/modules/watch/home/watch.home.view";

const WatchHomePage = () => (
  <WatchHomeController>
    <WatchHomeView />
  </WatchHomeController>
);

export default WatchHomePage;
