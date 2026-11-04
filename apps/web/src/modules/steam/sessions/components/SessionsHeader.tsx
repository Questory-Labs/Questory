"use client";

import { SegmentedControl } from "@/components/SegmentedControl";
import {
  SESSIONS_RANGE_OPTIONS,
  type SessionsRange,
} from "../steam.sessions.constants";

export const SessionsHeader = ({
  count,
  daypart,
  range,
  onRangeChange,
}: {
  count: number | null;
  daypart: string | null;
  range: SessionsRange;
  onRangeChange: (range: SessionsRange) => void;
}) => (
  <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1 pt-2">
    <div className="min-w-0">
      <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">
        <span aria-hidden="true" className="q-live size-[5px] rounded-full bg-[var(--ok)]" />
        qMonitor · every session on your machines
      </p>
      <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
        {count != null ? (
          <>
            {count.toLocaleString()} session{count === 1 ? "" : "s"}
            {daypart ? (
              <>
                , <em className="font-serif text-[#a1a1a6]">{daypart}</em>
              </>
            ) : null}
          </>
        ) : (
          "Sessions"
        )}
      </h1>
    </div>
    <SegmentedControl
      label="Range"
      value={range}
      onChange={onRangeChange}
      options={SESSIONS_RANGE_OPTIONS}
    />
  </header>
);
