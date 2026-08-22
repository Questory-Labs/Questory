import { Suspense } from "react";
import { SkeletonTileGrid } from "@questorylabs/ui";
import { LibraryController } from "@/modules/steam/library/steam.library.controller";
import { LibraryView } from "@/modules/steam/library/steam.library.view";

const LibraryPage = () => (
  <Suspense fallback={<SkeletonTileGrid count={8} />}>
    <LibraryController>
      <LibraryView />
    </LibraryController>
  </Suspense>
);

export default LibraryPage;
