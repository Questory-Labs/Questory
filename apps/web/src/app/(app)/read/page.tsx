import { ReadHomeController } from "@/modules/read/home/read.home.controller";
import { ReadHomeView } from "@/modules/read/home/read.home.view";

const ReadHomePage = () => (
  <ReadHomeController>
    <ReadHomeView />
  </ReadHomeController>
);

export default ReadHomePage;
