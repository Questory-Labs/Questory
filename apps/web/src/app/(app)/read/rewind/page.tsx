import { ReadGate } from "@/components/ReadGate";
import { RewindController } from "@/modules/media/rewind/media.rewind.controller";
import { RewindView } from "@/modules/media/rewind/media.rewind.view";

export const metadata = { title: "Read Rewind - Questory" };

const ReadRewindPage = () => (
  <ReadGate>
    <RewindController domain="read">
      <RewindView />
    </RewindController>
  </ReadGate>
);

export default ReadRewindPage;
