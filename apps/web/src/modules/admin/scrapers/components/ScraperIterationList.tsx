"use client";

import type { ScraperIterationRecord } from "@questorylabs/shared";
import { TONE_TEXT, type AdminTone } from "../../shared/admin.tone";
import { AdminStatusDot } from "../../shared/components/AdminStatusPill";

const formatWhen = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
};

const formatDay = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const statusLabel = (status: ScraperIterationRecord["status"]) => {
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
};

type Stage = "open" | "live" | "retired";

const STAGE: Record<Stage, { tone: AdminTone; live: boolean }> = {
  open: { tone: "warn", live: false },
  live: { tone: "ok", live: true },
  retired: { tone: "muted", live: false },
};

const rowMeta = (iteration: ScraperIterationRecord, stage: Stage) => {
  if (stage === "open") return statusLabel(iteration.status).toLowerCase();
  const day = formatDay(iteration.publishedAt ?? iteration.updatedAt);
  if (stage === "live") return day ? `published ${day}` : "published";
  return day ?? "retired";
};

const badge = (iteration: ScraperIterationRecord, stage: Stage) => {
  if (stage === "live") return "Live";
  if (stage === "retired") return "Retired";
  return statusLabel(iteration.status);
};

type TimelineRowProps = {
  iteration: ScraperIterationRecord;
  stage: Stage;
  selected: boolean;
  index: number;
  onSelect: () => void;
};

const TimelineRow = ({
  iteration,
  stage,
  selected,
  index,
  onSelect,
}: TimelineRowProps) => {
  const { tone, live } = STAGE[stage];
  return (
    <li className="q-in relative" style={{ "--i": index } as React.CSSProperties}>
      <button
        type="button"
        aria-pressed={selected}
        title={`Updated ${formatWhen(iteration.updatedAt)}`}
        onClick={onSelect}
        className={`q-row flex min-h-10 w-full items-center gap-3.5 rounded-2xl px-2 text-left ${
          selected ? "bg-white/[0.06]" : ""
        }`}
      >
        <AdminStatusDot tone={tone} live={live} />
        <span
          className={`flex-1 ${
            stage === "retired" ? "text-[var(--muted)]" : "text-[var(--ink)]"
          }`}
        >
          v{iteration.version}
          {iteration.label ? ` · ${iteration.label}` : ""} ·{" "}
          {rowMeta(iteration, stage)}
        </span>
        <span className={`text-[13px] ${TONE_TEXT[tone]}`}>
          {badge(iteration, stage)}
        </span>
      </button>
    </li>
  );
};

type Props = {
  open?: ScraperIterationRecord | null;
  current: ScraperIterationRecord | null;
  previous: ScraperIterationRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export const ScraperIterationList = ({
  open = null,
  current,
  previous,
  selectedId,
  onSelect,
}: Props) => {
  const rows: { iteration: ScraperIterationRecord; stage: Stage }[] = [
    ...(open && open.id !== current?.id
      ? [{ iteration: open, stage: "open" as const }]
      : []),
    ...(current ? [{ iteration: current, stage: "live" as const }] : []),
    ...previous.map((iteration) => ({ iteration, stage: "retired" as const })),
  ];

  if (!rows.length) {
    return (
      <p className="text-sm text-[var(--muted)]">No published iteration yet.</p>
    );
  }

  return (
    <ol
      aria-label="Iterations"
      className="relative list-none before:absolute before:bottom-3.5 before:left-[11px] before:top-3.5 before:w-px before:bg-white/10 before:content-['']"
    >
      {rows.map(({ iteration, stage }, index) => (
        <TimelineRow
          key={iteration.id}
          iteration={iteration}
          stage={stage}
          index={index}
          selected={iteration.id === selectedId}
          onSelect={() => onSelect(iteration.id)}
        />
      ))}
    </ol>
  );
};

export { formatWhen, statusLabel };
