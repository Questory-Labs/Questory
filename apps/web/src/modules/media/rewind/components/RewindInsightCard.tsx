"use client";

import { useEffect, useRef, useState } from "react";
import type { RewindCardTheme } from "../media.rewind.types";
import { parseBoldSegments } from "../media.rewind.utils";
import { RewindDecoration } from "./RewindDecoration";
import { RewindPattern } from "./RewindPattern";

export const RewindInsightCard = ({
  title,
  text,
  theme,
}: {
  title: string;
  text: string;
  theme: RewindCardTheme;
}) => {
  const segments = parseBoldSegments(text);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div
      className={`w-full h-full min-h-[12rem] sm:min-h-[14rem] md:min-h-[18rem] max-h-[min(70dvh,28rem)] flex flex-col relative overflow-hidden ${theme.container}`}
    >
      <RewindPattern spec={theme.pattern} />
      <RewindDecoration kind={theme.decoration} />

      <div className="relative z-10 flex flex-col h-full min-h-0">
        <div
          ref={scrollerRef}
          className={`flex-1 min-h-0 px-5 py-10 md:px-8 md:py-10 ${
            overflows
              ? "overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent]"
              : "overflow-hidden"
          }`}
        >
          <div className="min-h-full flex flex-col justify-center">
            {title ? (
              <div className="shrink-0 mb-3 md:mb-4">
                <h4 className={theme.title}>{title}</h4>
              </div>
            ) : null}

            <p className={`text-base md:text-xl lg:text-2xl ${theme.text} whitespace-pre-wrap drop-shadow-md`}>
              {segments.map((seg, i) => {
                if (seg.bold) {
                  return (
                    <strong key={i} className={theme.highlight}>
                      {seg.value}
                    </strong>
                  );
                }
                if (seg.italic) {
                  return (
                    <em key={i} className="italic opacity-100">
                      {seg.value}
                    </em>
                  );
                }
                return (
                  <span key={i} className="opacity-90">
                    {seg.value}
                  </span>
                );
              })}
            </p>
          </div>
        </div>
        {overflows ? (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent ${theme.scrollFade}`}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
};
