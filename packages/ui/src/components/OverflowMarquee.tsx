"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cva } from "class-variance-authority";
import { cn } from "../cn";

export const overflowMarqueeVariants = cva("overflow-marquee min-w-0", {
  variants: {
    overflowing: {
      true: "overflow-marquee--active",
      false: "",
    },
  },
  defaultVariants: {
    overflowing: false,
  },
});

type OverflowMarqueeProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function OverflowMarquee({
  children,
  className,
  style,
}: OverflowMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [duration, setDuration] = useState(12);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const check = () => {
      const contentWidth = measure.scrollWidth;
      const containerWidth = container.clientWidth;
      const isOverflowing = contentWidth > containerWidth + 1;
      setOverflowing(isOverflowing);
      if (isOverflowing) {
        setDuration(Math.max(8, contentWidth / 36));
      }
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn(overflowMarqueeVariants({ overflowing }), className)}
      style={style}
    >
      <span
        ref={measureRef}
        className="pointer-events-none absolute whitespace-nowrap opacity-0"
        aria-hidden
      >
        {children}
      </span>
      {overflowing ? (
        <div
          className="overflow-marquee__track"
          style={{ animationDuration: `${duration}s` }}
        >
          <span className="overflow-marquee__segment">{children}</span>
          <span className="overflow-marquee__segment" aria-hidden>
            {children}
          </span>
        </div>
      ) : (
        <span className="block truncate">{children}</span>
      )}
    </div>
  );
}
