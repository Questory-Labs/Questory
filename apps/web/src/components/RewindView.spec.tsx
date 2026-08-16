import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RewindView } from "./RewindView";

vi.mock("@questorylabs/qhttp/react", () => ({
  useResource: (opts: { id: unknown[]; when?: boolean }) => {
    const key = Array.isArray(opts.id) ? String(opts.id[0]) : "";
    if (key === "me") {
      return {
        value: {
          entitlements: { recommendations: false, rewindAi: false },
        },
      };
    }
    return {
      value: null,
      busy: false,
      error: null,
      refreshing: false,
      reload: vi.fn(),
    };
  },
}));

vi.mock("@/lib/music", () => ({
  musicFetch: vi.fn(),
}));
vi.mock("@/lib/watch", () => ({
  watchFetch: vi.fn(),
}));
vi.mock("@/lib/read", () => ({
  readFetch: vi.fn(),
}));

describe("RewindView AI gate", () => {
  it("hides AI insights when rewindAi is not entitled", () => {
    render(<RewindView domain="music" />);
    expect(screen.queryByText("AI Insights")).toBeNull();
    expect(screen.getByText("Music Rewind")).toBeInTheDocument();
  });
});
