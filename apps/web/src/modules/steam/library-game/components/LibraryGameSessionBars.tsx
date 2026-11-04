import type { GameDetail } from "@questorylabs/shared";
import { formatCalendarDay } from "@/lib/dates";
import { formatMinutes, sessionBars } from "../steam.library-game.charts";

export const LibraryGameSessionBars = ({
  sessions,
}: {
  sessions: NonNullable<GameDetail["sessions90d"]>;
}) => {
  const bars = sessionBars(sessions.days);
  if (!bars.length) return null;
  const mid = bars[Math.floor(bars.length / 2)];
  return (
    <section aria-labelledby="game-sessions-90" className="panel q-lift q-in p-5" style={{ ["--i" as string]: 3 }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="game-sessions-90" className="text-[17px] font-normal">
          Sessions · {bars.length} days
        </h2>
        <p className="text-[13px] text-[var(--muted)]">
          <span className="text-[var(--ink)]">{sessions.count}</span> sessions · avg{" "}
          <span className="text-[var(--ink)]">{formatMinutes(sessions.avgMinutes)}</span>
        </p>
      </div>
      <div
        role="img"
        aria-label={`Daily play time for the last ${bars.length} days`}
        className="mt-[18px] flex h-[120px] items-end gap-[3px]"
      >
        {bars.map((b, i) => (
          <span
            key={b.date}
            title={`${formatCalendarDay(b.date)} · ${formatMinutes(b.minutes)}`}
            className={`q-grow flex-1 rounded-sm ${b.minutes > 0 ? "bg-[#bdbdc2]" : "bg-white/[0.05]"}`}
            style={{ ["--i" as string]: i, height: `${b.height || 2}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--faint)]">
        <span>{formatCalendarDay(bars[0].date)}</span>
        <span>{formatCalendarDay(mid.date)}</span>
        <span>Today</span>
      </div>
    </section>
  );
};
