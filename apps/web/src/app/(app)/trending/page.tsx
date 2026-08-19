"use client";

import { TrendingController } from "@/modules/steam/trending/steam.trending.controller";
import { TrendingView } from "@/modules/steam/trending/steam.trending.view";

export default function TrendingPage() {
  return (
    <TrendingController>
      <TrendingView />
    </TrendingController>
  );
}