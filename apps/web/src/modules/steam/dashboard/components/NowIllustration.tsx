import { useId, type CSSProperties } from "react";
import type { NowIllustration as Kind } from "../dashboard-now";

const svgProps = {
  "aria-hidden": true,
  viewBox: "0 0 220 110",
  className: "h-[110px] w-[86%]",
  fill: "none",
  stroke: "#d4d4d8",
  strokeOpacity: 0.75,
  strokeWidth: 1,
} as const;

const order = (i: number) => ({ "--i": i }) as CSSProperties;

const NOTES = [
  { x: 12, y: 74, i: 0 },
  { x: 30, y: 84, i: 1 },
  { x: 20, y: 64, i: 2 },
];

const EQ_BARS = [0, 1, 2, 3, 4];

const SPARKS = [
  { x: 96, y: 18, i: 0 },
  { x: 124, y: 14, i: 1 },
  { x: 110, y: 8, i: 2 },
];

const RIGHT_PAGE = "M110 22c18-12 44-14 70-8v80c-26-6-52-4-70 8z";

export const NowIllustration = ({ kind, color = "#d4d4d8" }: { kind: Kind; color?: string }) => {
  const screenId = useId();
  if (kind === "vinyl") {
    return (
      <svg {...svgProps}>
        <g className="q-spin [transform-box:fill-box] [transform-origin:center]">
          <circle cx="96" cy="55" r="50" />
          <circle cx="96" cy="55" r="40" strokeOpacity="0.35" />
          <circle cx="96" cy="55" r="31" strokeOpacity="0.35" />
          <circle cx="96" cy="55" r="15" />
          <path d="M96 40v6" strokeWidth="2" />
          <circle cx="96" cy="55" r="2" fill="#d4d4d8" />
        </g>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="q-ripple"
            style={order(i)}
            cx="96"
            cy="55"
            r="48"
            stroke={color}
          />
        ))}
        {NOTES.map((n) => (
          <g key={n.i} transform={`translate(${n.x} ${n.y})`}>
            <g className="q-rise" style={order(n.i)} stroke={color} strokeWidth="1.4">
              <circle cx="0" cy="8" r="2.5" fill={color} />
              <path d="M2.5 8V-2l6 2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        ))}
        <g className="q-arm">
          <path d="M186 10v14l-30 56-8 4" strokeLinecap="round" />
          <circle cx="186" cy="12" r="6" />
        </g>
        {EQ_BARS.map((i) => (
          <rect
            key={i}
            className="q-eq [transform-box:fill-box]"
            style={order(i * 2)}
            x={182 + i * 7}
            y={72 + (i % 2) * 8}
            width="3"
            height={30 - (i % 2) * 8}
            rx="1.5"
            fill={color}
            stroke="none"
          />
        ))}
      </svg>
    );
  }
  if (kind === "tv") {
    return (
      <svg {...svgProps}>
        <rect className="q-draw" pathLength={1} x="34" y="8" width="152" height="84" rx="8" />
        <rect x="44" y="18" width="132" height="64" rx="3" strokeOpacity="0.35" />
        <clipPath id={screenId}>
          <rect x="44" y="18" width="132" height="64" rx="3" />
        </clipPath>
        <g clipPath={`url(#${screenId})`}>
          <circle className="q-twinkle" style={order(0)} cx="62" cy="30" r="1" fill={color} stroke="none" />
          <circle className="q-twinkle" style={order(3)} cx="152" cy="28" r="1" fill={color} stroke="none" />
          <circle className="q-twinkle" style={order(5)} cx="86" cy="26" r="1" fill={color} stroke="none" />
          <path
            className="q-pan"
            style={{ "--q-pan": "-66px", "--q-pan-time": "6s" } as CSSProperties}
            d="M44 66q16.5-16 33 0t33 0 33 0 33 0 33 0 33 0"
            strokeOpacity="0.4"
          />
          <path
            className="q-pan"
            style={{ "--q-pan": "-44px", "--q-pan-time": "2.8s" } as CSSProperties}
            d="M44 74q11-8 22 0t22 0 22 0 22 0 22 0 22 0 22 0"
            stroke={color}
          />
          <rect className="q-scan" x="44" y="18" width="132" height="2" fill={color} fillOpacity="0.28" stroke="none" />
        </g>
        <circle className="q-ripple" style={order(0)} cx="110" cy="50" r="24" stroke={color} />
        <circle className="q-ripple" style={order(1.5)} cx="110" cy="50" r="24" stroke={color} />
        <g className="q-pulse">
          <circle cx="110" cy="50" r="12" fill="#141416" />
          <path d="M106 44v12l10-6z" fill={color} stroke={color} strokeLinejoin="round" />
        </g>
        <path d="M92 102h36M110 92v10" />
        <circle className="q-live" cx="176" cy="87" r="1.5" fill={color} stroke="none" />
      </svg>
    );
  }
  if (kind === "book") {
    return (
      <svg {...svgProps}>
        <path
          className="q-draw"
          pathLength={1}
          d="M110 22c-18-12-44-14-70-8v80c26-6 52-4 70 8 18-12 44-14 70-8V14c-26-6-52-4-70 8zM110 22v80"
        />
        {[
          "M54 34c14-2 28 0 42 6",
          "M54 48c14-2 28 0 42 6",
          "M54 62c14-2 28 0 42 6",
          "M124 40c14-6 28-8 42-6",
          "M124 54c14-6 28-8 42-6",
          "M124 68c14-6 28-8 42-6",
        ].map((d, i) => (
          <path key={d} className="q-write" style={order(i)} pathLength={1} d={d} strokeOpacity="0.5" />
        ))}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            className="q-page"
            style={order(i)}
            d={RIGHT_PAGE}
            fill="#161618"
            stroke={color}
            strokeLinejoin="round"
          />
        ))}
        <path d="M110 22v80" />
        {SPARKS.map((p) => (
          <g key={p.i} transform={`translate(${p.x} ${p.y + 14})`}>
            <path
              className="q-rise"
              style={order(p.i)}
              d="M0-3v6M-3 0h6"
              stroke={color}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg {...svgProps}>
      <path
        className="q-draw"
        pathLength={1}
        d="M62 22h96c18 0 30 10 34 28l10 34c4 14-6 22-16 22-8 0-13-5-18-12l-10-14H62l-10 14c-5 7-10 12-18 12-10 0-20-8-16-22l10-34c4-18 16-28 34-28z"
      />
      <path
        d="M58 46v20M48 56h20M160 50h.01M172 60h.01M148 60h.01M160 70h.01"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="90" cy="78" r="9" />
      <circle cx="130" cy="78" r="9" />
      <path d="M96 34h28" strokeDasharray="2 3" />
    </svg>
  );
};
