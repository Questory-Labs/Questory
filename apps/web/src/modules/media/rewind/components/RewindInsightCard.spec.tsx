import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { generateCardTheme } from "../media.rewind.utils";
import { PATTERN_KINDS, type PatternKind } from "../media.rewind.types";
import { RewindInsightCard } from "./RewindInsightCard";

const themeForPattern = (kind: PatternKind) => {
  const base = generateCardTheme("music", 0);
  return {
    ...base,
    pattern: { kind, color: "#ffffff", colorAlt: "#111111", opacity: 0.3 },
  };
};

describe("RewindInsightCard", () => {
  afterEach(cleanup);

  it("applies the theme foreground color to decorations", () => {
    const theme = generateCardTheme("music", 0);
    const { container } = render(
      <RewindInsightCard title="Hours Listened" text="You played **a lot**." theme={theme} />,
    );
    expect(container.querySelector("[data-rewind-decoration]")).toHaveClass("text-white");
  });

  it("does not copy layout classes from theme text onto decorations", () => {
    const theme = {
      ...generateCardTheme("read", 1),
      text: "text-emerald-50 font-serif font-light relative z-10",
      decoration: "orbit-ring" as const,
    };
    const { container } = render(
      <RewindInsightCard title="Hours Listened" text="You played **a lot**." theme={theme} />,
    );
    const decoration = container.querySelector("[data-rewind-decoration]");
    expect(decoration).toHaveClass("text-emerald-50");
    expect(decoration).not.toHaveClass("relative");
    expect(decoration).not.toHaveClass("z-10");
  });

  it("renders title text for each pattern kind", () => {
    for (const kind of PATTERN_KINDS) {
      const { container } = render(
        <RewindInsightCard title="Hours Listened" text="You played **a lot**." theme={themeForPattern(kind)} />,
      );
      expect(screen.getByText("Hours Listened")).toBeInTheDocument();
      expect(screen.getByText("a lot")).toBeInTheDocument();
      expect(container.querySelector(`[data-rewind-pattern="${kind}"]`)).toBeTruthy();
      cleanup();
    }
  });
});
