"use client";

import type { DashboardStats } from "@questorylabs/shared";
import { gameNowCard } from "../dashboard-now";
import { NowCard } from "./NowCard";

export const ContinueHero = ({
  game,
  index = 4,
}: {
  game: DashboardStats["recentlyPlayed"][number];
  index?: number;
}) => <NowCard card={gameNowCard(game)} index={index} lead />;
