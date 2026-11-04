import type { CSSProperties, ReactNode } from "react";
import type { RewindCategory } from "../media.rewind.summary.types";

const CENTERED = "[transform-box:fill-box] origin-center";
const BOXED = "[transform-box:fill-box]";

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

const seq = (count: number) => Array.from({ length: count }, (_, i) => i);

const VARIANTS: Record<RewindCategory, Record<string, ReactNode>> = {
  games: {
    dpad: (
      <>
        <path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5z" fill="currentColor" opacity="0.35" />
        <rect className="q-live" x="8" y="8" width="4" height="4" rx="1" fill="currentColor" />
      </>
    ),
    buttons: (
      <>
        {[
          [10, 4],
          [16, 10],
          [10, 16],
          [4, 10],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            className="q-twinkle"
            style={stagger(i * 2)}
            cx={cx}
            cy={cy}
            r="2.4"
            fill="currentColor"
          />
        ))}
      </>
    ),
    crosshair: (
      <>
        <g className={`q-spin ${CENTERED}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="6.5" strokeDasharray="7 3.2" />
          <path d="M10 1v3M10 16v3M1 10h3M16 10h3" />
        </g>
        <circle className="q-live" cx="10" cy="10" r="1.6" fill="currentColor" />
      </>
    ),
    pixels: (
      <>
        {seq(16).map((cell) => (
          <rect
            key={cell}
            className="q-twinkle"
            style={stagger((cell * 7) % 8)}
            x={3 + (cell % 4) * 3.6}
            y={3 + Math.floor(cell / 4) * 3.6}
            width="2.8"
            height="2.8"
            fill="currentColor"
          />
        ))}
      </>
    ),
  },
  music: {
    eq: (
      <>
        {[9, 14, 7, 12].map((height, i) => (
          <rect
            key={i}
            className={`q-eq ${BOXED}`}
            style={stagger(i)}
            x={3.5 + i * 3.5}
            y={17 - height}
            width="2.4"
            height={height}
            rx="1"
            fill="currentColor"
          />
        ))}
      </>
    ),
    vinyl: (
      <g className={`q-spin ${CENTERED}`} style={{ animationDuration: "2.4s" }}>
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3" />
        <path d="M10 2a8 8 0 0 1 8 8h-3a5 5 0 0 0-5-5z" fill="currentColor" opacity="0.7" />
        <circle cx="10" cy="10" r="2.4" fill="currentColor" />
      </g>
    ),
    note: (
      <g className="q-bob" fill="currentColor">
        <path d="M8 4l8-1.6v10.2h-1.6V6.2L9.6 7.2v7.4H8z" />
        <ellipse cx="6.6" cy="14.8" rx="2.5" ry="2" />
        <ellipse cx="13" cy="12.8" rx="2.5" ry="2" />
      </g>
    ),
    ripple: (
      <>
        <circle cx="5" cy="10" r="2" fill="currentColor" />
        {[5, 8.5, 12].map((radius, i) => (
          <path
            key={radius}
            className="q-twinkle"
            style={stagger(i * 2)}
            d={`M${5 + radius * 0.71} ${10 - radius * 0.71}a${radius} ${radius} 0 0 1 0 ${radius * 1.42}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
  },
  watch: {
    play: (
      <>
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <path className="q-live" d="M8 6.2l6 3.8-6 3.8z" fill="currentColor" />
      </>
    ),
    reel: (
      <g className={`q-spin ${CENTERED}`} style={{ animationDuration: "3s" }}>
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3" />
        {seq(5).map((hole) => {
          const angle = (hole * 2 * Math.PI) / 5;
          return (
            <circle
              key={hole}
              cx={10 + 4.6 * Math.cos(angle)}
              cy={10 + 4.6 * Math.sin(angle)}
              r="1.8"
              fill="currentColor"
            />
          );
        })}
      </g>
    ),
    film: (
      <g className="q-sweep" fill="currentColor">
        <rect x="-6" y="5" width="32" height="10" opacity="0.3" />
        {seq(9).map((hole) => (
          <g key={hole}>
            <rect x={-6 + hole * 4} y="6" width="2" height="1.6" />
            <rect x={-6 + hole * 4} y="12.4" width="2" height="1.6" />
          </g>
        ))}
      </g>
    ),
    screen: (
      <>
        <rect x="2.5" y="4" width="15" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <path d="M7 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <rect className="q-bob" x="4.5" y="9" width="11" height="1.4" fill="currentColor" />
      </>
    ),
  },
  read: {
    book: (
      <>
        <path d="M10 4.5C8 3.3 5.5 3 3 3.2v12.6c2.5-.2 5 .1 7 1.3z" fill="currentColor" opacity="0.35" />
        <path className={`q-flip ${BOXED}`} d="M10 4.5c2-1.2 4.5-1.5 7-1.3v12.6c-2.5-.2-5 .1-7 1.3z" fill="currentColor" />
      </>
    ),
    lines: (
      <>
        {[12, 14, 9, 13].map((width, i) => (
          <rect
            key={i}
            className="q-twinkle"
            style={stagger(i * 2)}
            x="3"
            y={4 + i * 3.5}
            width={width}
            height="1.7"
            rx="0.85"
            fill="currentColor"
          />
        ))}
      </>
    ),
    bookmark: (
      <>
        <rect x="3.5" y="2.5" width="13" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <path className="q-bob" d="M8 3h4.5v8.5l-2.25-1.8L8 11.5z" fill="currentColor" />
      </>
    ),
    panels: (
      <>
        {[
          [3, 3, 14, 5.5],
          [3, 10, 6, 7],
          [11, 10, 6, 7],
        ].map(([x, y, width, height], i) => (
          <rect
            key={i}
            className="q-twinkle"
            style={stagger(i * 3)}
            x={x}
            y={y}
            width={width}
            height={height}
            rx="1"
            fill="currentColor"
          />
        ))}
      </>
    ),
  },
};

const seedOf = (id: string) => {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
};

export const RewindPlaceholder = ({
  category,
  seed,
}: {
  category: RewindCategory;
  seed: string;
}) => {
  const variants = Object.entries(VARIANTS[category]);
  const [name, art] = variants[seedOf(seed) % variants.length]!;
  return (
    <svg
      aria-hidden="true"
      data-placeholder={`${category}-${name}`}
      viewBox="0 0 20 20"
      className="size-5 overflow-hidden"
      style={{ color: `var(--${category})` }}
    >
      {art}
    </svg>
  );
};
