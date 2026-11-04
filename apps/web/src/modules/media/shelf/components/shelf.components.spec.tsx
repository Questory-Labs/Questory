import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PillSelect } from "./PillSelect";
import { PosterThumb } from "./PosterThumb";
import { RatingDots } from "./RatingDots";
import { ShelfBars } from "./ShelfBars";
import { deltaTone, ShelfKpiTile } from "./ShelfKpiTile";
import { ShelfRankList } from "./ShelfRankList";
import { ShelfSearchField } from "./ShelfSearchField";
import { ShelfSection } from "./ShelfSection";
import { ShelfShareList } from "./ShelfShareList";
import { ShelfEmpty, ShelfStatus } from "./ShelfStatus";

describe("shelf components", () => {
  afterEach(cleanup);

  it("PillSelect reports the chosen value", () => {
    const onChange = vi.fn();
    render(
      <PillSelect
        label="Sort"
        value="a"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("PosterThumb renders an image when a url exists", () => {
    const { container } = render(<PosterThumb url="https://x/p.jpg" seed="s" alt="Poster" />);
    expect(screen.getByRole("img", { name: "Poster" })).toHaveAttribute("src", "https://x/p.jpg");
    cleanup();
    const fallback = render(<PosterThumb url={null} seed="s" />);
    expect(fallback.container.querySelector("img")).toBeNull();
    expect(container).toBeTruthy();
  });

  it("RatingDots labels the rating and hides without one", () => {
    const { rerender, container } = render(<RatingDots rating={4} accent="red" />);
    expect(screen.getByRole("img", { name: "Rated 4 of 5" })).toBeInTheDocument();
    rerender(<RatingDots rating={null} accent="red" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ShelfBars marks the peak bar", () => {
    const { container } = render(
      <ShelfBars
        ariaLabel="Per hour"
        accent="red"
        items={[
          { label: "a", count: 1 },
          { label: "b", count: 5 },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Per hour" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-peak]")).toHaveLength(1);
  });

  it("ShelfKpiTile shows label, value, unit and note", () => {
    render(<ShelfKpiTile label="Hours" value="12" unit=" h" note="+3" tone="ok" />);
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("+3")).toHaveClass("text-[var(--ok)]");
    expect(deltaTone(-1)).toBe("danger");
    expect(deltaTone(null)).toBe("muted");
  });

  it("ShelfRankList numbers links", () => {
    render(<ShelfRankList items={[{ id: "1", href: "/t/1", name: "One", value: 9 }]} />);
    expect(screen.getByRole("link", { name: /01\s*One\s*9/ })).toHaveAttribute("href", "/t/1");
  });

  it("ShelfSearchField submits", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<ShelfSearchField label="Search" value="" placeholder="Find" onChange={onChange} onSubmit={onSubmit} />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(onChange).toHaveBeenCalledWith("x");
    expect(onSubmit).toHaveBeenCalled();
  });

  it("ShelfSection labels its section and renders a link", () => {
    render(
      <ShelfSection id="s1" title="Formats" link={{ href: "/x", label: "Manage" }}>
        body
      </ShelfSection>,
    );
    expect(screen.getByRole("region", { name: "Formats" })).toHaveTextContent("body");
    expect(screen.getByRole("link", { name: /Manage/ })).toHaveAttribute("href", "/x");
  });

  it("ShelfShareList renders both variants", () => {
    const items = [{ key: "a", label: "Manga", count: 3, pct: 75 }];
    const { rerender } = render(<ShelfShareList items={items} accent="red" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    rerender(<ShelfShareList items={items} accent="red" variant="dot" />);
    expect(screen.getByText("Manga")).toBeInTheDocument();
  });

  it("ShelfStatus shows the error before content", () => {
    const { rerender } = render(
      <ShelfStatus res={{ failed: true, empty: true }} error="Broke">
        ok
      </ShelfStatus>,
    );
    expect(screen.getByText("Broke")).toBeInTheDocument();
    rerender(
      <ShelfStatus res={{ failed: false, empty: false }} error="Broke">
        <ShelfEmpty>nothing</ShelfEmpty>
      </ShelfStatus>,
    );
    expect(screen.getByText("nothing")).toBeInTheDocument();
  });
});
