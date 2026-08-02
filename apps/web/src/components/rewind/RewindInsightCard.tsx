"use client";

import type { RewindCardTheme, PatternSpec, DecorationKind } from "@/lib/rewind-card-engine";
import { parseBoldSegments } from "@/lib/rewind-ai-parser";

function RewindPattern({ spec }: { spec: PatternSpec }) {
  const opacity = spec.opacity ?? 0.2;

  switch (spec.kind) {
    case "checkerboard":
      return (
        <div
          className="absolute left-0 top-0 bottom-0 w-1/3 pointer-events-none"
          style={{
            opacity,
            backgroundImage: `repeating-conic-gradient(${spec.color} 0% 25%, transparent 0% 50%)`,
            backgroundSize: "60px 60px",
          }}
        />
      );
    case "concentric-rings":
      return (
        <>
          <div
            className="absolute -right-20 -bottom-20 w-[30rem] h-[30rem] rounded-full pointer-events-none"
            style={{ border: `60px solid ${spec.color}`, opacity }}
          />
          <div
            className="absolute -right-40 -bottom-40 w-[50rem] h-[50rem] rounded-full pointer-events-none"
            style={{ border: `60px solid ${spec.colorAlt ?? spec.color}`, opacity }}
          />
        </>
      );
    case "polka-dots":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity,
            backgroundImage: `radial-gradient(circle, ${spec.color} 40%, transparent 41%)`,
            backgroundSize: "40px 40px",
          }}
        />
      );
    case "film-bars":
      return (
        <>
          <div className="absolute top-0 inset-x-0 h-8 bg-neutral-900 border-b border-neutral-800 pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-8 bg-neutral-900 border-t border-neutral-800 pointer-events-none" />
        </>
      );
    case "ticket-stub":
      return (
        <>
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-[var(--bg-0)] rounded-full pointer-events-none" />
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-[var(--bg-0)] rounded-full pointer-events-none" />
        </>
      );
    case "scanlines":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity,
            backgroundImage: `linear-gradient(${spec.color} 1px, transparent 1px), linear-gradient(90deg, ${spec.color} 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      );
    case "paper-noise":
      return (
        <div
          className="absolute inset-0 mix-blend-multiply pointer-events-none"
          style={{
            opacity,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          }}
        />
      );
    case "margin-line":
      return (
        <>
          <div className="absolute top-12 left-12 right-12 h-[4px] bg-black pointer-events-none" style={{ opacity }} />
          <div
            className="absolute top-12 left-1/3 bottom-12 w-[2px] pointer-events-none"
            style={{ backgroundColor: spec.color, opacity }}
          />
        </>
      );
    case "diagonal-stripes":
      return (
        <div
          className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none"
          style={{
            opacity,
            backgroundImage: `repeating-linear-gradient(45deg, ${spec.color} 0, ${spec.color} 2px, transparent 0, transparent 10px)`,
          }}
        />
      );
    default:
      return null;
  }
}

function RewindDecoration({ kind }: { kind: DecorationKind }) {
  switch (kind) {
    case "vignette":
      return (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.9)_90%)] pointer-events-none" />
      );
    case "rec-badge":
      return (
        <div className="absolute bottom-6 right-6 flex items-center gap-2 pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div className="text-sm text-red-500 font-mono font-bold">REC</div>
        </div>
      );
    case "margin-line":
      return <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-[#d4d4d8] pointer-events-none" />;
    default:
      return null;
  }
}

export function RewindInsightCard({
  title,
  text,
  theme,
}: {
  title: string;
  text: string;
  theme: RewindCardTheme;
}) {
  const segments = parseBoldSegments(text);

  return (
    <div
      className={`snap-center shrink-0 w-[85vw] max-w-4xl h-[300px] md:h-[380px] flex flex-col relative overflow-hidden rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-[1.01] ${theme.container}`}
    >
      <RewindPattern spec={theme.pattern} />
      <RewindDecoration kind={theme.decoration} />

      <div className="relative z-10 flex flex-col h-full min-h-0 p-6 md:p-10 lg:p-12">
        {title ? (
          <div className="shrink-0 mb-3 md:mb-4">
            <h4 className={`${theme.title} text-sm md:text-base`}>{title}</h4>
          </div>
        ) : null}

        <div className="relative flex-1 min-h-0">
          <div className="h-full overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent]">
            <p className={`text-base md:text-xl lg:text-2xl ${theme.text} whitespace-pre-wrap drop-shadow-md`}>
              {segments.map((seg, i) => {
                if (seg.bold) {
                  return (
                    <strong key={i} className={theme.highlight}>
                      {seg.value}
                    </strong>
                  );
                }
                if (seg.italic) {
                  return (
                    <em key={i} className="italic opacity-100">
                      {seg.value}
                    </em>
                  );
                }
                return (
                  <span key={i} className="opacity-90">
                    {seg.value}
                  </span>
                );
              })}
            </p>
          </div>
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent ${theme.scrollFade}`}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
