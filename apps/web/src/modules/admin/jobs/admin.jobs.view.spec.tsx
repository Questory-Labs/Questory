import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminJobsView } from "./admin.jobs.view";
import type { AdminJobsViewProps } from "./admin.jobs.types";

vi.mock("../cron/admin.cron.controller", () => ({
  AdminCronController: () => <div>cron body</div>,
}));
vi.mock("../scrapers/admin.scrapers.controller", () => ({
  AdminScrapersController: () => <div>scrapers body</div>,
}));
vi.mock("../enrichment/admin.enrichment.controller", () => ({
  AdminEnrichmentController: () => <div>enrichment body</div>,
}));

const renderView = (patch: Partial<AdminJobsViewProps>) =>
  render(
    <AdminJobsView
      {...({
        tab: "cron",
        setTab: () => undefined,
        ...patch,
      } as AdminJobsViewProps)}
    />,
  );

describe("AdminJobsView", () => {
  afterEach(cleanup);

  it("renders the header and the scheduled tab body", () => {
    renderView({});
    expect(screen.getByText("quietly running")).toBeInTheDocument();
    expect(screen.getByText("cron body")).toBeInTheDocument();
    expect(screen.queryByText("scrapers body")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scheduled" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders the selected tab body", () => {
    renderView({ tab: "enrichment" });
    expect(screen.getByText("enrichment body")).toBeInTheDocument();
    expect(screen.queryByText("cron body")).not.toBeInTheDocument();
  });

  it("switches tabs through setTab", () => {
    const setTab = vi.fn();
    renderView({ setTab });
    fireEvent.click(screen.getByRole("button", { name: "Scrapers" }));
    expect(setTab).toHaveBeenCalledWith("scrapers");
  });
});
