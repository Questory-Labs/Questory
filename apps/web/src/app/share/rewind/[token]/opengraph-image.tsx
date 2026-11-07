import { ImageResponse } from "next/og";
import { loadPublicRewindShare } from "@/modules/media/rewind/public/media.rewind-public.api";
import { publicRewindTitle } from "@/modules/media/rewind/public/media.rewind-public.view";
import { buildRewindSummary } from "@/modules/media/rewind/media.rewind.summary";
import { REWIND_SCOPE_SOFT_COLOR } from "@/modules/media/rewind/media.rewind.constants";
import type { RewindScope } from "@/modules/media/rewind/media.rewind.types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Questory Rewind";

const OG_TILES = 4;

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await loadPublicRewindShare(token).catch(() => null);
  const accent = share ? REWIND_SCOPE_SOFT_COLOR[share.domain as RewindScope] : "#e6c27a";
  const title = share ? publicRewindTitle(share) : "Questory Rewind";
  const tiles = share ? buildRewindSummary(share.stats).stats.slice(0, OG_TILES) : [];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(160deg, #141416 0%, #09090a 70%)",
          color: "#ededee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#8a8a90" }}>QUESTORY REWIND</div>
          <div style={{ marginTop: 18, fontSize: 60, fontWeight: 300, lineHeight: 1.1 }}>
            {title}
          </div>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          {tiles.map((tile) => (
            <div
              key={tile.key}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "22px 26px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontSize: 18, letterSpacing: 2, color: "#8a8a90" }}>
                {tile.label.toUpperCase()}
              </div>
              <div style={{ marginTop: 14, fontSize: 44, fontWeight: 200 }}>
                {tile.value.slice(0, 18)}
              </div>
              {tile.note ? (
                <div style={{ marginTop: 8, fontSize: 18, color: accent }}>{tile.note.slice(0, 36)}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
