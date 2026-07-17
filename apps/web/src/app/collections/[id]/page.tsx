"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { GameTile } from "@/components/GameTile";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const collection = useQuery({
    queryKey: ["collection", params.id],
    queryFn: () =>
      api<{
        name: string;
        description: string | null;
        type: string;
        games: {
          appId: number;
          name: string;
          headerImage: string | null;
          genres: string[];
        }[];
      }>(`/collections/${params.id}`),
  });

  return (
    <AppShell>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        {collection.data?.name || "Collection"}
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {collection.data?.description || collection.data?.type}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(collection.data?.games || []).map((g) => (
          <GameTile
            key={g.appId}
            name={g.name}
            headerImage={g.headerImage}
            meta={g.genres.slice(0, 2).join(", ")}
          />
        ))}
      </div>
    </AppShell>
  );
}
