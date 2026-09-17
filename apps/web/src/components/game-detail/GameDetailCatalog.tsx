"use client";

import type { GameDetail } from "@questorylabs/shared";
import { GameCatalogExtras } from "./game-catalog-extras";
import { GamePriceSection, GameReviewsSection } from "./game-market";
import { GameAchievementsSection, GameHltbSection } from "./game-progress";

export const GameDetailCatalog = ({
  detail,
  chartSize,
  playtimeHours,
}: {
  detail: GameDetail;
  chartSize: "sm" | "lg";
  playtimeHours?: number;
}) => (
  <>
    <GamePriceSection detail={detail} chartSize={chartSize} />
    <GameHltbSection detail={detail} playtimeHours={playtimeHours} />
    <GameReviewsSection detail={detail} chartSize={chartSize} />
    <GameAchievementsSection detail={detail} />
    <GameCatalogExtras detail={detail} />
  </>
);
