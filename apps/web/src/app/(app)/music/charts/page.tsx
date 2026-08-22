import { Suspense } from "react";
import { StateMessage } from "@/components/ui";
import { MusicChartsController } from "@/modules/music/charts/music.charts.controller";
import { MusicChartsView } from "@/modules/music/charts/music.charts.view";

const MusicChartsPage = () => (
  <Suspense fallback={<StateMessage variant="loading" />}>
    <MusicChartsController>
      <MusicChartsView />
    </MusicChartsController>
  </Suspense>
);

export default MusicChartsPage;
