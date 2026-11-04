import { cn, DotCover } from "@questorylabs/ui";

export const PosterThumb = ({
  url,
  seed,
  tint,
  className,
  alt = "",
}: {
  url: string | null | undefined;
  seed: string;
  tint?: string;
  className?: string;
  alt?: string;
}) =>
  url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" className={cn("block h-full w-full object-cover", className)} />
  ) : (
    <DotCover seed={seed} tint={tint} className={cn("h-full w-full", className)} />
  );
