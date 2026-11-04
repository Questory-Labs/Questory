import Link from "next/link";
import type { LibraryEntry } from "@questorylabs/shared";
import { StoreBadgeRow } from "@/components/StoreBadge";
import { formatRelativePlayed } from "@/lib/dates";
import {
  LIBRARY_STATUS_LABELS,
  LIBRARY_STATUS_TONE,
} from "../steam.library.constants";
import {
  achievementShare,
  formatEntryValue,
  formatHours,
} from "../steam.library.utils";

const th = "px-3.5 py-3 font-normal";

export const LibraryTable = ({
  items,
  currency,
}: {
  items: LibraryEntry[];
  currency: string;
}) => {
  const maxMinutes = Math.max(1, ...items.map((i) => i.playtimeForever));
  return (
    <div className="panel q-in overflow-x-auto p-1.5">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="label-mono text-left text-[var(--faint)]">
            <th scope="col" className={th}>Game</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={`${th} w-[30%]`}>Hours</th>
            <th scope="col" className={th}>Achievements</th>
            <th scope="col" className={th}>Value</th>
            <th scope="col" className={th}>Last played</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const share = achievementShare(item);
            const status = item.userStatus ?? null;
            const stores = item.stores || item.game.stores || [];
            return (
              <tr key={item.game.id} className="q-row border-t border-white/[0.05]">
                <td className="px-3.5 py-2.5 font-normal">
                  <div className="flex items-center gap-2">
                    <Link href={`/library/${item.game.id}`} className="hover:underline">
                      {item.game.name}
                    </Link>
                    <StoreBadgeRow stores={stores} />
                  </div>
                </td>
                <td
                  className={`px-3.5 py-2.5 ${
                    status ? LIBRARY_STATUS_TONE[status] : "text-[var(--faint)]"
                  }`}
                >
                  {status
                    ? LIBRARY_STATUS_LABELS[status]
                    : item.playtimeForever === 0
                      ? "Never played"
                      : "—"}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-[3px] flex-1 rounded-sm bg-white/[0.06]">
                      <div
                        className="q-bar h-full rounded-sm bg-[#bdbdc2]"
                        style={{
                          width: `${Math.round((item.playtimeForever / maxMinutes) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-11 text-right font-normal">
                      {formatHours(item.playtimeForever)}
                    </span>
                  </div>
                </td>
                <td className="px-3.5 py-2.5 text-[var(--muted)]">
                  {share != null ? `${Math.round(share * 100)}%` : "—"}
                </td>
                <td className="px-3.5 py-2.5 text-[var(--muted)]">
                  {formatEntryValue(item, currency) ?? "—"}
                </td>
                <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--faint)]">
                  {item.lastPlayedAt ? formatRelativePlayed(item.lastPlayedAt) : "never"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
