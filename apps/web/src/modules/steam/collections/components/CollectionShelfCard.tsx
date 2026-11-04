import Link from "next/link";
import type { Collection } from "@questorylabs/shared";
import { CoverArt } from "../../library/components/CoverArt";
import {
  COLLECTION_FAN_SIZE,
  COLLECTION_KIND_LABELS,
} from "../steam.collections.constants";
import { collectionKind } from "../steam.collections.utils";

export const CollectionShelfCard = ({
  collection,
  index,
}: {
  collection: Collection;
  index: number;
}) => {
  const covers = (collection.covers || []).slice(0, COLLECTION_FAN_SIZE);
  const slots = Array.from({ length: COLLECTION_FAN_SIZE }, (_, i) => covers[i] ?? null);
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="panel q-lift q-in flex flex-col gap-4 p-[18px]"
      style={{ ["--i" as string]: index }}
    >
      <span aria-hidden="true" className="q-fan grid grid-cols-4 gap-1.5 px-2 pt-1">
        {slots.map((src, i) => (
          <span
            key={i}
            className="aspect-[2/3] overflow-hidden rounded-[10px] border border-white/[0.08]"
          >
            <CoverArt src={src} seed={`${collection.id}-${i}`} />
          </span>
        ))}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="label-mono block text-[var(--faint)]">
            {COLLECTION_KIND_LABELS[collectionKind(collection)]}
          </span>
          <span className="mt-0.5 block text-base font-normal">{collection.name}</span>
          {collection.description ? (
            <span className="block text-xs text-[var(--muted)]">{collection.description}</span>
          ) : null}
        </span>
        <span className="text-[38px] font-extralight leading-[0.9] tracking-[-0.04em]">
          {collection.gameCount}
        </span>
      </span>
    </Link>
  );
};
