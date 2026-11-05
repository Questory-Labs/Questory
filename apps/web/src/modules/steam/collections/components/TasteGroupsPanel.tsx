import type { TasteClusterPreview } from "@questorylabs/shared";

export const TasteGroupsPanel = ({
  preview,
  saving,
  failed,
  onSave,
}: {
  preview: TasteClusterPreview;
  saving: string | null;
  failed: boolean;
  onSave: (clusterId: string) => void;
}) => (
  <section
    aria-labelledby="taste-groups"
    className="panel q-in relative overflow-hidden border-[rgba(230,194,122,0.16)] bg-[linear-gradient(170deg,rgba(230,194,122,0.08),rgba(255,255,255,0.012)_60%)] px-6 py-[22px]"
    style={{ ["--i" as string]: 0 }}
  >
    <span
      aria-hidden="true"
      className="dot-matrix q-twinkle absolute right-0 top-0 hidden h-24 w-70 opacity-40 mask-[radial-gradient(ellipse_at_top_right,black,transparent_70%)] sm:block"
    />
    <p className="label-mono relative flex items-center gap-2 text-[#e6c27a]">
      <span aria-hidden="true" className="q-live h-[5px] w-[5px] rounded-full bg-[#e6c27a]" />
      Taste groups · QEngine
    </p>
    <h2 id="taste-groups" className="font-serif relative mt-2 text-[28px] italic leading-tight text-[#f3efe6]">
      Suggested lists from how you play
    </h2>
    {!preview.available ? (
      <p className="relative mt-3 text-[13px] text-[var(--muted)]">
        Taste grouping is warming up. Try again later.
      </p>
    ) : preview.clusters.length === 0 ? (
      <p className="relative mt-3 text-[13px] text-[var(--muted)]">
        No taste groups with enough games yet.
      </p>
    ) : (
      <ul className="relative mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-2.5">
        {preview.clusters.map((c, i) => (
          <li
            key={c.id}
            className="q-in flex items-center justify-between gap-3 rounded-2xl border border-[rgba(230,194,122,0.14)] bg-black/30 py-3 pl-4 pr-3"
            style={{ ["--i" as string]: i }}
          >
            <span className="min-w-0">
              <span className="block break-words text-sm leading-snug text-[#f3efe6]">{c.name}</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                <span className="text-[#f0d9a6]">{c.gameCount}</span>{" "}
                {c.gameCount === 1 ? "game" : "games"}
              </span>
            </span>
            <button
              type="button"
              aria-pressed={c.saved}
              aria-label={c.saved ? `${c.name} saved` : `Save ${c.name}`}
              disabled={c.saved || saving != null}
              onClick={() => onSave(c.id)}
              className={`min-h-[34px] shrink-0 rounded-full border px-3.5 text-[13px] font-medium ${
                c.saved
                  ? "border-transparent bg-white/10 text-[var(--muted)]"
                  : "border-[rgba(230,194,122,0.35)] bg-[rgba(230,194,122,0.08)] text-[#f0d9a6] hover:bg-[rgba(230,194,122,0.16)] disabled:opacity-60"
              }`}
            >
              {c.saved ? "Saved" : saving === c.id ? "Saving…" : "Save"}
            </button>
          </li>
        ))}
      </ul>
    )}
    {failed ? (
      <p className="relative mt-3 text-[13px] text-[var(--danger)]">Could not save that group.</p>
    ) : null}
  </section>
);
