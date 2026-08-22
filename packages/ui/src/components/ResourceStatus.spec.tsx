import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResourceStatus } from "./ResourceStatus";

afterEach(cleanup);

describe("ResourceStatus", () => {
  it("renders error when failed, even if empty", () => {
    render(
      <ResourceStatus
        failed
        empty
        loading={<span>loading</span>}
        error={<span>error</span>}
      >
        <span>ready</span>
      </ResourceStatus>,
    );
    expect(screen.getByText("error")).toBeInTheDocument();
    expect(screen.queryByText("loading")).not.toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();
  });

  it("renders loading when empty and not failed", () => {
    render(
      <ResourceStatus
        failed={false}
        empty
        loading={<span>loading</span>}
        error={<span>error</span>}
      >
        <span>ready</span>
      </ResourceStatus>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();
  });

  it("renders children when ready", () => {
    render(
      <ResourceStatus
        failed={false}
        empty={false}
        loading={<span>loading</span>}
        error={<span>error</span>}
      >
        <span>ready</span>
      </ResourceStatus>,
    );
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.queryByText("loading")).not.toBeInTheDocument();
    expect(screen.queryByText("error")).not.toBeInTheDocument();
  });
});
