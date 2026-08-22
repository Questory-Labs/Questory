import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListPager } from "./ListPager";

describe("ListPager", () => {
  afterEach(cleanup);

  it("hides when the list fits on one page", () => {
    render(
      <ListPager page={1} total={5} pageSize={15} onPageChange={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("pages forward and back", () => {
    const onPageChange = vi.fn();
    render(
      <ListPager
        page={2}
        total={40}
        pageSize={15}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
