import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@questorylabs/ui";
import { Panel } from "@/components/ui";

export const ShelfSection = ({
  id,
  title,
  aside,
  link,
  className,
  bodyClassName,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  link?: { href: string; label: string };
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) => (
  <Panel wrapperClassName={cn("min-w-0", className)} className={cn("q-lift relative h-full overflow-hidden p-5", bodyClassName)}>
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[17px] font-normal">
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
            {link.label}
          </Link>
        ) : aside ? (
          <div className="text-[13px] text-[var(--muted)]">{aside}</div>
        ) : null}
      </div>
      {children}
    </section>
  </Panel>
);
