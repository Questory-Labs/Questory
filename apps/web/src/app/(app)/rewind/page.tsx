import { RewindController } from "@/modules/media/rewind/media.rewind.controller";
import { RewindView } from "@/modules/media/rewind/media.rewind.view";

export const metadata = { title: "Rewind - Questory" };

const UnifiedRewindPage = () => (
  <RewindController domain="all">
    <RewindView />
  </RewindController>
);

export default UnifiedRewindPage;
