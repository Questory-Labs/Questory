import type { ReactNode } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui";
import { initialOf } from "../music.utils";

export type AlbumCard = {
  key: string;
  href: string;
  title: string;
  meta: string;
  imageUrl?: string | null;
};

export const AlbumCardGrid = ({
  titleId,
  heading,
  items,
  empty,
  footer,
}: {
  titleId: string;
  heading: ReactNode;
  items: AlbumCard[];
  empty: string;
  footer?: ReactNode;
}) => (
  <section aria-labelledby={titleId} className="q-in [--i:5]">
    <h2
      id={titleId}
      className="mx-1 mt-1.5 text-[26px] font-light tracking-[-0.02em]"
    >
      {heading}
    </h2>
    {items.length > 0 ? (
      <ul className="m-0 mt-3 grid list-none grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5 p-0">
        {items.map((album) => (
          <li key={album.key}>
            <Link href={album.href} className="block">
              <Panel className="q-lift px-2.5 pb-3.5 pt-2.5">
                <span className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle,rgba(240,168,184,0.25),rgba(255,255,255,0.03)_70%)] font-serif text-5xl text-[#f0c4cf]">
                  {album.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">{initialOf(album.title)}</span>
                  )}
                </span>
                <span className="mx-1 mt-2.5 block truncate text-sm font-normal">
                  {album.title}
                </span>
                <span className="mx-1 block truncate font-mono text-[10px] text-[var(--faint)]">
                  {album.meta}
                </span>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mx-1 mt-2 text-sm text-[var(--muted)]">{empty}</p>
    )}
    {footer ? <div className="mx-1 mt-3">{footer}</div> : null}
  </section>
);
