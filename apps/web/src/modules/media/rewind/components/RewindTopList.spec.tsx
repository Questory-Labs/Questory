import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RewindCategory } from "../media.rewind.summary.types";
import { RewindTopList } from "./RewindTopList";

const row = (imageUrl: string | null, id = "a") => [
  { id, name: "Host", value: "1 watches", subtitle: "movie", imageUrl },
];

const placeholder = (container: HTMLElement) =>
  container.querySelector("[data-placeholder]")?.getAttribute("data-placeholder") ?? null;

const variantsFor = (category: RewindCategory) => {
  const items = Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    name: `Item ${i}`,
    value: "1",
    imageUrl: null,
  }));
  const { container } = render(<RewindTopList title="Top" category={category} items={items} />);
  const names = Array.from(container.querySelectorAll("[data-placeholder]")).map((node) =>
    node.getAttribute("data-placeholder"),
  );
  cleanup();
  return new Set(names);
};

describe("RewindTopList", () => {
  afterEach(cleanup);

  it("shows an animated placeholder when an item has no image", () => {
    const { container } = render(
      <RewindTopList title="Top watched" category="watch" items={row(null)} />,
    );
    expect(placeholder(container)).toMatch(/^watch-/);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-placeholder] [class*='q-']")).not.toBeNull();
    expect(screen.getByText("Host")).toBeInTheDocument();
  });

  it("keeps the placeholder until the image loads, then removes it", () => {
    const { container } = render(
      <RewindTopList title="Top watched" category="watch" items={row("/a.png")} />,
    );
    expect(placeholder(container)).not.toBeNull();
    fireEvent.load(container.querySelector("img")!);
    expect(placeholder(container)).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("falls back to the placeholder when the image fails", () => {
    const { container } = render(
      <RewindTopList title="Top watched" category="watch" items={row("/a.png")} />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(placeholder(container)).not.toBeNull();
  });

  it.each(["games", "music", "watch", "read"] as const)(
    "picks between all %s variants, only from that category",
    (category) => {
      const names = variantsFor(category);
      expect(names.size).toBe(4);
      for (const name of names) expect(name).toMatch(new RegExp(`^${category}-`));
    },
  );

  it("retries the image when an item's source changes after a failure", () => {
    const { container, rerender } = render(
      <RewindTopList title="Top" category="games" items={row("https://img.test/a.png")} />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    rerender(<RewindTopList title="Top" category="games" items={row("https://img.test/b.png")} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.test/b.png");
  });

  it("keeps the same variant for the same item across renders", () => {
    const first = render(<RewindTopList title="Top" category="read" items={row(null, "x9")} />);
    const initial = placeholder(first.container);
    first.rerender(<RewindTopList title="Top" category="read" items={row(null, "x9")} />);
    expect(placeholder(first.container)).toBe(initial);
    cleanup();
    const second = render(<RewindTopList title="Top" category="read" items={row(null, "x9")} />);
    expect(placeholder(second.container)).toBe(initial);
  });
});
