import { ReadGate } from "@/components/ReadGate";
import { RewindView } from "@/components/RewindView";

export const metadata = { title: "Read Rewind - Questory" };

export default function ReadRewindPage() {
  return (
    <ReadGate>
      <RewindView domain="read" />
    </ReadGate>
  );
}
