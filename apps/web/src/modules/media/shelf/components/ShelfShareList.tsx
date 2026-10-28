import type { ShelfShare } from "../shelf.utils";

export const ShelfShareList = ({
  items,
  accent,
  variant = "bar",
}: {
  items: ShelfShare[];
  accent: string;
  variant?: "bar" | "dot";
}) =>
  variant === "dot" ? (
    <ul className="m-0 list-none p-0">
      {items.map((s) => (
        <li key={s.key} className="q-row flex min-h-11 items-center gap-2.5 rounded-[14px] px-2">
          <span aria-hidden="true" className="dot text-[var(--ok)]" />
          <span className="flex-1 font-normal">{s.label}</span>
          <span className="text-[22px] font-extralight">
            {s.pct}
            <span className="text-[11px] text-[var(--faint)]">%</span>
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
      {items.map((s, i) => (
        <li key={s.key}>
          <div className="flex items-baseline justify-between text-sm">
            <span>{s.label}</span>
            <span className="font-mono text-xs text-[var(--muted)]">{s.pct}%</span>
          </div>
          <div className="mt-[7px] h-0.5 bg-white/[0.07]">
            <div
              className="q-bar h-full"
              style={{
                width: `${s.pct}%`,
                background: i === 0 ? accent : "#bdbdc2",
                boxShadow: i === 0 ? `0 0 10px color-mix(in srgb, ${accent} 60%, transparent)` : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
