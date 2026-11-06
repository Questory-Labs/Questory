import type { DemoRoute } from "../demo.types";
import { dashboardRoutes } from "./games-dashboard";
import { gameDetailRoutes } from "./games-detail";
import { libraryRoutes } from "./games-library";
import { rewindRoutes } from "./games-rewind";
import { sessionRoutes } from "./games-sessions";
import { wishlistCostRoutes } from "./games-wishlist-cost";

export const gamesRoutes: DemoRoute[] = [
  ...libraryRoutes,
  ...wishlistCostRoutes,
  ...dashboardRoutes,
  ...sessionRoutes,
  ...rewindRoutes,
  ...gameDetailRoutes,
];
