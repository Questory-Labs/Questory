import type { CSSProperties } from "react";
import type { PatternKind, PatternSpec } from "../media.rewind.types";

const WAVE_HEIGHTS = [28, 62, 44, 88, 36, 74, 52, 96, 24, 68, 80, 40, 58, 90, 32];

const PAPER_NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";

const cssPattern = (spec: PatternSpec): { className: string; style: CSSProperties } | null => {
  const opacity = spec.opacity ?? 0.2;
  const color = spec.color;

  switch (spec.kind) {
    case "checkerboard":
      return {
        className: "absolute left-0 top-0 bottom-0 w-1/3",
        style: {
          opacity,
          backgroundImage: `repeating-conic-gradient(${color} 0% 25%, transparent 0% 50%)`,
          backgroundSize: "60px 60px",
        },
      };
    case "polka-dots":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: `radial-gradient(circle, ${color} 40%, transparent 41%)`,
          backgroundSize: "40px 40px",
        },
      };
    case "scanlines":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: `repeating-linear-gradient(0deg, ${color} 0 1px, transparent 1px 4px)`,
        },
      };
    case "paper-noise":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: PAPER_NOISE_URI,
        },
      };
    case "diagonal-stripes":
      return {
        className: "absolute right-0 top-0 bottom-0 w-1/3",
        style: {
          opacity,
          backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 2px, transparent 0, transparent 10px)`,
        },
      };
    case "halftone":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: `radial-gradient(circle, ${color} 35%, transparent 36%)`,
          backgroundSize: "10px 10px",
          maskImage: "radial-gradient(ellipse at 100% 100%, black 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(ellipse at 100% 100%, black 0%, transparent 65%)",
        },
      };
    case "vinyl-grooves":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: `repeating-radial-gradient(circle at 78% 82%, transparent 0 6px, ${color} 6px 7px)`,
        },
      };
    case "hex-grid":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: `
            repeating-linear-gradient(0deg, ${color} 0 1px, transparent 1px 22px),
            repeating-linear-gradient(60deg, ${color} 0 1px, transparent 1px 22px),
            repeating-linear-gradient(120deg, ${color} 0 1px, transparent 1px 22px)
          `,
        },
      };
    case "speed-lines":
      return {
        className: "absolute inset-0",
        style: {
          opacity,
          backgroundImage: `repeating-conic-gradient(from 210deg at 110% -8%, ${color} 0deg 3deg, transparent 3deg 12deg)`,
        },
      };
    default:
      return null;
  }
};

const StructuralPattern = ({ spec }: { spec: PatternSpec }) => {
  const opacity = spec.opacity ?? 0.2;

  switch (spec.kind) {
    case "concentric-rings":
      return (
        <>
          <div
            className="absolute -right-20 -bottom-20 w-[30rem] h-[30rem] rounded-full"
            style={{ border: `60px solid ${spec.color}`, opacity }}
          />
          <div
            className="absolute -right-40 -bottom-40 w-[50rem] h-[50rem] rounded-full"
            style={{ border: `60px solid ${spec.colorAlt ?? spec.color}`, opacity }}
          />
        </>
      );
    case "film-bars":
      return (
        <>
          <div className="absolute top-0 inset-x-0 h-8 bg-neutral-900 border-b border-neutral-800" />
          <div className="absolute bottom-0 inset-x-0 h-8 bg-neutral-900 border-t border-neutral-800" />
        </>
      );
    case "ticket-stub":
      return (
        <>
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-[var(--bg-0)] rounded-full" />
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-[var(--bg-0)] rounded-full" />
        </>
      );
    case "margin-line":
      return (
        <>
          <div className="absolute top-12 left-12 right-12 h-[4px] bg-black" style={{ opacity }} />
          <div
            className="absolute top-12 left-1/3 bottom-12 w-[2px]"
            style={{ backgroundColor: spec.color, opacity }}
          />
        </>
      );
    case "waveform":
      return (
        <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-end justify-around gap-1 px-4">
          {WAVE_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="w-1.5 rounded-t-sm"
              style={{ height: `${height}%`, backgroundColor: spec.color, opacity }}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
};

const STRUCTURAL: ReadonlySet<PatternKind> = new Set([
  "concentric-rings",
  "film-bars",
  "ticket-stub",
  "margin-line",
  "waveform",
]);

export const RewindPattern = ({ spec }: { spec: PatternSpec }) => {
  if (STRUCTURAL.has(spec.kind)) {
    return (
      <div className="absolute inset-0 pointer-events-none" data-rewind-pattern={spec.kind} aria-hidden>
        <StructuralPattern spec={spec} />
      </div>
    );
  }

  const painted = cssPattern(spec);
  if (!painted) return null;

  return (
    <div
      className={`pointer-events-none ${painted.className}`}
      data-rewind-pattern={spec.kind}
      aria-hidden
      style={painted.style}
    />
  );
};
