"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui";
import {
  REWIND_CAROUSEL_AUTOPLAY_MS,
  REWIND_CAROUSEL_SWIPE_PX,
  REWIND_CAROUSEL_TRANSITION_MS,
  rewindCoverflowOffset,
  rewindCoverflowTransform,
} from "@/lib/rewind-carousel";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

function slotForOffset(offset: number): "prev" | "current" | "next" | undefined {
  if (offset === 0) return "current";
  if (offset === -1) return "prev";
  if (offset === 1) return "next";
  return undefined;
}

export function RewindCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children).filter(Boolean);
  const count = slides.length;
  const multi = count > 1;

  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pointerDown, setPointerDown] = useState(false);
  const [navGeneration, setNavGeneration] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const startX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const paused = hovering || focused || pointerDown || reducedMotion;

  useEffect(() => {
    setIndex((current) => (current >= count ? 0 : current));
  }, [count]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(wrapIndex(next, count));
      setNavGeneration((generation) => generation + 1);
    },
    [count],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  const onNeighborClick = useCallback(
    (direction: "prev" | "next") => {
      if (didSwipe.current) {
        didSwipe.current = false;
        return;
      }
      if (direction === "prev") goPrev();
      else goNext();
    },
    [goPrev, goNext],
  );

  useEffect(() => {
    if (!multi || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => wrapIndex(current + 1, count));
    }, REWIND_CAROUSEL_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [multi, paused, count, navGeneration]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!multi) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!multi) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    didSwipe.current = false;
    startX.current = event.clientX;
    setPointerDown(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const origin = startX.current;
    startX.current = null;
    setPointerDown(false);
    if (origin == null) return;
    const delta = event.clientX - origin;
    if (delta <= -REWIND_CAROUSEL_SWIPE_PX) {
      didSwipe.current = true;
      goNext();
    } else if (delta >= REWIND_CAROUSEL_SWIPE_PX) {
      didSwipe.current = true;
      goPrev();
    }
  };

  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="AI insights"
      tabIndex={0}
      className="outline-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onKeyDown={onKeyDown}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Insight {index + 1} of {count}
      </div>

      <div
        className="overflow-x-clip px-2 sm:px-6 md:px-10 touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div className="relative mx-auto w-full max-w-4xl">
          {multi ? (
            <div className="invisible pointer-events-none" aria-hidden>
              {slides[index]}
            </div>
          ) : null}
          {slides.map((slide, slideIndex) => {
            const offset = multi ? rewindCoverflowOffset(slideIndex, index, count) : 0;
            const visible = Math.abs(offset) <= 1;
            const slot = slotForOffset(offset);
            return (
              <div
                key={slideIndex}
                data-slot={slot}
                aria-hidden={offset !== 0}
                className={
                  multi
                    ? "absolute inset-0 origin-bottom will-change-transform motion-safe:transition-[transform,opacity] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
                    : "relative"
                }
                style={
                  multi
                    ? {
                        transform: rewindCoverflowTransform(offset, reducedMotion),
                        opacity: visible ? (offset === 0 ? 1 : 0.55) : 0,
                        zIndex: offset === 0 ? 20 : visible ? 5 : 0,
                        pointerEvents: visible ? "auto" : "none",
                        transitionDuration: reducedMotion ? "0ms" : `${REWIND_CAROUSEL_TRANSITION_MS}ms`,
                      }
                    : undefined
                }
                onClick={
                  offset === -1
                    ? () => onNeighborClick("prev")
                    : offset === 1
                      ? () => onNeighborClick("next")
                      : undefined
                }
              >
                <div className={offset === 0 ? "h-full" : "h-full pointer-events-none"}>{slide}</div>
              </div>
            );
          })}
        </div>
      </div>

      {multi ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            aria-label="Previous insight"
            onClick={goPrev}
            className="p-2 !px-3 border border-[var(--line-strong)] rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Button>

          <div className="flex items-center gap-2" role="group" aria-label="Choose insight">
            {slides.map((_, slideIndex) => {
              const active = slideIndex === index;
              return (
                <button
                  key={slideIndex}
                  type="button"
                  aria-label={`Go to insight ${slideIndex + 1}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => goTo(slideIndex)}
                  className={`h-2 rounded-full transition-all ${
                    active
                      ? "w-6 bg-[var(--ink)]"
                      : "w-2 bg-[var(--faint)] hover:bg-[var(--muted)]"
                  }`}
                />
              );
            })}
          </div>

          <Button
            variant="ghost"
            aria-label="Next insight"
            onClick={goNext}
            className="p-2 !px-3 border border-[var(--line-strong)] rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
