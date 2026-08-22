"use client";

import { Button } from "@questorylabs/ui";
import type {
  OtelModelPricing,
  OtelPricing,
} from "@/lib/enterprise-api";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";

type PricingPanelProps = {
  pricing: UseResourceResult<OtelPricing>;
  pricingOpen: boolean;
  setPricingOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  pricingRows: OtelModelPricing[];
  updatePricingRow: (
    index: number,
    field: keyof OtelModelPricing,
    value: string,
  ) => void;
  newModel: string;
  setNewModel: (value: string) => void;
  setPricingDraft: (
    value:
      | OtelModelPricing[]
      | null
      | ((prev: OtelModelPricing[] | null) => OtelModelPricing[] | null),
  ) => void;
  pricingDraft: OtelModelPricing[] | null;
  savePricing: UseActionResult<OtelPricing, OtelModelPricing[]>;
};

export const PricingPanel = ({
  pricing,
  pricingOpen,
  setPricingOpen,
  pricingRows,
  updatePricingRow,
  newModel,
  setNewModel,
  setPricingDraft,
  pricingDraft,
  savePricing,
}: PricingPanelProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs text-[var(--muted)]">
      Stored on QEngine. Costs are computed server-side from these rates.
    </p>
    <button
      type="button"
      onClick={() => setPricingOpen((v) => !v)}
      className="text-xs text-[var(--accent)] hover:underline"
    >
      {pricingOpen ? "Hide" : "Edit rates"}
    </button>
    {pricingOpen ? (
      <div className="mt-3 w-full space-y-3">
        {pricing.failed ? (
          <p className="text-sm text-[var(--danger)]">
            {(pricing.error as Error)?.message}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-[var(--muted)]">
              <tr className="border-b border-[var(--line)]">
                <th className="py-2 pr-2 font-medium">Model</th>
                <th className="py-2 pr-2 font-medium">Input</th>
                <th className="py-2 pr-2 font-medium">Output</th>
                <th className="py-2 pr-2 font-medium">Cached</th>
                <th className="py-2 pr-2 font-medium">Reasoning</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr
                  key={`${row.model}-${i}`}
                  className="border-b border-[var(--line)]/50"
                >
                  {(
                    ["model", "input", "output", "cached", "reasoning"] as const
                  ).map((field) => (
                    <td key={field} className="py-1.5 pr-2">
                      <input
                        type={field === "model" ? "text" : "number"}
                        min={field === "model" ? undefined : 0}
                        step={field === "model" ? undefined : "0.01"}
                        value={
                          field === "model" ? row.model : String(row[field])
                        }
                        onChange={(e) =>
                          updatePricingRow(i, field, e.target.value)
                        }
                        className="w-full min-w-[4.5rem] border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1 font-mono text-xs text-[var(--ink)]"
                      />
                    </td>
                  ))}
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPricingDraft(pricingRows.filter((_, idx) => idx !== i))
                      }
                      className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="Add model name"
            className="border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1.5 font-mono text-xs text-[var(--ink)]"
          />
          <Button
            variant="secondary"
            className="px-2.5 py-1 text-xs"
            onClick={() => {
              const name = newModel.trim();
              if (!name) return;
              if (pricingRows.some((r) => r.model === name)) {
                setNewModel("");
                return;
              }
              setPricingDraft([
                ...pricingRows,
                {
                  model: name,
                  input: 0,
                  output: 0,
                  cached: 0,
                  reasoning: 0,
                },
              ]);
              setNewModel("");
            }}
          >
            Add model
          </Button>
          <Button
            className="px-2.5 py-1 text-xs"
            disabled={savePricing.busy}
            onClick={() => savePricing.submit(pricingRows)}
          >
            {savePricing.busy ? "Saving…" : "Save rates"}
          </Button>
          {pricingDraft ? (
            <button
              type="button"
              onClick={() => setPricingDraft(null)}
              className="text-xs text-[var(--muted)] hover:underline"
            >
              Reset
            </button>
          ) : null}
          {savePricing.failed ? (
            <span className="text-xs text-[var(--danger)]">
              {(savePricing.error as Error)?.message}
            </span>
          ) : null}
        </div>
      </div>
    ) : null}
  </div>
);
