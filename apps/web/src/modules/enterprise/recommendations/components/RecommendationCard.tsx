"use client";

import { DotCover } from "@questorylabs/ui";
import {
  DOMAIN_COLOR,
  FEEDBACK_BUTTON_CLASS,
  KIND_LABELS,
} from "../enterprise.recommendations.constants";
import type { RecommendationCardProps } from "../enterprise.recommendations.types";

const voteClass = (on: boolean, tone: "up" | "down") =>
  on
    ? tone === "up"
      ? "border-[rgba(95,211,138,0.4)] bg-[rgba(95,211,138,0.14)] text-[var(--ok)]"
      : "border-[rgba(240,79,79,0.35)] bg-[rgba(240,79,79,0.1)] text-[var(--danger)]"
    : `border-white/10 bg-transparent ${tone === "up" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`;

export const RecommendationCard = ({
  item,
  vote,
  dismissed,
  onFeedback,
}: RecommendationCardProps) => {
  const portrait =
    item.kind === "movie" || item.kind === "show" || item.kind === "manga";
  const extra = item.kind === "external" || item.kind === "lifestyle";
  const canVote = Boolean(item.itemKey) && !extra;
  const badge =
    item.cardType === "social" ? "Play together" : KIND_LABELS[item.kind];
  const color = DOMAIN_COLOR[item.domain];
  const score = Math.round(item.score * 100);
  const lead = item.why ?? item.blurb;
  return (
    <article
      className="panel q-lift group flex flex-col gap-3.5 overflow-hidden p-3.5 transition-[opacity,transform] duration-300 data-[dismissed=true]:scale-95 data-[dismissed=true]:opacity-0 data-[vote=dislike]:opacity-45"
      data-dismissed={dismissed}
      data-vote={vote}
    >
      <div className="flex gap-3.5">
        <span
          aria-hidden="true"
          className={`relative w-[78px] flex-none overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#101012] ${
            portrait ? "aspect-[2/3]" : "aspect-square"
          }`}
        >
          {item.imageUrl ? (
            // Arbitrary external hosts (Steam CDN, TMDB, CAA) — plain img on purpose.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="absolute inset-0 size-full object-cover transition-[transform,filter] duration-[1200ms] group-hover:scale-[1.08] group-hover:brightness-125"
              src={item.imageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <DotCover
              seed={item.itemKey ?? item.name}
              tint={color}
              className="absolute inset-0"
            />
          )}
        </span>
        <div className="min-w-0 pt-0.5">
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
            style={{ color }}
          >
            <span
              aria-hidden="true"
              className="size-[5px] rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            />
            {badge}
          </span>
          <h3 className="mt-1.5 text-lg font-normal tracking-[-0.01em]">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.name}
              </a>
            ) : (
              item.name
            )}
          </h3>
          {item.reasons.length > 0 && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {item.reasons.map((reason, i) => (
                <span key={reason}>
                  {i > 0 ? " · " : null}
                  <span>{reason}</span>
                </span>
              ))}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2" title="Match score">
            <span className="tick-track relative block h-1.5 w-20">
              <span className="tick-fill absolute inset-y-0 left-0" style={{ width: `${score}%` }} />
            </span>
            <span className="font-mono text-[10px] text-[var(--faint)]">{score}</span>
          </div>
        </div>
      </div>
      {lead ? (
        <p className="font-serif text-[17px] leading-[1.3] text-[#cfcfd3]">{lead}</p>
      ) : null}
      {item.why && item.blurb ? (
        <p className="text-xs text-[var(--muted)]">{item.blurb}</p>
      ) : null}
      {canVote && (
        <div className="mt-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`${FEEDBACK_BUTTON_CLASS} ${voteClass(vote === "like", "up")}`}
            data-active={vote === "like"}
            aria-pressed={vote === "like"}
            aria-label={`Like ${item.name}`}
            onClick={() => onFeedback(item, "like")}
          >
            More like this
          </button>
          <button
            type="button"
            className={`${FEEDBACK_BUTTON_CLASS} ${voteClass(vote === "dislike", "down")}`}
            data-active={vote === "dislike"}
            aria-pressed={vote === "dislike"}
            aria-label={`Dislike ${item.name}`}
            onClick={() => onFeedback(item, "dislike")}
          >
            Not for me
          </button>
          <button
            type="button"
            className={`${FEEDBACK_BUTTON_CLASS} ml-auto border-transparent text-[var(--faint)] hover:text-[var(--ink)]`}
            aria-label={`Dismiss ${item.name}`}
            title="Not now"
            onClick={() => onFeedback(item, "dismiss")}
          >
            Not now
          </button>
        </div>
      )}
    </article>
  );
};
