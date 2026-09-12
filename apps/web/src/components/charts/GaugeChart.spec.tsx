import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GaugeChart } from "./GaugeChart";
import { SketchDonut } from "./SketchDonut";
import { Sparkline } from "./Sparkline";

describe("GaugeChart", () => {
  afterEach(() => cleanup());

  it("requires an accessible name", () => {
    render(
      <GaugeChart value={3} max={10} ariaLabel="Near completion" label="3 of 10" />,
    );
    expect(screen.getByRole("img", { name: "Near completion" })).toBeInTheDocument();
  });
});

describe("SketchDonut", () => {
  afterEach(() => cleanup());

  it("renders a legend with the required aria label", () => {
    render(
      <SketchDonut
        ariaLabel="Library mix"
        data={[
          { name: "Played", value: 8, color: "#7dd3c0" },
          { name: "Unplayed", value: 2, color: "#8a7f9a" },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Library mix" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("Played: 8");
    expect(screen.getByRole("list")).toHaveTextContent("Unplayed: 2");
  });

  it("draws each slice as a single closed path", () => {
    const { container } = render(
      <SketchDonut
        ariaLabel="Library mix"
        data={[
          { name: "Played", value: 8, color: "#7dd3c0" },
          { name: "Unplayed", value: 2, color: "#8a7f9a" },
        ]}
      />,
    );
    const paths = [...container.querySelectorAll("path")];
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      const d = path.getAttribute("d") ?? "";
      expect(d.match(/M /g)).toHaveLength(1);
      expect(d.endsWith("Z")).toBe(true);
    }
  });

  it("renders an optional center label in the hole", () => {
    render(
      <SketchDonut
        ariaLabel="Library mix"
        center="80%"
        centerCaption="played"
        data={[
          { name: "Played", value: 8, color: "#7dd3c0" },
          { name: "Unplayed", value: 2, color: "#8a7f9a" },
        ]}
      />,
    );
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("played")).toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  afterEach(() => cleanup());

  it("renders a polyline with an accessible name", () => {
    render(
      <Sparkline data={[1, 4, 2, 8]} ariaLabel="Listens this week" />,
    );
    expect(
      screen.getByRole("img", { name: "Listens this week" }),
    ).toBeInTheDocument();
  });
});
