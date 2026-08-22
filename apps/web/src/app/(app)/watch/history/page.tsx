import { WatchHistoryController } from "@/modules/watch/history/watch.history.controller";
import { WatchHistoryView } from "@/modules/watch/history/watch.history.view";

const WatchHistoryPage = () => (
  <WatchHistoryController>
    <WatchHistoryView />
  </WatchHistoryController>
);

export default WatchHistoryPage;
