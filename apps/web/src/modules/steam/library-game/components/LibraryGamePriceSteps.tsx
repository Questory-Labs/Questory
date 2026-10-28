import type { GameDetail } from "@questorylabs/shared";
import { formatMoney } from "@/lib/money";
import { priceSteps } from "../steam.library-game.charts";
import {
  PRICE_CHART_HEIGHT,
  PRICE_CHART_WIDTH,
} from "../steam.library-game.constants";
import { priceStory } from "../steam.library-game.utils";

export const LibraryGamePriceSteps = ({
  price,
  pricePaid,
}: {
  price: GameDetail["price"];
  pricePaid: number | null | undefined;
}) => {
  const c = price.currency;
  const steps = priceSteps(price.history);
  const story = priceStory(price.current, price.historicalLow, price.historicalHigh, c);
  return (
    <section aria-labelledby="game-price" className="panel q-in p-[22px]">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 id="game-price" className="text-[17px] font-normal">
            Price history
          </h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Lowest <span className="text-[var(--ink)]">{formatMoney(price.historicalLow ?? price.lowest, c)}</span>
            {pricePaid != null ? (
              <>
                {" "}· you paid <span className="text-[var(--ink)]">{formatMoney(pricePaid, c)}</span>
              </>
            ) : null}
            {" "}· high <span className="text-[var(--ink)]">{formatMoney(price.historicalHigh, c)}</span>
            {story ? <> · <span className="text-[var(--ok)]">{story.hint}</span></> : null}
          </p>
        </div>
        <p className="text-[44px] font-extralight tracking-[-0.04em]">{formatMoney(price.current, c)}</p>
      </div>
      {steps ? (
        <svg
          viewBox={`0 0 ${PRICE_CHART_WIDTH} ${PRICE_CHART_HEIGHT}`}
          role="img"
          aria-label={`Price steps between ${formatMoney(steps.max, c)} and ${formatMoney(steps.min, c)}`}
          className="mt-4 h-auto w-full"
        >
          <line x1="0" y1={steps.lowY} x2={PRICE_CHART_WIDTH} y2={steps.lowY} stroke="var(--ink)" strokeOpacity="0.3" strokeDasharray="8 6" />
          <path className="q-draw" pathLength={1} d={steps.path} fill="none" stroke="#bdbdc2" strokeWidth="1.2" />
          <circle cx={steps.low.x} cy={steps.low.y} r="4" fill="#ffffff" />
        </svg>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--faint)]">Not enough price history yet.</p>
      )}
    </section>
  );
};
