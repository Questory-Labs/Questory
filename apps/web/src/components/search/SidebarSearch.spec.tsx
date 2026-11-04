import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GlobalSearchProvider, useGlobalSearch } from "./GlobalSearchProvider";
import { SidebarSearch } from "./SidebarSearch";

const OpenState = () => <span data-testid="state">{String(useGlobalSearch().open)}</span>;

describe("SidebarSearch", () => {
  afterEach(cleanup);

  it("opens the command palette", () => {
    render(
      <GlobalSearchProvider>
        <SidebarSearch />
        <OpenState />
      </GlobalSearchProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(screen.getByTestId("state")).toHaveTextContent("true");
  });
});
