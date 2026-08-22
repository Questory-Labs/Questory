import { MultiplayerController } from "@/modules/steam/multiplayer/steam.multiplayer.controller";
import { MultiplayerView } from "@/modules/steam/multiplayer/steam.multiplayer.view";

const MultiplayerPage = () => (
  <MultiplayerController>
    <MultiplayerView />
  </MultiplayerController>
);

export default MultiplayerPage;
