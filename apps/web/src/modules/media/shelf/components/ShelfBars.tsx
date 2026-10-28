import { cn } from "@questorylabs/ui";
import { peakIndex, type ShelfBar } from "../shelf.utils";

export const ShelfBars = ({
  items,
  accent,
  ariaLabel,
  heightClass = "h-[150px]",
  gapClass = "gap-3",
  barClass = "rounded-t-[10px] rounded-b-[3px]",
  labels = "all",
  highlight,
}: {
  items: ShelfBar[];
  accent: string;
  ariaLabel: string;
  heightClass?: string;
  gapClass?: string;
  barClass?: string;
  labels?: "all" | "ends" | "none";
  highlight?: number;
}) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  const hot = highlight ?? peakIndex(items);
  return (
    <div>
      <div role="img" aria-label={ariaLabel} className={cn("flex items-end", heightClass, gapClass)}>
        {items.map((item, i) => {
          const share = item.count / max;
          return (
            <span
              key={`${item.label}-${i}`}
              data-peak={i === hot ? "true" : undefined}
              className={cn("q-grow min-h-[2px] flex-1 transition-colors hover:!bg-white", barClass)}
              style={{
                ["--i" as string]: i,
                height: `${Math.max(1.5, share * 100)}%`,
                background: i === hot ? accent : `rgba(237,237,238,${(0.1 + share * 0.35).toFixed(2)})`,
                boxShadow: i === hot ? `0 0 16px color-mix(in srgb, ${accent} 55%, transparent)` : undefined,
              }}
            />
          );
        })}
      </div>
      {labels === "all" ? (
        <div aria-hidden="true" className={cn("mt-2 flex font-mono text-[10px] text-[var(--faint)]", gapClass)}>
          {items.map((item, i) => (
            <span key={`${item.label}-l-${i}`} className="flex-1 text-center">
              {item.label}
            </span>
          ))}
        </div>
      ) : labels === "ends" && items.length > 0 ? (
        <div aria-hidden="true" className="mt-2 flex justify-between font-mono text-[10px] text-[var(--faint)]">
          <span>{items[0].label}</span>
          {items.length > 2 ? <span>{items[Math.floor(items.length / 2)].label}</span> : null}
          <span>{items[items.length - 1].label}</span>
        </div>
      ) : null}
    </div>
  );
};
