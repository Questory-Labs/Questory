"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

type Panel = "days" | "months" | "years";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEAR_MIN = 1900;

function yearMax(now = new Date()): number {
  return now.getFullYear() + 1;
}

function parseDay(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthCells(cursor: Date): Array<string | null> {
  const first = startOfMonth(cursor);
  const pad = first.getDay();
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(dayKey(new Date(first.getFullYear(), first.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function yearsDescending(now = new Date()): number[] {
  const max = yearMax(now);
  const years: number[] = [];
  for (let year = max; year >= YEAR_MIN; year -= 1) years.push(year);
  return years;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden>
      <rect
        x="2"
        y="3.5"
        width="12"
        height="10.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M2 6.5h12M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-2.5 w-2.5 text-[var(--faint)] ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function cellClass(active: boolean) {
  return `h-8 rounded text-xs ${
    active
      ? "bg-[var(--accent)] text-[var(--bg-0)]"
      : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
  }`;
}

export function DateField({ value, onChange, label }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("days");
  const [cursor, setCursor] = useState(() => startOfMonth(parseDay(value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCursor(startOfMonth(parseDay(value)));
    setPanel("days");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      if (panel !== "days") {
        setPanel("days");
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, panel]);

  useEffect(() => {
    if (panel !== "years") return;
    const selected = yearListRef.current?.querySelector("[data-selected='true']");
    selected?.scrollIntoView({ block: "center" });
  }, [panel, cursor]);

  const display = useMemo(
    () =>
      parseDay(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [value],
  );
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const years = useMemo(() => yearsDescending(), []);
  const today = dayKey(new Date());
  const monthIndex = cursor.getMonth();
  const year = cursor.getFullYear();

  function goMonth(delta: number) {
    setCursor(new Date(year, monthIndex + delta, 1));
    setPanel("days");
  }

  function pickMonth(next: number) {
    setCursor(new Date(year, next, 1));
    setPanel("days");
  }

  function pickYear(next: number) {
    setCursor(new Date(next, monthIndex, 1));
    setPanel("days");
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      {label ? (
        <span className="text-xs text-[var(--muted)]">{label}</span>
      ) : null}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ?? "Date"}
        onClick={() => setOpen((current) => !current)}
        className={`mt-1.5 flex h-9 w-full items-center justify-between gap-2 rounded border bg-[var(--bg-2)] px-2.5 text-left text-sm text-[var(--ink)] outline-none ${
          open
            ? "border-[var(--line-strong)]"
            : "border-[var(--line)] hover:border-[var(--line-strong)]"
        }`}
      >
        <span className="truncate">{display}</span>
        <CalendarIcon />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute right-0 z-20 mt-1 w-[16.5rem] rounded border border-[var(--line)] bg-[var(--bg-1)] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goMonth(-1)}
              className="rounded px-1.5 py-0.5 text-[var(--muted)] hover:text-[var(--ink)]"
            >
              ‹
            </button>
            <div className="flex min-w-0 flex-1 justify-center gap-1">
              <button
                type="button"
                aria-label="Choose month"
                aria-expanded={panel === "months"}
                onClick={() => setPanel((current) => (current === "months" ? "days" : "months"))}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                  panel === "months"
                    ? "bg-[var(--bg-2)] text-[var(--ink)]"
                    : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                }`}
              >
                {MONTHS[monthIndex]}
                <Chevron open={panel === "months"} />
              </button>
              <button
                type="button"
                aria-label="Choose year"
                aria-expanded={panel === "years"}
                onClick={() => setPanel((current) => (current === "years" ? "days" : "years"))}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs tabular-nums ${
                  panel === "years"
                    ? "bg-[var(--bg-2)] text-[var(--ink)]"
                    : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                }`}
              >
                {year}
                <Chevron open={panel === "years"} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goMonth(1)}
              className="rounded px-1.5 py-0.5 text-[var(--muted)] hover:text-[var(--ink)]"
            >
              ›
            </button>
          </div>
          {panel === "months" ? (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  aria-label={MONTH_NAMES[index]}
                  onClick={() => pickMonth(index)}
                  className={cellClass(index === monthIndex)}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
          {panel === "years" ? (
            <div ref={yearListRef} className="grid max-h-[13.5rem] grid-cols-3 gap-1 overflow-y-auto pr-0.5">
              {years.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={`Year ${item}`}
                  data-selected={item === year ? "true" : undefined}
                  onClick={() => pickYear(item)}
                  className={`${cellClass(item === year)} tabular-nums`}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          {panel === "days" ? (
            <div className="grid grid-cols-7 gap-px text-center">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]"
                >
                  {day}
                </span>
              ))}
              {cells.map((key, index) =>
                key ? (
                  <button
                    key={key}
                    type="button"
                    aria-label={key}
                    aria-current={key === today ? "date" : undefined}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={`h-7 rounded text-xs ${
                      key === value
                        ? "bg-[var(--accent)] text-[var(--bg-0)]"
                        : key === today
                          ? "text-[var(--ink)] ring-1 ring-inset ring-[var(--line-strong)]"
                          : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                    }`}
                  >
                    {parseDay(key).getDate()}
                  </button>
                ) : (
                  <span key={`empty-${index}`} className="h-7" />
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
