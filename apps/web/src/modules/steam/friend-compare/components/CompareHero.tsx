import Link from "next/link";
import { CountUp } from "@questorylabs/ui";
import type { FriendCompare } from "@questorylabs/shared";
import { friendInitial } from "../../friends/steam.friends.utils";
import {
  sharedGenresLine,
  tasteOverlapPercent,
} from "../steam.friend-compare.utils";

export const CompareHero = ({ data }: { data: FriendCompare }) => {
  const overlap = tasteOverlapPercent(data);
  const genres = sharedGenresLine(
    data.favoriteGenresYou,
    data.favoriteGenresFriend,
  );
  const cached = data.meta?.friendLibraryCached ?? true;

  return (
    <div className="panel q-in flex flex-wrap items-center gap-[22px] p-[22px] [--i:2]">
      <div aria-hidden="true" className="relative h-[84px] w-32 flex-none">
        <svg
          viewBox="0 0 128 84"
          fill="none"
          className="absolute inset-0 h-full w-full"
        >
          <circle cx="44" cy="42" r="36" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1" />
          <circle cx="84" cy="42" r="36" stroke="var(--music)" strokeOpacity="0.7" strokeWidth="1" />
          <circle className="q-draw" pathLength={1} cx="44" cy="42" r="30" stroke="var(--accent)" strokeOpacity="0.3" />
          <circle className="q-draw" pathLength={1} cx="84" cy="42" r="30" stroke="var(--music)" strokeOpacity="0.3" />
        </svg>
        <span className="absolute top-[30px] left-[14px] text-[15px] font-medium">
          Y
        </span>
        <span className="absolute top-[30px] right-[14px] text-[15px] font-medium">
          {friendInitial(data.friend.personaName)}
        </span>
      </div>
      <div className="min-w-[200px] flex-1">
        <p className="label-mono m-0">Comparing</p>
        <h2 className="mt-1 text-[28px] font-light tracking-[-0.02em]">
          You and <span className="font-serif">{data.friend.personaName}</span>
        </h2>
        {genres ? (
          <p className="mt-1 text-[13px] text-[var(--muted)]">{genres}</p>
        ) : null}
      </div>
      {cached ? (
        <div className="text-right">
          <p className="m-0 text-[54px] leading-[0.9] font-extralight tracking-[-0.04em]">
            <CountUp value={overlap} />
            <span className="text-lg text-[var(--dim)]">%</span>
          </p>
          <p className="label-mono mt-1">Taste overlap</p>
        </div>
      ) : null}
      <Link
        href={`/multiplayer?friends=${encodeURIComponent(data.friend.steamId)}`}
        className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-[18px] text-sm font-medium text-[#0a0a0b] no-underline transition-[transform,box-shadow] duration-500 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(255,255,255,0.35)] motion-reduce:transition-none"
      >
        Plan a session
      </Link>
    </div>
  );
};
