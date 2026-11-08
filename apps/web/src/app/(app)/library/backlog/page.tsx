import { BacklogController } from "@/modules/steam/backlog/steam.backlog.controller";
import { BacklogView } from "@/modules/steam/backlog/steam.backlog.view";

const BacklogPage = () => (
  <BacklogController>
    <BacklogView />
  </BacklogController>
);

export default BacklogPage;
