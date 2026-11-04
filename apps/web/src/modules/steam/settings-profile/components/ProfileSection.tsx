"use client";

import type { CSSProperties, ReactNode } from "react";

export const ProfileSection = ({
  id,
  title,
  description,
  index,
  className = "",
  children,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  index: number;
  className?: string;
  children?: ReactNode;
}) => (
  <section
    aria-labelledby={id}
    className={`panel q-in px-[22px] py-5 ${className}`}
    style={{ "--i": index } as CSSProperties}
  >
    <h2 id={id} className="text-[17px] font-normal">
      {title}
    </h2>
    {description ? (
      <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
    ) : null}
    {children}
  </section>
);
