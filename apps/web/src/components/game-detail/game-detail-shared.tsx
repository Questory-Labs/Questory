import Link from "next/link";
import type { ReactNode } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { formatMoney } from "@/lib/money";

export const formatPlayers = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: n >= 10000 ? 1 : 0,
  }).format(n);
};

export const formatReleaseDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const deckLabel = (status: string | null | undefined) => {
  if (!status) return null;
  if (status === "verified") return "Deck Verified";
  if (status === "playable") return "Deck Playable";
  if (status === "unsupported") return "Deck Unsupported";
  return status;
};

export const HistoryChart = ({
  history,
  valueKey,
  label,
  size = "sm",
  formatValue,
  valueLabel = "",
}: {
  history: { date: string; [k: string]: string | number }[];
  valueKey: string;
  label: string;
  size?: "sm" | "lg";
  formatValue?: (n: number) => string;
  valueLabel?: string;
}) => {
  const data = history.map((h) => ({
    label: String(h.date),
    value: Number(h[valueKey]),
  }));

  return (
    <div
      className={
        size === "lg" ? "panel-outline bg-[var(--bg-0)] px-3 py-3" : undefined
      }
    >
      <LineChart
        data={data}
        ariaLabel={label}
        size={size === "lg" ? "lg" : "sm"}
        xMode="time"
        valueLabel={valueLabel}
        formatValue={formatValue}
      />
    </div>
  );
};

export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
    {children}
  </span>
);

export const OwnerRow = ({
  personaName,
  avatarUrl,
  playtimeHours,
  isMe,
  href,
}: {
  personaName: string;
  avatarUrl: string | null;
  playtimeHours: number;
  isMe?: boolean;
  href?: string;
}) => {
  const label = (
    <>
      {personaName}
      {isMe ? (
        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
          (me)
        </span>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <span className="h-7 w-7 rounded-full bg-[var(--bg-2)]" />
      )}
      {href ? (
        <Link
          href={href}
          className="min-w-0 flex-1 truncate hover:text-[var(--accent)]"
        >
          {label}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      <span className="font-mono text-xs text-[var(--muted)]">
        {playtimeHours}h
      </span>
    </div>
  );
};

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2 font-display text-sm font-bold">{children}</h3>
);

export { formatMoney };
