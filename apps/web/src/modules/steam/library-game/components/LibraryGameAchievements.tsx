import type { GameDetail } from "@questorylabs/shared";
import { ProgressRing } from "@questorylabs/ui";
import { formatDate } from "@/lib/dates";

export const LibraryGameAchievements = ({
  achievements,
}: {
  achievements: GameDetail["achievements"];
}) => {
  if (!achievements || (!achievements.global.length && achievements.pct == null)) {
    return (
      <p className="panel q-in p-5 text-[13px] text-[var(--muted)]">
        No achievements for this game.
      </p>
    );
  }
  const { unlocked, total, pct, global } = achievements;
  return (
    <div className="flex flex-col gap-3.5">
      {pct != null ? (
        <section className="panel q-in flex items-center gap-4 p-5">
          <ProgressRing value={pct / 100} size={64} stroke={3} label={`${pct}% of achievements unlocked`}>
            <span className="text-[13px]">{Math.round(pct)}%</span>
          </ProgressRing>
          <p className="text-[22px] font-light">
            {unlocked ?? 0}
            <span className="text-[13px] text-[var(--faint)]"> / {total ?? global.length} unlocked</span>
          </p>
        </section>
      ) : null}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {global.map((a, i) => (
          <li
            key={a.name}
            className={`panel q-lift q-in flex items-center gap-3.5 px-4 py-3.5 ${a.unlocked === false ? "opacity-55" : ""}`}
            style={{ ["--i" as string]: Math.min(i, 12) }}
          >
            {a.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.icon} alt="" loading="lazy" className="h-11 w-11 flex-none rounded-[14px] border border-white/10" />
            ) : (
              <span aria-hidden="true" className="dot-matrix h-11 w-11 flex-none rounded-[14px] border border-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-normal">{a.displayName}</p>
              <div className="mt-1.5 h-0.5 bg-white/[0.07]">
                <div className="q-bar h-full bg-[#bdbdc2]" style={{ width: `${Math.min(100, a.percent)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-[var(--faint)]">
                {a.percent.toFixed(1)}% of players
                {a.unlocked
                  ? ` · ${a.unlockTime ? formatDate(a.unlockTime) : "unlocked"}`
                  : a.unlocked === false
                    ? " · locked"
                    : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
