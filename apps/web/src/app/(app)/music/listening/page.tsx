import { MusicListeningController } from "@/modules/music/listening/music.listening.controller";
import { MusicListeningView } from "@/modules/music/listening/music.listening.view";

const MusicListeningPage = () => (
  <MusicListeningController>
    <MusicListeningView />
  </MusicListeningController>
);

export default MusicListeningPage;
