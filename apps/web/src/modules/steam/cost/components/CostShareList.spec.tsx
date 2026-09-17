import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CostShareList } from "./CostShareList";

describe("CostShareList", () => {
  afterEach(cleanup);

  it("renders nothing when there are no rows", () => {
    const { container } = render(
      <CostShareList title="Genre" rows={[]} currency="USD" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows full names instead of a truncated chart axis", () => {
    render(
      <CostShareList
        title="Genre"
        rows={[
          { name: "Action", amount: 80 },
          { name: "Strategy", amount: 20 },
        ]}
        currency="USD"
      />,
    );
    expect(screen.getByText("Genre")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
  });
});
