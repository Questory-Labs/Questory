"use client";

import { useState } from "react";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type { FamilyMemberSummary } from "@questorylabs/shared";
import { Button, Dialog } from "@questorylabs/ui";
import { api } from "@/lib/api";
import {
  canRemoveFamilyMember,
  memberLabel,
  parseApiError,
} from "../steam.family.utils";

export const FamilyMembersTable = ({
  members,
  suggestedPurchaserSteamId,
  money,
}: {
  members: FamilyMemberSummary[];
  suggestedPurchaserSteamId?: string | null;
  money: (n: number | null | undefined) => string;
}) => {
  const store = useStore();
  const [pending, setPending] = useState<FamilyMemberSummary | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const remove = useAction({
    run: (steamId: string) =>
      api(`/family/members/${steamId}`, { method: "DELETE" }),
    onSuccess: () => {
      setPending(null);
      setRemoveError(null);
      store.touch(["family-insights"]);
      store.touch(["family-library"]);
    },
    onError: (err: Error) => setRemoveError(parseApiError(err)),
  });

  const closeDialog = () => {
    if (remove.busy) return;
    setPending(null);
    setRemoveError(null);
  };

  return (
    <>
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-3 py-3 font-medium tabular-nums">Games</th>
            <th className="px-3 py-3 font-medium tabular-nums">Shared</th>
            <th className="px-3 py-3 font-medium tabular-nums">Unique</th>
            <th className="px-3 py-3 font-medium tabular-nums">Value</th>
            <th className="px-3 py-3 font-medium tabular-nums">
              Wishlist gaps
            </th>
            <th className="px-3 py-3 font-medium tabular-nums">Unplayed</th>
            <th className="px-3 py-3 font-medium tabular-nums">Hours</th>
            <th className="px-3 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const removable = canRemoveFamilyMember(m);
            return (
              <tr
                key={m.steamId}
                className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg-2)]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <span className="h-7 w-7 rounded-full bg-[var(--bg-2)]" />
                    )}
                    <span className="truncate font-medium">{memberLabel(m)}</span>
                    {suggestedPurchaserSteamId === m.steamId && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                        &bull;
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.librarySize}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.sharedCount ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.uniqueCount ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.trackedSpend != null ? money(m.trackedSpend) : "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.wishlistGaps ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.unusedCount ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.playtimeHours != null ? `${m.playtimeHours}h` : "—"}
                </td>
                <td className="px-3 py-3 text-right">
                  {removable ? (
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setRemoveError(null);
                        setPending(m);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog
        open={pending != null}
        onClose={closeDialog}
        title="Remove family member?"
      >
        <p className="text-sm text-[var(--muted)]">
          Remove {pending ? memberLabel(pending) : "this member"} from the family
          group? Their library will drop out of family insights.
        </p>
        {removeError ? (
          <p className="mt-3 text-sm text-[var(--danger)]">{removeError}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={closeDialog}
            disabled={remove.busy}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.busy || !pending}
            onClick={() => {
              if (pending) remove.submit(pending.steamId);
            }}
          >
            {remove.busy ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
