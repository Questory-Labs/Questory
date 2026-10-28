import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminSystemController } from "./admin.system.controller";
import type { AdminSystemViewProps } from "./admin.system.types";

const replace = vi.fn();
let search = "tab=migrations&x=1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/system",
  useSearchParams: () => new URLSearchParams(search),
}));

const Probe = (props: Record<string, unknown>) => {
  const { tab, setTab } = props as AdminSystemViewProps;
  return (
    <button type="button" onClick={() => setTab("settings")}>
      {tab}
    </button>
  );
};

describe("AdminSystemController", () => {
  afterEach(() => {
    cleanup();
    replace.mockClear();
  });

  it("reads the tab from the URL and writes changes back", () => {
    render(
      <AdminSystemController>
        <Probe />
      </AdminSystemController>,
    );
    fireEvent.click(screen.getByRole("button", { name: "migrations" }));
    expect(replace).toHaveBeenCalledWith("/admin/system?tab=settings&x=1", {
      scroll: false,
    });
  });

  it("falls back to settings for unknown values", () => {
    search = "tab=nope";
    render(
      <AdminSystemController>
        <Probe />
      </AdminSystemController>,
    );
    expect(screen.getByRole("button", { name: "settings" })).toBeInTheDocument();
  });
});
