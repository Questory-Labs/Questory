import { MusicHomeController } from "@/modules/music/home/music.home.controller";
import { MusicHomeView } from "@/modules/music/home/music.home.view";

const MusicHomePage = () => (
  <MusicHomeController>
    <MusicHomeView />
  </MusicHomeController>
);

export default MusicHomePage;
