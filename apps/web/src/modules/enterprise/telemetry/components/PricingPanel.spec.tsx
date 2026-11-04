import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseActionResult } from "@questorylabs/qhttp/react";
import { mockResource } from "@/test/resource-mock";
import type { OtelModelPricing, OtelPricing } from "@/lib/enterprise-api";
import { PricingEditor, PricingSummary } from "./PricingPanel";

const rows: OtelModelPricing[] = [
  { model: "gpt-x", input: 2, output: 8, cached: 0.5, reasoning: 0 },
];

const idleSave = {
  submit: vi.fn(),
  busy: false,
  failed: false,
  error: null,
} as unknown as UseActionResult<OtelPricing, OtelModelPricing[]>;

describe("PricingSummary", () => {
  afterEach(cleanup);

  it("lists input and output rates per model", () => {
    render(
      <PricingSummary
        pricing={mockResource<OtelPricing>({
          empty: false,
          failed: false,
          value: { models: rows },
        })}
        pricingOpen={false}
        setPricingOpen={() => undefined}
        pricingRows={rows}
      />,
    );
    expect(screen.getByText("gpt-x")).toBeInTheDocument();
    expect(screen.getByText("$2.00 / $8.00")).toBeInTheDocument();
  });

  it("shows the failure before the empty state", () => {
    render(
      <PricingSummary
        pricing={mockResource<OtelPricing>({ empty: true, failed: true })}
        pricingOpen={false}
        setPricingOpen={() => undefined}
        pricingRows={[]}
      />,
    );
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Loading rates…")).not.toBeInTheDocument();
  });

  it("shows an empty message when no rates exist", () => {
    render(
      <PricingSummary
        pricing={mockResource<OtelPricing>({
          empty: false,
          failed: false,
          value: { models: [] },
        })}
        pricingOpen={false}
        setPricingOpen={() => undefined}
        pricingRows={[]}
      />,
    );
    expect(screen.getByText("No rates set.")).toBeInTheDocument();
  });
});

describe("PricingEditor", () => {
  afterEach(cleanup);

  const renderEditor = (patch: Record<string, unknown> = {}) => {
    const props = {
      pricing: mockResource<OtelPricing>({
        empty: false,
        failed: false,
        value: { models: rows },
      }),
      pricingRows: rows,
      updatePricingRow: vi.fn(),
      newModel: "",
      setNewModel: vi.fn(),
      setPricingDraft: vi.fn(),
      pricingDraft: null,
      savePricing: idleSave,
      ...patch,
    };
    render(<PricingEditor {...props} />);
    return props;
  };

  it("edits, removes and saves rates", () => {
    const props = renderEditor();
    fireEvent.change(screen.getByLabelText("input 1"), {
      target: { value: "3" },
    });
    expect(props.updatePricingRow).toHaveBeenCalledWith(0, "input", "3");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(props.setPricingDraft).toHaveBeenCalledWith([]);
    fireEvent.click(screen.getByRole("button", { name: "Save rates" }));
    expect(idleSave.submit).toHaveBeenCalledWith(rows);
  });

  it("adds a new model and skips duplicates", () => {
    const props = renderEditor({ newModel: " new-model " });
    fireEvent.click(screen.getByRole("button", { name: "Add model" }));
    expect(props.setPricingDraft).toHaveBeenCalledWith([
      ...rows,
      { model: "new-model", input: 0, output: 0, cached: 0, reasoning: 0 },
    ]);
    cleanup();
    const dup = renderEditor({ newModel: "gpt-x" });
    fireEvent.click(screen.getByRole("button", { name: "Add model" }));
    expect(dup.setPricingDraft).not.toHaveBeenCalled();
    expect(dup.setNewModel).toHaveBeenCalledWith("");
  });

  it("offers reset only with a draft", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
    cleanup();
    const props = renderEditor({ pricingDraft: rows });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(props.setPricingDraft).toHaveBeenCalledWith(null);
  });
});
