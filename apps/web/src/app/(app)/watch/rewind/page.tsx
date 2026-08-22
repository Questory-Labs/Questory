import { WatchGate } from "@/components/WatchGate";
import { RewindController } from "@/modules/media/rewind/media.rewind.controller";
import { RewindView } from "@/modules/media/rewind/media.rewind.view";

export const metadata = { title: "Watch Rewind - Questory" };

const WatchRewindPage = () => (
  <WatchGate>
    <RewindController domain="watch">
      <RewindView />
    </RewindController>
  </WatchGate>
);

export default WatchRewindPage;
