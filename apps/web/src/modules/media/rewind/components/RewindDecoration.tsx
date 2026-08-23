import type { DecorationKind } from "../media.rewind.types";

const CornerBracket = ({ className }: { className: string }) => (
  <div className={`absolute w-8 h-8 ${className}`} />
);

export const RewindDecoration = ({ kind }: { kind: DecorationKind }) => {
  if (kind === "none") return null;

  return (
    <div className="absolute inset-0 pointer-events-none" data-rewind-decoration={kind} aria-hidden>
      {kind === "vignette" ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.9)_90%)]" />
      ) : null}

      {kind === "rec-badge" ? (
        <div className="absolute bottom-6 right-6 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div className="text-sm text-red-500 font-mono font-bold">REC</div>
        </div>
      ) : null}

      {kind === "margin-line" ? (
        <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-[#d4d4d8]" />
      ) : null}

      {kind === "corner-brackets" ? (
        <>
          <CornerBracket className="top-4 left-4 border-t-2 border-l-2 border-current opacity-50" />
          <CornerBracket className="top-4 right-4 border-t-2 border-r-2 border-current opacity-50" />
          <CornerBracket className="bottom-4 left-4 border-b-2 border-l-2 border-current opacity-50" />
          <CornerBracket className="bottom-4 right-4 border-b-2 border-r-2 border-current opacity-50" />
        </>
      ) : null}

      {kind === "orbit-ring" ? (
        <div
          className="absolute -right-16 top-1/2 h-[140%] w-[70%] -translate-y-1/2 rounded-full border-[10px] border-current opacity-20 -rotate-12"
        />
      ) : null}

      {kind === "quote-marks" ? (
        <>
          <div className="absolute top-3 left-5 font-serif text-7xl leading-none opacity-20">{"\u201C"}</div>
          <div className="absolute bottom-1 right-5 font-serif text-7xl leading-none opacity-20">{"\u201D"}</div>
        </>
      ) : null}

      {kind === "asterisk-burst" ? (
        <div className="absolute -right-4 -top-6 font-black text-[9rem] leading-none opacity-15 rotate-12">*</div>
      ) : null}

      {kind === "play-glyph" ? (
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 opacity-15"
          style={{
            width: 0,
            height: 0,
            borderTop: "2.5rem solid transparent",
            borderBottom: "2.5rem solid transparent",
            borderLeft: "4rem solid currentColor",
          }}
        />
      ) : null}

      {kind === "timestamp-osd" ? (
        <div className="absolute top-4 right-5 font-mono text-xs tracking-[0.35em] opacity-40">00:00:00</div>
      ) : null}

      {kind === "stamp-seal" ? (
        <div className="absolute bottom-6 right-6 w-16 h-16 rounded-full border-[3px] border-current opacity-30 rotate-[-18deg]">
          <div className="absolute inset-2 rounded-full border border-current" />
        </div>
      ) : null}

      {kind === "binder-holes" ? (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-6">
          <div className="w-4 h-4 rounded-full bg-[var(--bg-0)] border border-current/30" />
          <div className="w-4 h-4 rounded-full bg-[var(--bg-0)] border border-current/30" />
          <div className="w-4 h-4 rounded-full bg-[var(--bg-0)] border border-current/30" />
        </div>
      ) : null}

      {kind === "washi-tape" ? (
        <div
          className="absolute -top-2 right-10 h-8 w-28 rotate-12 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, currentColor 0 6px, transparent 6px 12px)",
          }}
        />
      ) : null}

      {kind === "neon-frame" ? (
        <div className="absolute inset-3 rounded-xl border-2 border-current shadow-[inset_0_0_24px_currentColor] opacity-35" />
      ) : null}

      {kind === "laurel" ? (
        <svg
          className="absolute bottom-3 left-1/2 h-16 w-40 -translate-x-1/2 opacity-25"
          viewBox="0 0 160 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M80 56 C52 56 28 40 16 16" />
          <path d="M80 56 C108 56 132 40 144 16" />
          <path d="M28 28 C36 24 40 32 34 36" />
          <path d="M40 38 C48 34 52 42 46 46" />
          <path d="M132 28 C124 24 120 32 126 36" />
          <path d="M120 38 C112 34 108 42 114 46" />
        </svg>
      ) : null}
    </div>
  );
};
