import { MusicGate } from "@/components/MusicGate";
import { RewindController } from "@/modules/media/rewind/media.rewind.controller";
import { RewindView } from "@/modules/media/rewind/media.rewind.view";

export const metadata = { title: "Music Rewind - Questory" };

const MusicRewindPage = () => (
  <MusicGate>
    <RewindController domain="music">
      <RewindView />
    </RewindController>
  </MusicGate>
);

export default MusicRewindPage;
