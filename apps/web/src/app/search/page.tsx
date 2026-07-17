"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import type { SearchResult } from "@questorylabs/shared";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const result = useQuery({
    queryKey: ["search", q],
    queryFn: () => api<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
    enabled: Boolean(q),
  });

  return (
    <>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        Search
      </h1>
      <p className="mt-2 text-[var(--muted)]">Results for “{q}”</p>

      <section className="mt-8 space-y-8">
        <Block title="Games">
          {(result.data?.games || []).map((g) => (
            <div key={`${g.source}-${g.appId}`} className="text-sm">
              {g.name}{" "}
              <span className="text-[var(--muted)]">({g.source})</span>
            </div>
          ))}
        </Block>
        <Block title="Friends">
          {(result.data?.friends || []).map((f) => (
            <Link
              key={f.steamId}
              href={`/friends/${f.steamId}`}
              className="block text-sm text-[var(--accent)]"
            >
              {f.personaName}
            </Link>
          ))}
        </Block>
        <Block title="Publishers">
          {(result.data?.publishers || []).map((p) => (
            <div key={p} className="text-sm">
              {p}
            </div>
          ))}
        </Block>
        <Block title="Collections">
          {(result.data?.collections || []).map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="block text-sm text-[var(--accent)]"
            >
              {c.name}
            </Link>
          ))}
        </Block>
      </section>
    </>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense>
        <SearchInner />
      </Suspense>
    </AppShell>
  );
}
