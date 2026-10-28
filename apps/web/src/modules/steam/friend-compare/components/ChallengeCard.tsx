import type { FriendCompare } from "@questorylabs/shared";

export const ChallengeCard = ({
  games,
}: {
  games: FriendCompare["challengeGames"];
}) => (
  <div className="panel-accent q-in p-5 [--i:7]">
    <p className="label-mono m-0 flex items-center gap-2 !text-[var(--warm)]">
      <span aria-hidden="true" className="dot q-live h-[5px] w-[5px]" />
      Challenge mode
    </p>
    <h3 className="font-serif mt-2 text-2xl text-[#f3efe6]">
      Both own it, neither has played it
    </h3>
    {games.length ? (
      <ul className="mt-3.5 flex flex-wrap gap-2">
        {games.map((g) => (
          <li
            key={g.appId}
            className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-[rgba(230,194,122,0.18)] bg-[rgba(230,194,122,0.08)] py-1 pr-3.5 pl-1 text-[13px] font-normal transition-transform duration-500 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            {g.headerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.headerImage}
                alt=""
                className="h-6 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="w-2" aria-hidden="true" />
            )}
            {g.name}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-[var(--muted)]">
        No unplayed games in common.
      </p>
    )}
  </div>
);
