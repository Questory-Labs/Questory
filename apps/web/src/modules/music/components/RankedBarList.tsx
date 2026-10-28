import Link from "next/link";
import type { ReactNode } from "react";
import { Panel } from "@/components/ui";

export type RankedBarItem = {
  key: string;
  href?: string | null;
  label: string;
  sub?: string | null;
  count: number;
};

export const RankedBarList = ({
  title,
  titleId,
  items,
  empty,
  footer,
}: {
  title: string;
  titleId: string;
  items: RankedBarItem[];
  empty: string;
  footer?: ReactNode;
}) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Panel wrapperClassName="h-full" className="q-lift h-full px-3 pb-2.5 pt-[18px]">
      <section aria-labelledby={titleId}>
        <h2 id={titleId} className="mx-2 mb-2 text-[17px] font-normal">
          {title}
        </h2>
        {items.length > 0 ? (
          <ol className="m-0 list-none p-0">
            {items.map((item, i) => {
              const body = (
                <>
                  <span className="font-mono text-[10px] text-[var(--dim)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="font-normal">{item.label}</span>
                    {item.sub ? (
                      <span className="text-[var(--muted)]">
                        {" · "}
                        <span className="font-serif text-base">{item.sub}</span>
                      </span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className="h-0.5 bg-white/[0.07]">
                    <span
                      className={`q-bar block h-0.5 ${i === 0 ? "bg-[var(--music)]" : "bg-[#bdbdc2]"}`}
                      style={{ width: `${(item.count / max) * 100}%` }}
                    />
                  </span>
                  <span className="text-right text-xl font-extralight">
                    {item.count.toLocaleString()}
                  </span>
                </>
              );
              const rowClass =
                "q-row grid min-h-12 grid-cols-[26px_minmax(0,1fr)_minmax(60px,140px)_52px] items-center gap-3 rounded-[14px] px-2";
              return (
                <li key={item.key}>
                  {item.href ? (
                    <Link href={item.href} className={rowClass}>
                      {body}
                    </Link>
                  ) : (
                    <div className={rowClass}>{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mx-2 py-2 text-sm text-[var(--muted)]">{empty}</p>
        )}
        {footer ? <div className="mx-2 mt-2">{footer}</div> : null}
      </section>
    </Panel>
  );
};
