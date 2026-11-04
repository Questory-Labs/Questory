const ALLOWED = [
  "Send play sessions for games on this PC",
  "Read your game library to match titles",
];

export function OAuthPermissions() {
  return (
    <div className="panel q-in rounded-[var(--radius-panel)] p-[22px] [--i:4]">
      <p className="label-mono m-0 text-[var(--muted)]">It will be able to</p>
      <ul className="mt-3.5 flex flex-col gap-3 p-0 text-sm">
        {ALLOWED.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ok)]/15 text-[11px] text-[var(--ok)]"
            >
              ✓
            </span>
            <span className="text-[var(--ink)]">{text}</span>
          </li>
        ))}
        <li className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] text-[var(--faint)]"
          >
            ✕
          </span>
          <span className="text-[var(--muted)]">
            Not see your password, music, watch or read data
          </span>
        </li>
      </ul>
    </div>
  );
}
