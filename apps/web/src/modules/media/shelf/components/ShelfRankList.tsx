import Link from "next/link";
import type { ReactNode } from "react";

export type ShelfRankItem = { id: string; href: string; name: string; value: ReactNode };

export const ShelfRankList = ({ items }: { items: ShelfRankItem[] }) => (
  <ol className="m-0 list-none p-0">
    {items.map((t, i) => (
      <li key={t.id}>
        <Link href={t.href} className="q-row flex min-h-[46px] items-center gap-3 rounded-[14px] px-2">
          <span className="font-mono text-[10px] text-[var(--dim)]">{String(i + 1).padStart(2, "0")}</span>
          <span className="min-w-0 flex-1 truncate font-normal">{t.name}</span>
          <span className="text-lg font-extralight">{t.value}</span>
        </Link>
      </li>
    ))}
  </ol>
);
