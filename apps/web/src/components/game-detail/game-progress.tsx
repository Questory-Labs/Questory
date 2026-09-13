"use client";

import type { GameDetail } from "@questorylabs/shared";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { GAME_DETAIL_ACHIEVEMENT_LIMIT } from "./game-detail.constants";
import { SectionTitle } from "./game-detail-shared";

export const GameHltbSection = ({
  detail,
  playtimeHours,
}: {
  detail: GameDetail;
  playtimeHours?: number;
}) => {
  const d = detail;
  const hltbMain = d.hltb?.mainHours;
  const hltbProgress =
    hltbMain != null && hltbMain > 0 && playtimeHours != null
      ? Math.min(playtimeHours, hltbMain)
      : null;

  return (
    <section>
      <SectionTitle>HowLongToBeat</SectionTitle>
      {d.hltb ? (
        <>
          {hltbProgress != null && hltbMain ? (
            <GaugeChart
              value={hltbProgress}
              max={hltbMain}
              ariaLabel="HowLongToBeat main-story progress"
              label={`${playtimeHours}h of ${hltbMain}h main story`}
            />
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="panel-outline px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Main
              </div>
              <div className="mt-1 text-sm font-semibold">
                {d.hltb.mainHours != null ? `${d.hltb.mainHours}h` : "—"}
              </div>
            </div>
            <div className="panel-outline px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Extra
              </div>
              <div className="mt-1 text-sm font-semibold">
                {d.hltb.extraHours != null ? `${d.hltb.extraHours}h` : "—"}
              </div>
            </div>
            <div className="panel-outline px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                100%
              </div>
              <div className="mt-1 text-sm font-semibold">
                {d.hltb.completionistHours != null
                  ? `${d.hltb.completionistHours}h`
                  : "—"}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">No HowLongToBeat match found.</p>
      )}
    </section>
  );
};

export const GameAchievementsSection = ({ detail }: { detail: GameDetail }) => {
  const d = detail;
  if (
    !d.achievements ||
    (d.achievements.global.length === 0 && d.achievements.pct == null)
  ) {
    return null;
  }

  return (
    <section>
      <SectionTitle>Achievements</SectionTitle>
      {d.achievements.pct != null && (
        <GaugeChart
          value={d.achievements.pct}
          max={100}
          ariaLabel="Achievement completion"
          label={`${d.achievements.unlocked}/${d.achievements.total} (${d.achievements.pct}%)`}
        />
      )}
      {d.achievements.global.length > 0 && (
        <ul className="mt-3 space-y-2">
          {d.achievements.global.slice(0, GAME_DETAIL_ACHIEVEMENT_LIMIT).map((a) => (
            <li key={a.name} className="flex items-start gap-2 text-sm">
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.icon}
                  alt=""
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-sm"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="truncate">{a.displayName}</div>
                <div className="font-mono text-[10px] text-[var(--faint)]">
                  {a.percent.toFixed(1)}% of players
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
