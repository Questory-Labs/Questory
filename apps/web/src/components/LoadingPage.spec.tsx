import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingPage } from "./LoadingPage";

describe("LoadingPage", () => {
  it("renders loading status and quest-log copy", () => {
    render(
      <LoadingPage
        layout="embedded"
        title="Syncing your quest log"
        logLine="quest log › hydrate — status: in_progress"
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Syncing your quest log" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("quest log › hydrate — status: in_progress"),
    ).toBeInTheDocument();
  });
});
