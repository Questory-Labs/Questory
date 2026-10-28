import { cn } from "@questorylabs/ui";
import type { ReadListStatus } from "@questorylabs/shared";
import { LIBRARY_STATUSES, readStatusColor } from "../read.library.constants";

export const StatusChips = ({
  value,
  counts,
  onChange,
}: {
  value: "" | ReadListStatus;
  counts: { status: string; count: number }[] | undefined;
  onChange: (status: "" | ReadListStatus) => void;
}) => {
  const byStatus = new Map((counts ?? []).map((c) => [c.status, c.count]));
  const all = (counts ?? []).reduce((a, c) => a + c.count, 0);
  return (
    <div role="group" aria-label="Status" className="flex flex-wrap gap-1.5">
      {LIBRARY_STATUSES.map((s) => {
        const on = s.value === value;
        const n = s.value ? byStatus.get(s.value) ?? 0 : all;
        return (
          <button
            key={s.label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(s.value)}
            className={cn(
              "inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
              on
                ? "border-white/[0.16] bg-white/10 text-white"
                : "border-white/[0.06] bg-black/20 text-[var(--dim)] hover:text-[var(--ink)]",
            )}
          >
            <span
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: s.value ? readStatusColor(s.value) : "var(--ink)" }}
            />
            {s.label}
            {counts ? (
              <span className={cn("text-[15px] font-extralight", on ? "text-white" : "text-[var(--faint)]")}>{n}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
