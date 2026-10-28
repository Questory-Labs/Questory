import type { GameDetail } from "@questorylabs/shared";
import { hltbRows } from "../steam.library-game.charts";
import { formatHours, hltbStory } from "../steam.library-game.utils";

export const LibraryGameHltb = ({
  hltb,
  hours,
}: {
  hltb: GameDetail["hltb"];
  hours: number;
}) => {
  const data = hltbRows(hltb, hours);
  const story = hltbStory(hours, hltb);
  return (
    <section aria-labelledby="game-hltb" className="panel q-lift q-in p-5" style={{ ["--i" as string]: 4 }}>
      <h2 id="game-hltb" className="text-[17px] font-normal">
        How long to beat
      </h2>
      {data ? (
        <>
          {story ? (
            <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">{story.hint}</p>
          ) : null}
          <ul className="flex flex-col gap-3.5">
            {data.rows.map((r) => (
              <li key={r.label}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--muted)]">{r.label}</span>
                  <span>{formatHours(r.hours)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="q-bar h-full rounded-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.7)_0_2px,transparent_2px_4px)]"
                    style={{ width: `${r.width}%` }}
                  />
                </div>
              </li>
            ))}
            <li>
              <div className="flex justify-between text-[13px]">
                <span>You</span>
                <span>{formatHours(hours)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.05]">
                <div
                  className="q-bar h-full rounded-full bg-[var(--ink)] shadow-[0_0_14px_rgba(255,255,255,0.5)]"
                  style={{ width: `${data.youWidth}%` }}
                />
              </div>
            </li>
          </ul>
          {hltb?.sourceUrl ? (
            <a
              href={hltb.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block font-mono text-[11px] text-[var(--faint)] hover:text-[var(--ink)]"
            >
              HowLongToBeat →
            </a>
          ) : null}
        </>
      ) : (
        <p className="mt-1 text-[13px] text-[var(--muted)]">No HowLongToBeat match found.</p>
      )}
    </section>
  );
};
