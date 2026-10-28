"use client";

import Link from "next/link";
import type { SearchResult } from "@questorylabs/shared";
import { normalizeSearchResult } from "./normalize-search-result";
import { groupSearchItems, searchResultItems, type SearchItem } from "./search-items";
import { SEARCH_ROW_CLASS, SearchRowBody } from "./SearchRowBody";

export { isSearchEmpty, searchResultItems } from "./search-items";

type SearchResultsProps = {
  data: SearchResult | undefined;
  showMusic?: boolean;
  showWatch?: boolean;
  showRead?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
};

const Section = ({
  title,
  compact,
  children,
}: {
  title: string;
  compact?: boolean;
  children: React.ReactNode;
}) => (
  <section className={compact ? "py-1" : "py-1.5"}>
    <h2 className="label-mono px-3 pb-1 pt-2">{title}</h2>
    <div>{children}</div>
  </section>
);

const NameList = ({ title, names, compact }: { title: string; names: string[]; compact?: boolean }) =>
  names.length ? (
    <Section title={title} compact={compact}>
      <ul className="flex flex-wrap gap-1.5 px-3 py-1.5">
        {names.map((name) => (
          <li key={name} className="pill text-ink">
            {name}
          </li>
        ))}
      </ul>
    </Section>
  ) : null;

const visibleFor = (item: SearchItem, flags: { music: boolean; watch: boolean; read: boolean }) =>
  (item.domain !== "music" || flags.music) &&
  (item.domain !== "watch" || flags.watch) &&
  (item.domain !== "read" || flags.read);

export function SearchResults({
  data,
  showMusic = true,
  showWatch = true,
  showRead = true,
  compact = false,
  onNavigate,
}: SearchResultsProps) {
  const normalized = normalizeSearchResult(data);
  if (!normalized) return null;

  const items = searchResultItems(normalized).filter((item) =>
    visibleFor(item, { music: showMusic, watch: showWatch, read: showRead }),
  );
  const groups = groupSearchItems(items);
  if (!groups.length && !normalized.developers.length && !normalized.publishers.length) return null;

  return (
    <div className={compact ? "" : "panel p-2.5"}>
      {groups.map(([group, groupItems]) => (
        <Section key={group} title={group} compact={compact}>
          {groupItems.map((item, i) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={`${SEARCH_ROW_CLASS} q-in`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <SearchRowBody item={item} />
            </Link>
          ))}
        </Section>
      ))}
      <NameList title="Developers" names={normalized.developers} compact={compact} />
      <NameList title="Publishers" names={normalized.publishers} compact={compact} />
    </div>
  );
}
