"use client";

import { useState } from "react";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type { FamilyInsights, FamilyMemberSummary } from "@questorylabs/shared";
import { Button, Dialog } from "@questorylabs/ui";
import { api } from "@/lib/api";
import {
  canRemoveFamilyMember,
  libraryMix,
  memberLabel,
  parseApiError,
} from "../steam.family.utils";
import { FamilyMemberAvatar } from "./FamilyMemberAvatar";

const num = "px-3 py-3 text-right text-[var(--muted)] tabular-nums";

export const FamilyMembersTable = ({
  members,
  suggestedPurchaser,
  money,
}: {
  members: FamilyMemberSummary[];
  suggestedPurchaser?: FamilyInsights["suggestedPurchaser"];
  money: (n: number | null | undefined) => string;
}) => {
  const store = useStore();
  const [pending, setPending] = useState<FamilyMemberSummary | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const maxLibrary = Math.max(1, ...members.map((m) => m.librarySize));

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
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="label-mono text-left">
            <th scope="col" className="px-3 py-2.5 font-normal">Member</th>
            <th scope="col" className="w-[22%] px-3 py-2.5 font-normal">Library mix</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Games</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Hours</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Shared</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Unique</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Unplayed</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Wishlist gaps</th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">Value</th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, index) => {
            const removable = canRemoveFamilyMember(m);
            const mix = libraryMix(m, maxLibrary);
            const suggested = suggestedPurchaser?.steamId === m.steamId;
            return (
              <tr
                key={m.steamId}
                className="border-t border-white/[0.05] transition-colors duration-300 hover:bg-white/[0.035]"
              >
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2.5">
                    <FamilyMemberAvatar
                      name={m.personaName}
                      avatarUrl={m.avatarUrl}
                      index={index}
                    />
                    <span className="truncate">{memberLabel(m)}</span>
                    {suggested ? (
                      <span
                        className="pill shrink-0 text-[10px] text-[var(--accent)]"
                        title={suggestedPurchaser?.reason}
                      >
                        Suggested buyer
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex h-1 overflow-hidden rounded-sm bg-white/[0.06]">
                    <div className="q-bar bg-[var(--ink)]" style={{ width: `${mix.shared}%` }} />
                    <div className="q-bar bg-[var(--accent)]" style={{ width: `${mix.unique}%` }} />
                    <div className="q-bar bg-white/[0.18]" style={{ width: `${mix.other}%` }} />
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-[17px] font-light tabular-nums">
                  {m.librarySize}
                </td>
                <td className={num}>
                  {m.playtimeHours != null ? `${m.playtimeHours.toLocaleString()}h` : "—"}
                </td>
                <td className={num}>{m.sharedCount ?? "—"}</td>
                <td className={num}>{m.uniqueCount ?? "—"}</td>
                <td className={num}>{m.unusedCount ?? "—"}</td>
                <td className={num}>{m.wishlistGaps ?? "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {m.trackedSpend != null ? money(m.trackedSpend) : "—"}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {removable ? (
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      className="min-h-9 px-3"
                      onClick={() => {
                        setRemoveError(null);
                        setPending(m);
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <span className="px-3 text-[var(--faint)]" aria-hidden="true">
                      —
                    </span>
                  )}
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
