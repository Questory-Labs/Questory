import { ReadHistoryController } from "@/modules/read/history/read.history.controller";
import { ReadHistoryView } from "@/modules/read/history/read.history.view";

const ReadHistoryPage = () => (
  <ReadHistoryController>
    <ReadHistoryView />
  </ReadHistoryController>
);

export default ReadHistoryPage;
