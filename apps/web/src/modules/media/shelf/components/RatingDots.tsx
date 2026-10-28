import { cn } from "@questorylabs/ui";
import { ratingDots } from "../shelf.utils";

export const RatingDots = ({
  rating,
  accent,
  size = "sm",
}: {
  rating: number | null | undefined;
  accent: string;
  size?: "sm" | "md";
}) => {
  if (rating == null) return null;
  return (
    <span role="img" aria-label={`Rated ${rating} of 5`} className={cn("flex", size === "md" ? "gap-1.5" : "gap-1")}>
      {ratingDots(rating).map((on, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("rounded-full", size === "md" ? "h-[9px] w-[9px]" : "h-1.5 w-1.5")}
          style={{
            background: on ? accent : "rgba(255,255,255,0.12)",
            boxShadow: on ? `0 0 6px color-mix(in srgb, ${accent} 70%, transparent)` : undefined,
          }}
        />
      ))}
    </span>
  );
};
