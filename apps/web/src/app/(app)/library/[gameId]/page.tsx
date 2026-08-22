import { LibraryGameController } from "@/modules/steam/library-game/steam.library-game.controller";
import { LibraryGameView } from "@/modules/steam/library-game/steam.library-game.view";

const LibraryGamePage = () => (
  <LibraryGameController>
    <LibraryGameView />
  </LibraryGameController>
);

export default LibraryGamePage;
