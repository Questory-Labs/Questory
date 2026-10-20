import { RewindController } from "@/modules/media/rewind/media.rewind.controller";
import { RewindView } from "@/modules/media/rewind/media.rewind.view";

export const metadata = { title: "Games Rewind - Questory" };

const GamesRewindPage = () => (
  <RewindController domain="games">
    <RewindView />
  </RewindController>
);

export default GamesRewindPage;
