import type { GameDetail } from "@questorylabs/shared";
import {
  deckLabel,
  formatReleaseDate,
} from "@/components/game-detail/game-detail-shared";

const PLATFORM_LABELS: Record<string, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
};

export const catalogFacts = (d: GameDetail) =>
  [
    { k: "Developer", v: d.developers.join(", ") },
    { k: "Publisher", v: d.publishers.join(", ") },
    { k: "Released", v: formatReleaseDate(d.releaseDate) },
    {
      k: "Platforms",
      v: (d.platforms || []).map((p) => PLATFORM_LABELS[p] || p).join(" · "),
    },
    { k: "Metacritic", v: d.metacriticScore != null ? String(d.metacriticScore) : null },
    { k: "Steam Deck", v: deckLabel(d.deckStatus) },
    { k: "Genres", v: d.genres.join(", ") },
    { k: "Steam app", v: String(d.appId) },
  ].filter((f): f is { k: string; v: string } => Boolean(f.v));

export const LibraryGameCatalog = ({ detail }: { detail: GameDetail }) => {
  const facts = catalogFacts(detail);
  if (!facts.length) return null;
  return (
    <section aria-label="Catalog" className="panel q-in p-[22px]">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px]">
        {facts.map((f) => (
          <div key={f.k}>
            <dt className="label-mono text-[var(--faint)]">{f.k}</dt>
            <dd className="mt-1 font-normal">{f.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
