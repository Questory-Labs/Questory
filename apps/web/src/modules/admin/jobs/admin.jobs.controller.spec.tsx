import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminJobsController } from "./admin.jobs.controller";
import type { AdminJobsViewProps } from "./admin.jobs.types";

const replace = vi.fn();
let search = "tab=scrapers&page=2";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/jobs",
  useSearchParams: () => new URLSearchParams(search),
}));

const Probe = (props: Record<string, unknown>) => {
  const { tab, setTab } = props as AdminJobsViewProps;
  return (
    <button type="button" onClick={() => setTab("enrichment")}>
      {tab}
    </button>
  );
};

describe("AdminJobsController", () => {
  afterEach(() => {
    cleanup();
    replace.mockClear();
  });

  it("reads the tab from the URL and writes changes back", () => {
    render(
      <AdminJobsController>
        <Probe />
      </AdminJobsController>,
    );
    fireEvent.click(screen.getByRole("button", { name: "scrapers" }));
    expect(replace).toHaveBeenCalledWith("/admin/jobs?tab=enrichment&page=2", {
      scroll: false,
    });
  });

  it("falls back to the scheduled tab for unknown values", () => {
    search = "tab=nope";
    render(
      <AdminJobsController>
        <Probe />
      </AdminJobsController>,
    );
    expect(screen.getByRole("button", { name: "cron" })).toBeInTheDocument();
  });
});
