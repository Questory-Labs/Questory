import {
  MusicSourceCard,
  MusicStatusPill,
} from "./MusicSourceCard";

export const FilenameHintsCard = () => (
  <MusicSourceCard
    label="Formats"
    title="Filename hints"
    blurb="Same conventions as Koito: include these substrings so auto-detect is reliable."
    status={<MusicStatusPill tone="idle">Reference</MusicStatusPill>}
  >
    <ul className="space-y-1.5 font-mono text-[11px] text-[var(--muted)]">
      <li>
        <span className="text-[var(--ink)]">koito.db</span> /{" "}
        <span className="text-[var(--ink)]">*.sqlite</span> — Koito database
      </li>
      <li>
        <span className="text-[var(--ink)]">koito*.json</span> — Koito JSON export
      </li>
      <li>
        <span className="text-[var(--ink)]">Streaming_History_Audio</span> — Spotify
      </li>
      <li>
        <span className="text-[var(--ink)]">maloja</span> — Maloja export
      </li>
      <li>
        <span className="text-[var(--ink)]">recenttracks</span> — Last.fm (ghan.nl)
      </li>
      <li>
        <span className="text-[var(--ink)]">listenbrainz*.zip</span> — ListenBrainz
      </li>
    </ul>
  </MusicSourceCard>
);
