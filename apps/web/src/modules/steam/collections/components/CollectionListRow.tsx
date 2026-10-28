import Link from "next/link";
import type { Collection } from "@questorylabs/shared";
import { formatDate } from "@/lib/dates";
import { COLLECTION_KIND_LABELS } from "../steam.collections.constants";

export const CollectionListRow = ({ collection }: { collection: Collection }) => {
  const color = collection.color || "var(--faint)";
  const meta = [
    COLLECTION_KIND_LABELS.custom,
    collection.description,
    collection.updatedAt ? `updated ${formatDate(collection.updatedAt)}` : null,
  ].filter(Boolean);
  return (
    <li className="q-row flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl px-3.5 py-2">
      <span
        aria-hidden="true"
        className="h-[7px] w-[7px] rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      <span className="min-w-0 flex-[1_1_200px]">
        <span className="block font-normal">{collection.name}</span>
        <span className="block font-mono text-[10px] text-[var(--faint)]">{meta.join(" · ")}</span>
      </span>
      <span className="text-[22px] font-extralight">
        {collection.gameCount}
        <span className="text-xs text-[var(--faint)]"> games</span>
      </span>
      <Link
        href={`/collections/${collection.id}`}
        aria-label={`Open ${collection.name}`}
        className="inline-flex min-h-9 items-center rounded-full border border-white/10 px-3.5 text-[13px] hover:border-white/25"
      >
        Open
      </Link>
    </li>
  );
};
