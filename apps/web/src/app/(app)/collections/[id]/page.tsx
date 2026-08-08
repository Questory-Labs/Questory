"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@questorylabs/qhttp/react";
import { GameTile } from "@/components/GameTile";
import { Button, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import { useParams } from "next/navigation";

type CollectionDetailResponse = {
  name: string;
  description: string | null;
  type: string;
  total: number;
  page: number;
  pageSize: number;
  games: {
    appId: number;
    name: string;
    headerImage: string | null;
    genres: string[];
  }[];
};

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [params.id]);

  const collection = useQuery({
    queryKey: ["collection", params.id, page],
    queryFn: () =>
      api<CollectionDetailResponse>(
        `/collections/${params.id}?page=${page}&pageSize=${GAME_GRID_PAGE_SIZE}`,
      ),
  });

  const total = collection.data?.total ?? 0;
  const pageSize = collection.data?.pageSize ?? GAME_GRID_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title={collection.data?.name || "Collection"}
        description={
          collection.data
            ? `${collection.data.total} games${collection.data.description ? ` · ${collection.data.description}` : collection.data.type ? ` · ${collection.data.type}` : ""}`
            : undefined
        }
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

      {total > pageSize && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5"
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
