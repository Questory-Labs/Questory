"use client";

import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { RewindInsightResponse } from "@questorylabs/shared";
import { ResourceStatus } from "@questorylabs/ui";
import { StateMessage } from "@/components/ui";
import type { RewindScope } from "../media.rewind.types";
import { formatAiCards, parseBoldSegments } from "../media.rewind.utils";

const ArrowIcon = ({ dir }: { dir: "prev" | "next" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "prev" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
  </svg>
);

const roundBtn =
  "grid size-11 place-items-center rounded-full border border-white/12 bg-transparent text-ink transition-colors duration-300 hover:border-white/22 hover:bg-white/8";

export const RewindAiPanel = ({
  aiQuery,
  domain,
  blockedMessage,
  onRegenerate,
  regenerateDisabled,
}: {
  aiQuery: UseResourceResult<RewindInsightResponse>;
  domain: RewindScope;
  blockedMessage: string | null;
  onRegenerate: () => void;
  regenerateDisabled: boolean;
}) => {
  const content = aiQuery.value?.content;
  const cards = useMemo(() => (content ? formatAiCards(content, domain) : []), [content, domain]);
  const [index, setIndex] = useState(0);
  const count = cards.length;
  const showCards = !blockedMessage && count > 0;

  useEffect(() => {
    setIndex(0);
  }, [content]);

  const go = (step: number) => setIndex((i) => (count ? (i + step + count) % count : 0));
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (count < 2) return;
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  };
  const card = cards[index];

  return (
    <section
      aria-labelledby="rewind-ai"
      aria-roledescription="carousel"
      onKeyDown={onKeyDown}
      className="panel-accent q-in relative flex min-w-0 flex-[1_1_320px] flex-col justify-between gap-[18px] overflow-hidden p-6"
      style={{ "--i": 3 } as CSSProperties}
    >
      <div className="min-w-0">
        <p id="rewind-ai" className="label-mono m-0 flex items-center gap-2 !text-[var(--warm)]">
          <span aria-hidden="true" className="q-live dot !size-[5px] bg-[var(--warm)]" />
          {showCards ? `AI insight ${index + 1} of ${count}` : "AI insight"}
        </p>
        {blockedMessage ? (
          <p className="mt-3.5 text-sm text-muted">{blockedMessage}</p>
        ) : (
          <ResourceStatus
            failed={aiQuery.failed}
            empty={aiQuery.empty}
            loading={
              <p className="mt-3.5 flex items-center gap-3 text-sm text-muted">
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[var(--warm)] border-t-transparent" />
                Synthesizing insights...
              </p>
            }
            error={
              <div className="mt-3.5">
                <StateMessage variant="error">{aiQuery.error?.message || "Failed to load narrative"}</StateMessage>
              </div>
            }
          >
            {card ? (
              <div aria-live="polite" className="mt-3.5">
                <p className="m-0 text-xs text-[#f0d9a6]/80">{card.title}</p>
                <p className="font-serif mt-2 max-h-64 overflow-y-auto text-[clamp(20px,2.2vw,30px)] leading-[1.15] text-[#f3efe6]">
                  {parseBoldSegments(card.text).map((seg, i) => (
                    <span key={i} className={seg.bold ? "text-white" : undefined}>
                      {seg.value}
                    </span>
                  ))}
                </p>
              </div>
            ) : null}
          </ResourceStatus>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showCards && count > 1 ? (
          <>
            <button type="button" aria-label="Previous insight" onClick={() => go(-1)} className={roundBtn}>
              <ArrowIcon dir="prev" />
            </button>
            <button type="button" aria-label="Next insight" onClick={() => go(1)} className={roundBtn}>
              <ArrowIcon dir="next" />
            </button>
            <span role="group" aria-label="Choose insight" className="ml-1.5 flex items-center gap-[5px]">
              {cards.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to insight ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => setIndex(i)}
                  className={`h-[5px] rounded-full transition-all duration-500 ${i === index ? "w-4 bg-[var(--warm)]" : "w-[5px] bg-white/20"}`}
                />
              ))}
            </span>
          </>
        ) : null}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerateDisabled}
          className="ml-auto min-h-11 rounded-full border border-[rgba(230,194,122,0.35)] bg-transparent px-4 text-[13px] text-[#f0d9a6] transition-colors duration-300 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>
    </section>
  );
};
