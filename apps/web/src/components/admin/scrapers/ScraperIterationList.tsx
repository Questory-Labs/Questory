"use client";

import type { ScraperIterationRecord } from "@questorylabs/shared";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function statusLabel(status: ScraperIterationRecord["status"]) {
  switch (status) {
    case "draft":
      return "Draft";
    case "validated":
      return "Validated";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

type IterationCardProps = {
  iteration: ScraperIterationRecord;
  highlight?: boolean;
  onSelect?: () => void;
};

function IterationCard({ iteration, highlight, onSelect }: IterationCardProps) {
  const content = (
    <>
      <span className="font-medium">
        v{iteration.version}
        {iteration.label ? ` · ${iteration.label}` : ""}
      </span>
      <span className="mt-0.5 block font-mono text-[10px] text-[var(--faint)]">
        {statusLabel(iteration.status)}
        {iteration.publishedAt
          ? ` · published ${formatWhen(iteration.publishedAt)}`
          : iteration.validatedAt
            ? ` · validated ${formatWhen(iteration.validatedAt)}`
            : ` · updated ${formatWhen(iteration.updatedAt)}`}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <div
        className={`rounded border px-3 py-2 text-sm ${
          highlight
            ? "border-[var(--accent)] bg-[var(--accent-dim)]"
            : "border-[var(--line)] bg-[var(--bg-2)]"
        }`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`w-full rounded border px-3 py-2 text-left text-sm ${
        highlight
          ? "border-[var(--accent)] bg-[var(--accent-dim)]"
          : "border-[var(--line)] bg-[var(--bg-2)] hover:bg-[var(--bg-1)]"
      }`}
      onClick={onSelect}
    >
      {content}
    </button>
  );
}

type Props = {
  current: ScraperIterationRecord | null;
  previous: ScraperIterationRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ScraperIterationList({
  current,
  previous,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
          Current iteration
        </p>
        <div className="mt-2">
          {current ? (
            <IterationCard
              iteration={current}
              highlight={current.id === selectedId}
              onSelect={() => onSelect(current.id)}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">No published iteration yet.</p>
          )}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
          Previous iterations
        </p>
        <div className="mt-2 space-y-2">
          {previous.length ? (
            previous.map((iteration) => (
              <IterationCard
                key={iteration.id}
                iteration={iteration}
                highlight={iteration.id === selectedId}
                onSelect={() => onSelect(iteration.id)}
              />
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">No archived versions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export { IterationCard, formatWhen, statusLabel };
