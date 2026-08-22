import { MusicTrackController } from "@/modules/music/track/music.track.controller";
import { MusicTrackView } from "@/modules/music/track/music.track.view";

const MusicTrackPage = () => (
  <MusicTrackController>
    <MusicTrackView />
  </MusicTrackController>
);

export default MusicTrackPage;
