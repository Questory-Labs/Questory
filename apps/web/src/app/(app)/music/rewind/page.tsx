import { MusicGate } from "@/components/MusicGate";
import { RewindView } from "@/components/RewindView";

export const metadata = { title: "Music Rewind - Questory" };

export default function MusicRewindPage() {
  return (
    <MusicGate>
      <RewindView domain="music" />
    </MusicGate>
  );
}
