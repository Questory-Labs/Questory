"use client";

import { Suspense } from "react";
import { StateMessage } from "@/components/ui";
import { MultiplayerController } from "@/modules/steam/multiplayer/steam.multiplayer.controller";
import { MultiplayerView } from "@/modules/steam/multiplayer/steam.multiplayer.view";

const MultiplayerPage = () => (
  <Suspense fallback={<StateMessage variant="loading" className="mt-0" />}>
    <MultiplayerController>
      <MultiplayerView />
    </MultiplayerController>
  </Suspense>
);

export default MultiplayerPage;
