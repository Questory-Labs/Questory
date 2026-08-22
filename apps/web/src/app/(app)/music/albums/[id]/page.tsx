import { MusicAlbumController } from "@/modules/music/album/music.album.controller";
import { MusicAlbumView } from "@/modules/music/album/music.album.view";

const MusicAlbumPage = () => (
  <MusicAlbumController>
    <MusicAlbumView />
  </MusicAlbumController>
);

export default MusicAlbumPage;
