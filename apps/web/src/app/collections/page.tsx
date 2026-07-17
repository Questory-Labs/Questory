"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
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
    <AppShell>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        Collections
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Smart shelves plus your custom lists
      </p>

      <form
        className="mt-6 flex gap-2"
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
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0b1218]"
        >
          Create
        </button>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(list.data || []).map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.id}`}
            className="rounded-xl border border-[var(--line)] p-5 transition hover:border-[var(--accent)]"
          >
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              {c.type}
            </div>
            <div
              className="mt-2 text-xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              {c.name}
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {c.gameCount} games
              {c.description ? ` · ${c.description}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
