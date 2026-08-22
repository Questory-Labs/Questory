import { MusicArtistController } from "@/modules/music/artist/music.artist.controller";
import { MusicArtistView } from "@/modules/music/artist/music.artist.view";

const MusicArtistPage = () => (
  <MusicArtistController>
    <MusicArtistView />
  </MusicArtistController>
);

export default MusicArtistPage;
