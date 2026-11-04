import { DotCover, cn } from "@questorylabs/ui";

export const CoverArt = ({
  src,
  seed,
  alt = "",
  className,
  imgClassName,
}: {
  src: string | null | undefined;
  seed: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) =>
  src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className, imgClassName)}
    />
  ) : (
    <DotCover seed={seed} className={cn("h-full w-full", className)} />
  );
