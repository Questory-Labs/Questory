import { Suspense } from "react";
import { StateMessage } from "@/components/ui";
import { MediaSourcesController } from "@/modules/media/sources/media.sources.controller";
import { MediaSourcesView } from "@/modules/media/sources/media.sources.view";

export const metadata = { title: "Sources - Questory" };

const SourcesPage = () => (
  <Suspense fallback={<StateMessage variant="loading" />}>
    <MediaSourcesController>
      <MediaSourcesView />
    </MediaSourcesController>
  </Suspense>
);

export default SourcesPage;
