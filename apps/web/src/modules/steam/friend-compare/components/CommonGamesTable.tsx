import type { FriendCompare } from "@questorylabs/shared";
import { minutesToHours } from "../steam.friend-compare.utils";

export const CommonGamesTable = ({
  games,
  friendName,
}: {
  games: FriendCompare["commonGameList"];
  friendName: string;
}) => {
  const max = Math.max(
    1,
    ...games.map((g) =>
      Math.max(g.yourPlaytimeMinutes ?? 0, g.friendPlaytimeMinutes ?? 0),
    ),
  );
  const pct = (minutes: number | undefined) =>
    `${Math.round(((minutes ?? 0) / max) * 100)}%`;

  return (
    <div className="panel q-in px-2.5 pt-[18px] pb-2.5 [--i:8]">
      <div className="mx-2.5 mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-normal">Games in common, most played</h3>
        <p className="flex gap-3.5 font-mono text-[10px] text-[var(--muted)]">
          <span>
            <span
              aria-hidden="true"
              className="mr-1.5 inline-block h-0.5 w-2.5 bg-[var(--ink)] align-middle"
            />
            You
          </span>
          <span>
            <span
              aria-hidden="true"
              className="mr-1.5 inline-block h-0.5 w-2.5 bg-[var(--music)] align-middle"
            />
            {friendName}
          </span>
        </p>
      </div>
      {games.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="label-mono text-left">
                <th scope="col" className="px-3 py-2.5 font-normal">
                  Game
                </th>
                <th scope="col" className="w-[46%] px-3 py-2.5 font-normal">
                  Hours
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-normal">
                  You
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-normal">
                  {friendName}
                </th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.appId} className="q-row border-t border-white/5">
                  <td className="p-3 font-normal">
                    <span className="flex items-center gap-2.5">
                      {g.headerImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.headerImage}
                          alt=""
                          className="h-6 w-[51px] flex-none rounded-md object-cover"
                        />
                      ) : null}
                      <span className="min-w-0 truncate">{g.name}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1" aria-hidden="true">
                      <div className="h-0.5 rounded-sm bg-white/[0.06]">
                        <div
                          className="q-bar h-full rounded-sm bg-[var(--ink)]"
                          style={{ width: pct(g.yourPlaytimeMinutes) }}
                        />
                      </div>
                      <div className="h-0.5 rounded-sm bg-white/[0.06]">
                        <div
                          className="q-bar h-full rounded-sm bg-[var(--music)]"
                          style={{ width: pct(g.friendPlaytimeMinutes) }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right text-lg font-light">
                    {minutesToHours(g.yourPlaytimeMinutes)}
                    <span className="text-[11px] text-[var(--faint)]"> h</span>
                  </td>
                  <td className="p-3 text-right text-lg font-light text-[#a1a1a6]">
                    {minutesToHours(g.friendPlaytimeMinutes)}
                    <span className="text-[11px] text-[var(--faint)]"> h</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mx-2.5 py-4 text-sm text-[var(--muted)]">
          No games in common yet.
        </p>
      )}
    </div>
  );
};
