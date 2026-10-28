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

export const NowIllustration = ({ kind }: { kind: Kind }) => {
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
        <path d="M186 10v14l-30 56-8 4" strokeLinecap="round" />
        <circle cx="186" cy="12" r="6" />
      </svg>
    );
  }
  if (kind === "tv") {
    return (
      <svg {...svgProps}>
        <rect className="q-draw" pathLength={1} x="34" y="8" width="152" height="84" rx="8" />
        <rect x="44" y="18" width="132" height="64" rx="3" strokeOpacity="0.35" />
        <path d="M92 102h36M110 92v10" />
        <path d="M100 38v24l20-12z" strokeLinejoin="round" />
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
        <path
          d="M54 34c14-2 28 0 42 6M54 48c14-2 28 0 42 6M54 62c14-2 28 0 42 6M124 40c14-6 28-8 42-6M124 54c14-6 28-8 42-6"
          strokeOpacity="0.35"
        />
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
