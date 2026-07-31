"use client";

import { useMutation } from "@tanstack/react-query";
import { Button, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import type { ScraperTestResponse } from "@questorylabs/shared";
import { useState } from "react";

type Props = {
  providerKey: string;
  iterationId: string;
  defaultMacros?: string;
  onValidated?: (result: ScraperTestResponse) => void;
};

export function ScraperTestPanel({
  providerKey,
  iterationId,
  defaultMacros = "letterboxdId: username",
  onValidated,
}: Props) {
  const [macros, setMacros] = useState(defaultMacros);
  const [result, setResult] = useState<ScraperTestResponse | null>(null);

  const test = useMutation({
    mutationFn: () => {
      const parsed: Record<string, string> = {};
      for (const line of macros.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const sep = trimmed.includes(":") ? ":" : "=";
        const [key, ...rest] = trimmed.split(sep);
        const value = rest.join(sep).trim();
        if (key.trim() && value) parsed[key.trim()] = value;
      }
      return api<ScraperTestResponse>(
        `/admin/scrapers/providers/${providerKey}/iterations/${iterationId}/test`,
        {
          method: "POST",
          body: JSON.stringify({ macros: parsed, maxPages: 1 }),
        },
      );
    },
    onSuccess: (data) => setResult(data),
  });

  const validate = useMutation({
    mutationFn: () => {
      const parsed: Record<string, string> = {};
      for (const line of macros.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const sep = trimmed.includes(":") ? ":" : "=";
        const [key, ...rest] = trimmed.split(sep);
        const value = rest.join(sep).trim();
        if (key.trim() && value) parsed[key.trim()] = value;
      }
      return api<{ test: ScraperTestResponse }>(
        `/admin/scrapers/providers/${providerKey}/iterations/${iterationId}/validate`,
        {
          method: "POST",
          body: JSON.stringify({ macros: parsed, maxPages: 1 }),
        },
      );
    },
    onSuccess: (data) => {
      setResult(data.test);
      onValidated?.(data.test);
    },
  });

  return (
    <Panel className="p-5">
      <h3 className="font-display text-lg font-bold">Dry run</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Run page 1 with macro values (one per line: key: value).
      </p>
      <textarea
        className="mt-3 min-h-24 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 font-mono text-xs"
        value={macros}
        onChange={(e) => setMacros(e.target.value)}
        aria-label="Scraper test macros"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={test.isPending || validate.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? "Running…" : "Test scrape"}
        </Button>
        {onValidated ? (
          <Button
            disabled={test.isPending || validate.isPending}
            onClick={() => validate.mutate()}
          >
            {validate.isPending ? "Validating…" : "Validate iteration"}
          </Button>
        ) : null}
      </div>
      {test.isError || validate.isError ? (
        <p className="mt-3 text-sm text-red-400">
          {(test.error ?? validate.error) instanceof Error
            ? (test.error ?? validate.error)?.message
            : "Request failed"}
        </p>
      ) : null}
      {result?.pages.map((page) => (
        <div key={page.page} className="mt-4">
          <p className="font-mono text-[11px] text-[var(--faint)]">
            Page {page.page}: {page.url}
          </p>
          <pre className="mt-2 max-h-64 overflow-auto rounded border border-[var(--line)] bg-[var(--bg-2)] p-3 font-mono text-[11px] text-[var(--ink)]">
            {JSON.stringify(page.rows, null, 2)}
          </pre>
        </div>
      ))}
    </Panel>
  );
}
