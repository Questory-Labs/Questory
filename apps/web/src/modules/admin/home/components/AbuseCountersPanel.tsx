import { ABUSE_LABELS } from "../admin.home.utils";

export const AbuseCountersPanel = ({ abuse }: { abuse: Record<string, number> }) => {
  const entries = Object.entries(abuse);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <section
      aria-labelledby="admin-abuse"
      className="panel q-in [--i:11] min-w-0 flex-[1_1_300px] px-5 py-[18px]"
    >
      <h2 id="admin-abuse" className="text-base font-normal">
        Abuse counters{" "}
        <span className="font-mono text-[11px] text-[var(--faint)]">since restart</span>
      </h2>
      {entries.length ? (
        <dl className="mt-3.5 flex flex-col gap-3.5">
          {entries.map(([key, value]) => (
            <div key={key}>
              <div className="flex items-baseline justify-between">
                <dt className="text-[13px] text-[var(--muted)]">{ABUSE_LABELS[key] ?? key}</dt>
                <dd className="text-2xl font-extralight tabular-nums">{value}</dd>
              </div>
              <div aria-hidden className="mt-1.5 h-[3px] rounded-sm bg-white/[0.06]">
                <div
                  className={`q-grow-x h-full rounded-sm ${
                    value > 0
                      ? "bg-[var(--warn)] shadow-[0_0_8px_var(--warn)]"
                      : "bg-[#bdbdc2]"
                  }`}
                  style={{ width: `${Math.round((value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">No counters.</p>
      )}
    </section>
  );
};
