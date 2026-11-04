"use client";

import { FAMILY_MEMBER_LIMIT } from "@questorylabs/shared";
import type { CSSProperties } from "react";
import { Button } from "@questorylabs/ui";

export const FamilyHeader = ({
  memberCount,
  steamId,
  setSteamId,
  addBusy,
  onAdd,
  onOpenImport,
  familyAtCapacity,
  remainingSlots,
  addError,
}: {
  memberCount: number;
  steamId: string;
  setSteamId: (value: string) => void;
  addBusy: boolean;
  onAdd: () => void;
  onOpenImport: () => void;
  familyAtCapacity: boolean;
  remainingSlots: number;
  addError: string | null;
}) => (
  <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pt-2 pb-1">
    <div>
      <p className="label-mono flex items-center gap-2.5 text-[11px]">
        Steam Family · {memberCount} of {FAMILY_MEMBER_LIMIT} seats
        <span aria-hidden="true" className="inline-flex gap-1">
          {Array.from({ length: FAMILY_MEMBER_LIMIT }, (_, i) => (
            <span
              key={i}
              className={`q-pop h-[7px] w-[7px] rounded-full ${
                i < memberCount
                  ? "bg-[var(--ink)] shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  : "bg-white/[0.14]"
              }`}
              style={{ "--i": i } as CSSProperties}
            />
          ))}
        </span>
      </p>
      <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] leading-none">
        One family, <span className="font-serif text-[#a1a1a6]">one shelf</span>
      </h1>
      <p className="mt-2.5 text-[var(--muted)]">
        One shared library across your Steam Family.
      </p>
    </div>
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!familyAtCapacity && steamId.trim()) onAdd();
          }}
        >
          <label className="flex min-h-11 items-center rounded-full border border-white/[0.08] bg-black/25 px-4">
            <span className="sr-only">SteamID64</span>
            <input
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="SteamID64"
              inputMode="numeric"
              className="w-[180px] max-w-full border-0 bg-transparent font-mono text-[13px] text-[var(--ink)] outline-none"
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={addBusy || familyAtCapacity || !steamId.trim()}
            className="min-h-11"
          >
            {addBusy ? "Adding…" : "Add member"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={onOpenImport}
          disabled={familyAtCapacity}
          className="min-h-11"
        >
          Import from friends
        </Button>
      </div>
      <p className="text-xs text-[var(--faint)]">
        {familyAtCapacity
          ? `Family is full (${FAMILY_MEMBER_LIMIT} people, including you). Remove someone to add another.`
          : `${FAMILY_MEMBER_LIMIT} people max, including you. ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`}
      </p>
      {addError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {addError}
        </p>
      ) : null}
    </div>
  </header>
);
