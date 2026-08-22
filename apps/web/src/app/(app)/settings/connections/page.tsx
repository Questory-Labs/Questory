"use client";

import { Suspense } from "react";
import { StateMessage } from "@/components/ui";
import { ConnectionsController } from "@/modules/steam/settings-connections/steam.settings-connections.controller";
import { ConnectionsView } from "@/modules/steam/settings-connections/steam.settings-connections.view";

const ConnectionsPage = () => (
  <Suspense fallback={<StateMessage variant="loading" className="mt-0" />}>
    <ConnectionsController>
      <ConnectionsView />
    </ConnectionsController>
  </Suspense>
);

export default ConnectionsPage;
