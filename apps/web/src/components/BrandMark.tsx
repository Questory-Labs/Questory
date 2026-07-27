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
};

export function BrandMark({
  href = "/",
  size = "md",
  showWordmark = true,
  className = "",
  wordmarkClassName = "",
}: BrandMarkProps) {
  const px = SIZES[size];
  const mark = (
    <span
      className={`inline-flex items-center gap-2.5 text-[var(--ink)] ${className}`}
    >
      <img
        src="/favicon.svg"
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
          Questory
        </span>
      ) : (
        <span className="sr-only">Questory</span>
      )}
    </span>
  );

  if (href == null) return mark;

  return (
    <Link
      href={href}
      className="inline-flex transition hover:opacity-90"
      aria-label="Questory home"
    >
      {mark}
    </Link>
  );
}
