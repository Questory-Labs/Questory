"use client";

import { StoreBadge } from "@/components/StoreBadge";
import { formatMoney } from "@/lib/money";
import type { WishlistItem } from "@questorylabs/shared";
import { CoverArt } from "../../library/components/CoverArt";
import {
  WISHLIST_REASON_LIMIT,
  WISHLIST_STORE_LABELS,
} from "../steam.wishlist.constants";
import type { WishlistViewProps } from "../steam.wishlist.types";

const th = "px-3.5 py-3 font-normal";
const td = "px-3.5 py-2.5";
const pill =
  "min-h-9 rounded-full border border-white/[0.12] bg-white/[0.03] px-3.5 text-[13px] text-[var(--ink)] transition-colors hover:border-white/25";

const scoreTone = (score: number) =>
  score >= 75 ? "bg-[var(--ok)]" : score >= 50 ? "bg-[var(--ink)]" : "bg-[var(--faint)]";

export const WishlistTable = ({
  items,
  currency,
  update,
  editing,
  target,
  setTarget,
  startEdit,
  stopEdit,
}: {
  items: WishlistItem[];
  currency: string;
} & Pick<
  WishlistViewProps,
  "update" | "editing" | "target" | "setTarget" | "startEdit" | "stopEdit"
>) => (
  <section aria-labelledby="wishlist-all" className="panel q-in px-2 pb-2 pt-[18px]" style={{ ["--i" as string]: 5 }}>
    <div className="flex flex-wrap items-baseline justify-between gap-3 px-3">
      <h2 id="wishlist-all" className="text-[26px] font-light tracking-[-0.02em]">
        Should you <em className="font-serif text-[var(--muted)]">buy it?</em>
      </h2>
      <span className="label-mono text-[var(--faint)]">Sorted by should-buy score</span>
    </div>
    <div className="mt-2.5 overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead>
          <tr className="label-mono text-[var(--faint)]">
            <th scope="col" className={th}>Game</th>
            <th scope="col" className={`${th} w-[180px]`}>Score</th>
            <th scope="col" className={th}>Why</th>
            <th scope="col" className={`${th} text-right`}>Current</th>
            <th scope="col" className={`${th} text-right`}>Lowest</th>
            <th scope="col" className={`${th} text-right`}>Best price</th>
            <th scope="col" className={`${th} text-right`}>Target</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const editKey = `${item.store}:${item.externalId}`;
            const score = item.shouldBuyScore;
            const cut = item.discountPercent != null && item.discountPercent > 0 ? item.discountPercent : null;
            const why = (item.reasons || []).slice(0, WISHLIST_REASON_LIMIT).join(" · ");
            return (
              <tr key={item.id} className="q-row border-t border-white/[0.05]">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <span className="h-[26px] w-[52px] flex-none overflow-hidden rounded-lg border border-white/[0.08]">
                      <CoverArt src={item.headerImage} seed={item.name} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-normal">{item.name}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--faint)]">
                        <StoreBadge store={item.store} compact />
                      </span>
                    </span>
                  </div>
                </td>
                <td className={td}>
                  {score != null ? (
                    <span className="flex items-center gap-3">
                      <span className="w-7 text-[22px] font-extralight tracking-[-0.02em]">{score}</span>
                      <span aria-hidden="true" className="h-[3px] flex-1 rounded-sm bg-white/[0.06]">
                        <span
                          className={`q-bar block h-[3px] rounded-sm ${scoreTone(score)}`}
                          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                        />
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--faint)]">—</span>
                  )}
                </td>
                <td className={`${td} text-[var(--muted)]`}>{why || "—"}</td>
                <td className={`${td} text-right font-normal`}>
                  {formatMoney(item.currentPrice, currency)}
                  {cut != null ? (
                    <span className="ml-1.5 text-xs text-[var(--ok)]">−{cut}%</span>
                  ) : null}
                  {cut != null && item.regularPrice != null ? (
                    <span className="block text-[11px] text-[var(--faint)] line-through">
                      {formatMoney(item.regularPrice, currency)}
                    </span>
                  ) : null}
                </td>
                <td className={`${td} text-right text-[var(--muted)]`}>
                  {formatMoney(item.lowestPrice, currency)}
                </td>
                <td className={`${td} text-right`}>
                  {item.bestPrice != null ? (
                    <>
                      {formatMoney(item.bestPrice, currency)}
                      {item.bestStore ? (
                        <span className="block font-mono text-[10px] text-[var(--faint)]">
                          {WISHLIST_STORE_LABELS[item.bestStore]}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${td} text-right`}>
                  {editing === editKey ? (
                    <form
                      className="flex justify-end gap-2"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        update.submit({
                          store: item.store,
                          externalId: item.externalId,
                          targetPrice: target ? Number(target) : null,
                        });
                        stopEdit();
                      }}
                    >
                      <input
                        value={target}
                        onChange={(ev) => setTarget(ev.target.value)}
                        inputMode="decimal"
                        aria-label={`Price target for ${item.name}`}
                        className="w-20 rounded-full border border-white/[0.12] bg-black/25 px-3 py-1 text-right"
                      />
                      <button type="submit" className={pill}>
                        Save
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className={pill}
                      aria-label={`Edit price target for ${item.name}`}
                      onClick={() =>
                        startEdit(
                          editKey,
                          item.targetPrice != null ? String(item.targetPrice) : "",
                        )
                      }
                    >
                      {item.targetPrice != null
                        ? formatMoney(item.targetPrice, currency)
                        : "Set target"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);
