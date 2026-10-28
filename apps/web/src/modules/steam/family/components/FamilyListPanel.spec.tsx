import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FamilyListPanel } from "./FamilyListPanel";

describe("FamilyListPanel", () => {
  afterEach(() => cleanup());

  it("renders clickable and static rows with a footer", () => {
    const onClick = vi.fn();
    render(
      <FamilyListPanel
        title="Shareable now"
        description="Owned by one"
        tone="var(--ok)"
        index={1}
        rows={[
          { key: 1, title: "Portal", detail: "Alex → you", onClick },
          { key: 2, title: "Hades", detail: "2 members" },
        ]}
        empty="Nothing yet"
        footer={<p>Footer note</p>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Shareable now" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Portal/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Hades/ })).toBeNull();
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("Footer note")).toBeInTheDocument();
  });

  it("shows the empty text, or the status in place of rows", () => {
    const { rerender } = render(
      <FamilyListPanel title="T" description="D" tone="red" index={0} rows={[]} empty="Nothing yet" />,
    );
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
    rerender(
      <FamilyListPanel
        title="T"
        description="D"
        tone="red"
        index={0}
        rows={[{ key: 1, title: "Portal", detail: "x" }]}
        empty="Nothing yet"
        status={<p>Loading rows</p>}
      />,
    );
    expect(screen.getByText("Loading rows")).toBeInTheDocument();
    expect(screen.queryByText("Portal")).toBeNull();
  });
});
