"use client";

import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import type { Collection } from "@questorylabs/shared";
import Link from "next/link";
import { useState } from "react";

export default function CollectionsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const list = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<Collection[]>("/collections"),
  });
  const create = useMutation({
    mutationFn: () =>
      api("/collections", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Collections"
        description="Smart shelves plus your custom lists"
      />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New custom collection"
          className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
        />
        <Button type="submit" variant="primary">
          Create
        </Button>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(list.data || []).map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`}>
            <Panel className="p-5 transition hover:border-[var(--accent)]">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                {c.type}
              </div>
              <div className="mt-2 font-display text-xl font-bold">{c.name}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {c.gameCount} games
                {c.description ? ` · ${c.description}` : ""}
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </>
  );
}
