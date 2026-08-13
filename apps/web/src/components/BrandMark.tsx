import Link from "next/link";

const SIZES = {
  sm: 28,
  md: 36,
  lg: 72,
} as const;

type BrandMarkProps = {
  href?: string | null;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
  wordmark?: string;
  markSrc?: string;
};

export function BrandMark({
  href = "/",
  size = "md",
  showWordmark = true,
  className = "",
  wordmarkClassName = "",
  wordmark = "Questory",
  markSrc = "/favicon.svg",
}: BrandMarkProps) {
  const px = SIZES[size];
  const mark = (
    <span
      className={`inline-flex items-center gap-2.5 text-[var(--ink)] ${className}`}
    >
      <img
        src={markSrc}
        alt=""
        width={px}
        height={px}
        className="shrink-0 rounded-[20%]"
        decoding="async"
      />
      {showWordmark ? (
        <span
          className={`font-display leading-none tracking-tight ${wordmarkClassName}`}
          style={{ fontWeight: size === "sm" ? 700 : 800 }}
        >
          {wordmark}
        </span>
      ) : (
        <span className="sr-only">{wordmark}</span>
      )}
    </span>
  );

  if (href == null) return mark;

  return (
    <Link
      href={href}
      className="inline-flex transition hover:opacity-90"
      aria-label={`${wordmark} home`}
    >
      {mark}
    </Link>
  );
}
