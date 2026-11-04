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
    style={{ ["--i" as string]: 9 }}
  >
    <span aria-hidden="true" className="dot-matrix q-twinkle absolute -right-10 -top-10 h-[220px] w-[300px] opacity-40" />
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
      <div className="relative mt-4 flex flex-wrap gap-2">
        {preview.clusters.map((c, i) => (
          <span
            key={c.id}
            className="q-in inline-flex items-center gap-2.5 rounded-full border border-[rgba(230,194,122,0.2)] bg-black/30 py-1.5 pl-4 pr-1.5 text-sm"
            style={{ ["--i" as string]: i }}
          >
            {c.name}
            <span className="text-lg font-extralight text-[#f0d9a6]">{c.gameCount}</span>
            <button
              type="button"
              aria-pressed={c.saved}
              aria-label={c.saved ? `${c.name} saved` : `Save ${c.name}`}
              disabled={c.saved || saving != null}
              onClick={() => onSave(c.id)}
              className={`min-h-[34px] rounded-full px-3.5 text-[13px] font-medium ${
                c.saved
                  ? "bg-white/10 text-[var(--muted)]"
                  : "bg-[#e6c27a] text-[#1a1205] disabled:opacity-60"
              }`}
            >
              {c.saved ? "Saved" : saving === c.id ? "Saving…" : "Save"}
            </button>
          </span>
        ))}
      </div>
    )}
    {failed ? (
      <p className="relative mt-3 text-[13px] text-[var(--danger)]">Could not save that group.</p>
    ) : null}
  </section>
);
