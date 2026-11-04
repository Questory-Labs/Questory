import { useId } from "react";
import { cn } from "@questorylabs/ui";

export const Vinyl = ({
  coverUrl,
  initial,
  size = 150,
  className,
}: {
  coverUrl?: string | null;
  initial?: string;
  size?: number;
  className?: string;
}) => {
  const clipId = useId();
  return (
    <svg
      aria-hidden="true"
      data-testid="music-vinyl"
      viewBox="0 0 160 160"
      width={size}
      height={size}
      fill="none"
      stroke="#e8d6db"
      strokeOpacity={0.75}
      strokeWidth={1}
      className={cn("relative flex-none", className)}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="80" cy="80" r="24" />
        </clipPath>
      </defs>
      <g className="q-spin origin-center [transform-box:fill-box]">
        <circle cx="80" cy="80" r="74" />
        <circle cx="80" cy="80" r="62" strokeOpacity={0.3} />
        <circle cx="80" cy="80" r="50" strokeOpacity={0.3} />
        <circle cx="80" cy="80" r="38" strokeOpacity={0.3} />
        <path d="M80 52v8" strokeWidth={2} />
        {coverUrl ? (
          <image
            href={coverUrl}
            x="56"
            y="56"
            width="48"
            height="48"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : null}
      </g>
      {coverUrl ? null : (
        <>
          <circle cx="80" cy="80" r="24" fill="rgba(240,168,184,0.12)" stroke="none" />
          {initial ? (
            <text
              x="80"
              y="90"
              textAnchor="middle"
              fill="#f0c4cf"
              stroke="none"
              className="font-serif"
              fontSize="30"
            >
              {initial}
            </text>
          ) : null}
        </>
      )}
    </svg>
  );
};
