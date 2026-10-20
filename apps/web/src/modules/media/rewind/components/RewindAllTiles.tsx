"use client";

import { useCallback, useMemo } from "react";
import type { RewindAllStats } from "@questorylabs/shared";
import { Button } from "@/components/ui";
import { RewindStatCard } from "./RewindStatCard";

type AreaTile = { key: string; label: string; value: string; unit: string; top?: string };

export const allAreaTiles = (stats: RewindAllStats): AreaTile[] => {
  const tiles: AreaTile[] = [];
  const { music, watch, read, games } = stats.domains;
  if (music) {
    tiles.push({ key: "music", label: "Music", value: Math.round(music.listeningMinutes / 60).toLocaleString(), unit: "hours listened", top: music.topArtists[0]?.name });
  }
  if (watch) {
    tiles.push({ key: "watch", label: "Watching", value: Math.round(watch.watchingMinutes / 60).toLocaleString(), unit: "hours watched", top: watch.topTitles[0]?.name });
  }
  if (read) {
    tiles.push({ key: "read", label: "Reading", value: read.chaptersLogged.toLocaleString(), unit: "chapters logged", top: read.topTitles[0]?.name });
  }
  if (games) {
    tiles.push({ key: "games", label: "Games", value: Math.round(games.totalMinutes / 60).toLocaleString(), unit: "hours played", top: games.topGames[0]?.name });
  }
  return tiles;
};

const drawShareCard = (canvas: HTMLCanvasElement, period: string, tiles: AreaTile[]) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  canvas.width = 1080;
  canvas.height = 1080;
  ctx.fillStyle = "#101418";
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 64px sans-serif";
  ctx.fillText(`My ${period} Rewind`, 80, 160);
  tiles.forEach((tile, i) => {
    const y = 300 + i * 180;
    ctx.fillStyle = "#9aa4ad";
    ctx.font = "500 32px sans-serif";
    ctx.fillText(tile.label.toUpperCase(), 80, y);
    ctx.fillStyle = "#f4f1ea";
    ctx.font = "600 56px sans-serif";
    ctx.fillText(`${tile.value} ${tile.unit}`, 80, y + 64);
    if (tile.top) {
      ctx.fillStyle = "#c9b98f";
      ctx.font = "400 30px sans-serif";
      ctx.fillText(tile.top.slice(0, 48), 80, y + 110);
    }
  });
  ctx.fillStyle = "#6b757e";
  ctx.font = "400 26px sans-serif";
  ctx.fillText("Questory", 80, 1020);
  return true;
};

export const RewindAllTiles = ({ stats }: { stats: RewindAllStats }) => {
  const tiles = useMemo(() => allAreaTiles(stats), [stats]);
  const share = useCallback(() => {
    const canvas = document.createElement("canvas");
    if (!drawShareCard(canvas, stats.period, tiles)) return;
    const link = document.createElement("a");
    link.download = `questory-rewind-${stats.period}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [stats.period, tiles]);

  if (!tiles.length) {
    return <p className="text-sm text-[var(--muted)]">No activity in this period yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <RewindStatCard key={tile.key} title={tile.label} value={tile.value} subtitle={tile.top ? `${tile.unit} · ${tile.top}` : tile.unit} />
        ))}
      </div>
      <Button onClick={share}>Download share card</Button>
    </div>
  );
};
