"use client";

import { StoreBadge } from "@/components/StoreBadge";
import { formatMoney } from "@/lib/money";
import type { WishlistItem } from "@questorylabs/shared";
import { Button, Panel } from "@questorylabs/ui";
import type { WishlistViewProps } from "../steam.wishlist.types";

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
  <Panel wrapperClassName="mt-10" className="overflow-x-auto">
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="bg-[var(--bg-2)] text-[var(--muted)]">
        <tr>
          <th className="px-4 py-3 font-medium">Game</th>
          <th className="px-4 py-3 font-medium">Store</th>
          <th className="px-4 py-3 font-medium">Current</th>
          <th className="px-4 py-3 font-medium">Lowest</th>
          <th className="px-4 py-3 font-medium">Target</th>
          <th className="px-4 py-3 font-medium">Score</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const editKey = `${item.store}:${item.externalId}`;
          return (
            <tr key={item.id} className="border-t border-[var(--line)]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.headerImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.headerImage}
                      alt=""
                      className="h-10 w-[84px] rounded object-cover"
                    />
                  )}
                  <span>{item.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StoreBadge store={item.store} compact />
              </td>
              <td className="px-4 py-3">
                {item.currentPrice != null
                  ? formatMoney(item.currentPrice, currency)
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {item.lowestPrice != null
                  ? formatMoney(item.lowestPrice, currency)
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {editing === editKey ? (
                  <form
                    className="flex gap-2"
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
                      className="w-20 rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1"
                    />
                    <Button type="submit" variant="ghost">
                      Save
                    </Button>
                  </form>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      startEdit(
                        editKey,
                        item.targetPrice != null
                          ? String(item.targetPrice)
                          : "",
                      );
                    }}
                  >
                    {item.targetPrice != null
                      ? formatMoney(item.targetPrice, currency)
                      : "Set"}
                  </Button>
                )}
              </td>
              <td className="px-4 py-3 text-[var(--warm)]">
                {item.shouldBuyScore ?? "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </Panel>
);
