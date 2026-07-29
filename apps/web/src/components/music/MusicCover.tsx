export function MusicCover({
  src,
  alt,
  size = "sm",
}: {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "h-28 w-28" : size === "md" ? "h-14 w-14" : "h-10 w-10";
  if (!src) {
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center bg-[var(--bg-2)] ring-1 ring-[var(--line)]`}
        aria-hidden
      >
        <span className="font-mono text-[11px] text-[var(--faint)]">♪</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${dim} shrink-0 object-cover ring-1 ring-[var(--line)]`}
      loading="lazy"
    />
  );
}
