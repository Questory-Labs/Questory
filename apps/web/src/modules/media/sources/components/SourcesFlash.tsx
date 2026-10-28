import type { SourcesFlashMessage } from "../media.sources.utils";

export const SourcesFlash = ({ messages }: { messages: SourcesFlashMessage[] }) =>
  messages.length ? (
    <div className="flex flex-col gap-2">
      {messages.map((m) => (
        <p
          key={m.provider}
          role={m.ok ? "status" : "alert"}
          className="m-0 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm"
          style={{ color: m.ok ? "var(--ok)" : "var(--danger)" }}
        >
          {m.text}
        </p>
      ))}
    </div>
  ) : null;
