"use client";

import { useQuery } from "@tanstack/react-query";
import { GameTile } from "@/components/GameTile";
import { PageHeader } from "@/components/ui";
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
    <>
      <PageHeader
        title={collection.data?.name || "Collection"}
        description={collection.data?.description || collection.data?.type}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(collection.data?.games || []).map((g) => (
          <GameTile
            key={g.appId}
            name={g.name}
            headerImage={g.headerImage}
            meta={g.genres.slice(0, 2).join(", ")}
          />
        ))}
      </div>
    </>
  );
}
