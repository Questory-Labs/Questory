import type { CSSProperties } from "react";
import type { MusicTimeBucket } from "@questorylabs/shared";
import { Panel } from "@/components/ui";

export const HourBars = ({
  buckets,
  title = "By hour",
  ariaLabel = "Listens by hour of day",
}: {
  buckets: MusicTimeBucket[];
  title?: string;
  ariaLabel?: string;
}) => {
  const max = Math.max(0, ...buckets.map((b) => b.count));
  const peakIndex = max > 0 ? buckets.findIndex((b) => b.count === max) : -1;
  const peak = peakIndex >= 0 ? buckets[peakIndex] : null;
  const first = buckets[0];
  const middle = buckets[Math.floor(buckets.length / 2)];
  const last = buckets[buckets.length - 1];
  return (
    <Panel wrapperClassName="h-full" className="q-lift h-full p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-normal">{title}</h2>
        {peak ? (
          <p className="text-[13px] text-[var(--muted)]">
            Peak <span className="text-[var(--ink)]">{peak.label}</span>
          </p>
        ) : null}
      </div>
      {max > 0 ? (
        <>
          <div
            role="img"
            aria-label={peak ? `${ariaLabel}, peaking at ${peak.label}` : ariaLabel}
            className="mt-[18px] flex h-[140px] items-end gap-[3px]"
          >
            {buckets.map((b, i) => {
              const ratio = b.count / max;
              const isPeak = i === peakIndex;
              return (
                <span
                  key={b.key}
                  title={`${b.label} · ${b.count} listens`}
                  data-peak={isPeak ? "true" : undefined}
                  className={`q-grow flex-1 rounded-sm ${
                    isPeak
                      ? "bg-[var(--music)] shadow-[0_0_12px_rgba(240,168,184,0.7)]"
                      : ""
                  }`}
                  style={
                    {
                      "--i": i,
                      height: `${Math.max(2, ratio * 100)}%`,
                      ...(isPeak
                        ? {}
                        : {
                            background: `rgba(255,255,255,${(0.12 + ratio * 0.5).toFixed(2)})`,
                          }),
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="mt-2 flex justify-between font-mono text-[10px] text-[var(--faint)]"
          >
            <span>{first?.label}</span>
            <span>{middle?.label}</span>
            <span>{last?.label}</span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">No listens in this range.</p>
      )}
    </Panel>
  );
};
