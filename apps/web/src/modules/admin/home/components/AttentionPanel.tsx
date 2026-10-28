import Link from "next/link";
import { TONE_TEXT } from "../../shared/admin.tone";
import type { AttentionItem } from "../admin.home.types";

export const AttentionPanel = ({ items }: { items: AttentionItem[] }) => {
  if (!items.length) return null;
  return (
    <section
      aria-labelledby="admin-attention"
      className="panel q-in [--i:1] border-[rgba(240,79,79,0.22)] bg-[linear-gradient(180deg,rgba(240,79,79,0.08),rgba(255,255,255,0.012))] px-5 py-[18px]"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="block h-0 w-0 border-x-[10px] border-b-[17px] border-x-transparent border-b-[var(--danger)]"
        />
        <h2 id="admin-attention" className="text-base font-normal">
          Needs attention
        </h2>
        <span className="ml-auto text-[34px] font-extralight leading-[0.9]">{items.length}</span>
      </div>
      <ul className="mt-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(240,79,79,0.14)] py-2.5"
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`dot ${TONE_TEXT[item.tone]} ${item.tone === "danger" ? "q-live" : ""}`}
                aria-hidden
              />
              {item.text}
            </span>
            <Link
              href={item.href}
              className="inline-flex min-h-9 items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-3.5 text-[13px] font-normal transition hover:border-white/20"
            >
              {item.action}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
