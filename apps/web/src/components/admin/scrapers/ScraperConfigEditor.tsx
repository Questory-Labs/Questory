"use client";

import type {
  ScraperDefinition,
  ScraperFieldRule,
  ScraperPagination,
} from "@questorylabs/shared";

const FIELD_ATTRS = ["text", "html", "href", "class", "attr"] as const;
const TRANSFORMS = [
  "",
  "date",
  "number",
  "stars",
  "slugFromHref",
  "ratedClass",
  "letterboxdDateHref",
] as const;

type Props = {
  fields: ScraperFieldRule[];
  onChange: (fields: ScraperFieldRule[]) => void;
};

export function FieldRuleRows({ fields, onChange }: Props) {
  function updateRow(index: number, patch: Partial<ScraperFieldRule>) {
    onChange(fields.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([
      ...fields,
      { name: "field", selector: ".selector", attr: "text" },
    ]);
  }

  function removeRow(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-[var(--ink)]">Field rules</h3>
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={addRow}
        >
          Add field
        </button>
      </div>
      {fields.map((row, index) => (
        <div
          key={`${row.name}-${index}`}
          className="grid gap-2 rounded border border-[var(--line)] bg-[var(--bg-2)] p-3 md:grid-cols-6"
        >
          <input
            className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
            value={row.name}
            onChange={(e) => updateRow(index, { name: e.target.value })}
            placeholder="name"
            aria-label={`Field name ${index + 1}`}
          />
          <input
            className="md:col-span-2 rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
            value={row.selector}
            onChange={(e) => updateRow(index, { selector: e.target.value })}
            placeholder="selector"
            aria-label={`Field selector ${index + 1}`}
          />
          <select
            className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
            value={row.attr}
            onChange={(e) =>
              updateRow(index, {
                attr: e.target.value as ScraperFieldRule["attr"],
              })
            }
            aria-label={`Field attr ${index + 1}`}
          >
            {FIELD_ATTRS.map((attr) => (
              <option key={attr} value={attr}>
                {attr}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
            value={row.transform ?? ""}
            onChange={(e) =>
              updateRow(index, {
                transform:
                  e.target.value === ""
                    ? undefined
                    : (e.target.value as ScraperFieldRule["transform"]),
              })
            }
            aria-label={`Field transform ${index + 1}`}
          >
            {TRANSFORMS.map((t) => (
              <option key={t || "none"} value={t}>
                {t || "none"}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
              value={row.regex ?? ""}
              onChange={(e) =>
                updateRow(index, { regex: e.target.value || undefined })
              }
              placeholder="regex"
              aria-label={`Field regex ${index + 1}`}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => removeRow(index)}
              aria-label={`Remove field ${index + 1}`}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type EditorProps = {
  draft: {
    name: string;
    sourceKey: string;
    enabled: boolean;
    config: ScraperDefinition;
  };
  onChange: (draft: EditorProps["draft"]) => void;
  /** Provider iteration editor — hides name/source/enabled (fixed per provider). */
  hideMeta?: boolean;
};

export function ScraperConfigEditor({ draft, onChange, hideMeta }: EditorProps) {
  function patchConfig(patch: Partial<ScraperDefinition>) {
    onChange({ ...draft, config: { ...draft.config, ...patch } });
  }

  function patchLimits(patch: Partial<ScraperDefinition["limits"]>) {
    patchConfig({ limits: { ...draft.config.limits, ...patch } });
  }

  function patchPagination(pagination: ScraperPagination) {
    patchConfig({ pagination });
  }

  return (
    <div className="space-y-6">
      {!hideMeta ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Name</span>
              <input
                aria-label="Name"
                className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Source key</span>
              <input
                className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
                value={draft.sourceKey}
                onChange={(e) =>
                  onChange({ ...draft, sourceKey: e.target.value })
                }
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              aria-label="Enabled"
              checked={draft.enabled}
              onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
            />
            Enabled
          </label>
        </>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Engine</span>
          <select
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
            value={draft.config.engine}
            onChange={(e) =>
              patchConfig({
                engine: e.target.value as ScraperDefinition["engine"],
              })
            }
          >
            <option value="cheerio">cheerio</option>
            <option value="playwright">playwright</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Item selector</span>
          <input
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 font-mono text-xs"
            value={draft.config.itemSelector}
            onChange={(e) => patchConfig({ itemSelector: e.target.value })}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-[var(--muted)]">
          Start URL (macros: {"{{user.letterboxdId}}"}, {"{{page}}"})
        </span>
        <input
          className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 font-mono text-xs"
          value={draft.config.startUrl}
          onChange={(e) => patchConfig({ startUrl: e.target.value })}
        />
      </label>

      <label className="block text-sm">
        <span className="text-[var(--muted)]">User-Agent</span>
        <input
          className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 font-mono text-xs"
          value={draft.config.userAgent ?? ""}
          onChange={(e) => patchConfig({ userAgent: e.target.value || undefined })}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Max pages</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
            value={draft.config.limits.maxPages}
            onChange={(e) =>
              patchLimits({ maxPages: Number(e.target.value) || 1 })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Req/min</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
            value={draft.config.limits.maxRequestsPerMinute}
            onChange={(e) =>
              patchLimits({
                maxRequestsPerMinute: Number(e.target.value) || 1,
              })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Delay ms</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
            value={draft.config.limits.requestDelayMs}
            onChange={(e) =>
              patchLimits({ requestDelayMs: Number(e.target.value) || 0 })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Retries</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
            value={draft.config.limits.maxRetries}
            onChange={(e) =>
              patchLimits({ maxRetries: Number(e.target.value) || 0 })
            }
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Pagination type</span>
          <select
            className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
            value={draft.config.pagination.type}
            onChange={(e) => {
              const type = e.target.value as ScraperPagination["type"];
              if (type === "none") patchPagination({ type: "none" });
              else if (type === "nextLink")
                patchPagination({
                  type: "nextLink",
                  nextSelector: ".next",
                });
              else
                patchPagination({
                  type: "urlTemplate",
                  urlTemplate: draft.config.startUrl,
                });
            }}
          >
            <option value="none">none</option>
            <option value="urlTemplate">urlTemplate</option>
            <option value="nextLink">nextLink</option>
          </select>
        </label>
        {draft.config.pagination.type === "urlTemplate" ? (
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Page URL template</span>
            <input
              className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 font-mono text-xs"
              value={draft.config.pagination.urlTemplate}
              onChange={(e) =>
                patchPagination({
                  type: "urlTemplate",
                  urlTemplate: e.target.value,
                })
              }
            />
          </label>
        ) : null}
        {draft.config.pagination.type === "nextLink" ? (
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Next link selector</span>
            <input
              className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 font-mono text-xs"
              value={draft.config.pagination.nextSelector}
              onChange={(e) =>
                patchPagination({
                  type: "nextLink",
                  nextSelector: e.target.value,
                })
              }
            />
          </label>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          checked={draft.config.stop.onKnownEntry}
          onChange={(e) =>
            patchConfig({ stop: { onKnownEntry: e.target.checked } })
          }
        />
        Stop pagination when a known DB entry appears on a page
      </label>

      <FieldRuleRows
        fields={draft.config.fields}
        onChange={(fields) => patchConfig({ fields })}
      />
    </div>
  );
}
