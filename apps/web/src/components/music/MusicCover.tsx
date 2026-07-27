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
        className={`${dim} shrink-0 bg-[var(--bg-1)] ring-1 ring-[var(--line)]`}
        aria-hidden
      />
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
