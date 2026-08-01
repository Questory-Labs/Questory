import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RotatingTagline } from "./RotatingTagline";
import { formatTaglineCompact, taglinePool } from "@/lib/status-taglines";

describe("RotatingTagline", () => {
  it("renders a quote with attribution in full variant", () => {
    render(<RotatingTagline context="serverError" rotate={false} />);

    const pool = taglinePool("serverError");
    const attribution = pool.find((t) =>
      screen.queryByText(`— ${t.source}`),
    );
    expect(attribution).toBeDefined();
    for (const line of attribution!.lines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it("renders a one-liner in compact variant", () => {
    const { container } = render(
      <RotatingTagline context="loading" variant="compact" rotate={false} />,
    );

    const pool = taglinePool("loading").map(formatTaglineCompact);
    expect(pool).toContain(container.textContent);
  });
});
