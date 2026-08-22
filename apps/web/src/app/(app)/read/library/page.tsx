import { ReadLibraryController } from "@/modules/read/library/read.library.controller";
import { ReadLibraryView } from "@/modules/read/library/read.library.view";

const ReadLibraryPage = () => (
  <ReadLibraryController>
    <ReadLibraryView />
  </ReadLibraryController>
);

export default ReadLibraryPage;
