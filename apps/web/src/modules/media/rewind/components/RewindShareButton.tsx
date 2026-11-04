"use client";

import { useCallback } from "react";
import type { RewindStatTile } from "../media.rewind.summary.types";

const SHARE_CARD_SIZE = 1080;
const SHARE_CARD_MAX_TILES = 6;

export const drawShareCard = (
  canvas: HTMLCanvasElement,
  title: string,
  tiles: RewindStatTile[],
): boolean => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  canvas.width = SHARE_CARD_SIZE;
  canvas.height = SHARE_CARD_SIZE;
  ctx.fillStyle = "#09090a";
  ctx.fillRect(0, 0, SHARE_CARD_SIZE, SHARE_CARD_SIZE);
  ctx.fillStyle = "#ededee";
  ctx.font = "300 64px sans-serif";
  ctx.fillText(title, 80, 160);
  tiles.slice(0, SHARE_CARD_MAX_TILES).forEach((tile, i) => {
    const y = 290 + i * 120;
    ctx.fillStyle = "#6c6c71";
    ctx.font = "500 24px monospace";
    ctx.fillText(tile.label.toUpperCase(), 80, y);
    ctx.fillStyle = "#ededee";
    ctx.font = "200 52px sans-serif";
    ctx.fillText(tile.value.slice(0, 24), 80, y + 58);
    if (tile.note) {
      ctx.fillStyle = "#e6c27a";
      ctx.font = "400 26px sans-serif";
      ctx.fillText(tile.note.slice(0, 40), 560, y + 58);
    }
  });
  ctx.fillStyle = "#6c6c71";
  ctx.font = "400 26px sans-serif";
  ctx.fillText("Questory", 80, 1020);
  return true;
};

export const RewindShareButton = ({
  title,
  fileName,
  tiles,
}: {
  title: string;
  fileName: string;
  tiles: RewindStatTile[];
}) => {
  const share = useCallback(() => {
    const canvas = document.createElement("canvas");
    if (!drawShareCard(canvas, title, tiles)) return;
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [title, fileName, tiles]);

  return (
    <button
      type="button"
      onClick={share}
      disabled={!tiles.length}
      className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 text-[13px] text-ink transition-colors duration-300 hover:border-white/22 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
      Download share card
    </button>
  );
};
