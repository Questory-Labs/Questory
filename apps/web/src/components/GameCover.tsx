import type { ReactNode } from "react";

/**
 * Steam header capsule (460×215) that always covers its box.
 * Add `grow` when the parent is a stretched flex/grid cell so art fills leftover height.
 */
export function GameCover({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  fallback = "No art",
  children,
}: {
  src: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallback?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--bg-2)] ${className}`.trim()}
    >
      <div className="aspect-[460/215] w-full" aria-hidden />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`.trim()}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center hatch-fill text-xs text-[var(--faint)]">
          {fallback}
        </div>
      )}
      {children}
    </div>
  );
}
