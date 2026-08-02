import { WatchGate } from "@/components/WatchGate";
import { RewindView } from "@/components/RewindView";

export const metadata = { title: "Watch Rewind - Questory" };

export default function WatchRewindPage() {
  return (
    <WatchGate>
      <RewindView domain="watch" />
    </WatchGate>
  );
}
