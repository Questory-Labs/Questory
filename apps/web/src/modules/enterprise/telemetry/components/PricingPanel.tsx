"use client";

import { Button, ResourceStatus } from "@questorylabs/ui";
import { Fragment } from "react";
import {
  ADMIN_ROW,
  ADMIN_SECTION_TITLE,
  ADMIN_TABLE,
  ADMIN_TH,
} from "@/modules/admin/shared/admin.styles";
import type {
  OtelModelPricing,
  OtelPricing,
} from "@/lib/enterprise-api";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { formatUsd } from "../enterprise.telemetry.utils";
import { TitledPanel } from "./TelemetryChrome";

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

const fieldClass =
  "w-full min-w-[4.5rem] rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 font-mono text-xs text-[var(--ink)]";

export const PricingSummary = ({
  pricing,
  pricingOpen,
  setPricingOpen,
  pricingRows,
}: Pick<
  PricingPanelProps,
  "pricing" | "pricingOpen" | "setPricingOpen" | "pricingRows"
>) => (
  <section
    aria-labelledby="telemetry-pricing"
    className="panel q-in min-w-0 flex-[1_1_280px] px-5 py-[18px]"
    style={{ "--i": 10 } as React.CSSProperties}
  >
    <h2 id="telemetry-pricing" className={ADMIN_SECTION_TITLE}>
      Model pricing
    </h2>
    <p className="mt-1 text-[13px] text-[var(--muted)]">
      $ per 1M tokens, input / output. Stored on QEngine. Costs are computed
      server-side from these rates.
    </p>
    <ResourceStatus
      failed={pricing.failed}
      empty={pricing.empty}
      loading={
        <p className="mt-3.5 text-sm text-[var(--muted)]">Loading rates…</p>
      }
      error={
        <p className="mt-3.5 text-sm text-[var(--danger)]">
          {(pricing.error as Error)?.message}
        </p>
      }
    >
      {pricingRows.length === 0 ? (
        <p className="mt-3.5 text-sm text-[var(--muted)]">No rates set.</p>
      ) : (
        <dl className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 font-mono text-[13px]">
          {pricingRows.map((row, i) => (
            <Fragment key={`${row.model}-${i}`}>
              <dt className="truncate">{row.model}</dt>
              <dd className="text-[var(--dim)]">
                {formatUsd(row.input)} / {formatUsd(row.output)}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </ResourceStatus>
    <Button
      variant="secondary"
      className="mt-4"
      aria-expanded={pricingOpen}
      onClick={() => setPricingOpen((v) => !v)}
    >
      {pricingOpen ? "Close editor" : "Edit pricing"}
    </Button>
  </section>
);

export const PricingEditor = ({
  pricing,
  pricingRows,
  updatePricingRow,
  newModel,
  setNewModel,
  setPricingDraft,
  pricingDraft,
  savePricing,
}: Omit<PricingPanelProps, "pricingOpen" | "setPricingOpen">) => (
  <TitledPanel
    title="Edit model pricing"
    description="$ per 1M tokens for each token kind."
    index={11}
  >
    <div className="space-y-4">
      {pricing.failed ? (
        <p className="text-sm text-[var(--danger)]">
          {(pricing.error as Error)?.message}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className={`${ADMIN_TABLE} min-w-[40rem]`}>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH}>Model</th>
              <th scope="col" className={ADMIN_TH}>Input</th>
              <th scope="col" className={ADMIN_TH}>Output</th>
              <th scope="col" className={ADMIN_TH}>Cached</th>
              <th scope="col" className={ADMIN_TH}>Reasoning</th>
              <th scope="col" className={ADMIN_TH} />
            </tr>
          </thead>
          <tbody>
            {pricingRows.map((row, i) => (
              <tr key={`${row.model}-${i}`} className={ADMIN_ROW}>
                {(
                  ["model", "input", "output", "cached", "reasoning"] as const
                ).map((field) => (
                  <td key={field} className="px-2 py-2">
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
                      aria-label={`${field} ${i + 1}`}
                      className={fieldClass}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-right">
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    onClick={() =>
                      setPricingDraft(pricingRows.filter((_, idx) => idx !== i))
                    }
                  >
                    Remove
                  </Button>
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
          aria-label="Add model name"
          className="min-h-10 min-w-0 flex-1 rounded-full border border-white/[0.08] bg-black/30 px-4 font-mono text-sm text-[var(--ink)] sm:max-w-xs"
        />
        <Button
          variant="secondary"
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
          disabled={savePricing.busy}
          onClick={() => savePricing.submit(pricingRows)}
        >
          {savePricing.busy ? "Saving…" : "Save rates"}
        </Button>
        {pricingDraft ? (
          <Button variant="ghost" onClick={() => setPricingDraft(null)}>
            Reset
          </Button>
        ) : null}
        {savePricing.failed ? (
          <span className="text-xs text-[var(--danger)]">
            {(savePricing.error as Error)?.message}
          </span>
        ) : null}
      </div>
    </div>
  </TitledPanel>
);
