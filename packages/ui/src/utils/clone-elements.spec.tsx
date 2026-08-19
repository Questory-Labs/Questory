import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { cloneElements } from "./clone-elements";

function Probe({
  label,
  value,
  extra,
}: {
  label: string;
  value?: string;
  extra?: string;
}) {
  return (
    <span data-testid={label} data-extra={extra}>
      {value ?? "none"}
    </span>
  );
}

function Controller({
  children,
  value,
}: {
  children: ReactNode;
  value: string;
}) {
  return cloneElements(children, { value });
}

describe("cloneElements", () => {
  it("populates props on a single child", () => {
    render(<>{cloneElements(<Probe label="single" />, { value: "injected" })}</>);
    expect(screen.getByTestId("single")).toHaveTextContent("injected");
  });

  it("populates props on every child", () => {
    render(
      <>
        {cloneElements(
          [<Probe key="one" label="many-one" />, <Probe key="two" label="many-two" />],
          { value: "injected" },
        )}
      </>,
    );
    expect(screen.getByTestId("many-one")).toHaveTextContent("injected");
    expect(screen.getByTestId("many-two")).toHaveTextContent("injected");
  });

  it("lets a controller populate a view", () => {
    render(
      <Controller value="from-controller">
        <Probe label="controller-view" />
      </Controller>,
    );
    expect(screen.getByTestId("controller-view")).toHaveTextContent(
      "from-controller",
    );
  });

  it("lets a controller populate multiple views", () => {
    render(
      <Controller value="shared">
        <Probe label="controller-header" extra="kept" />
        <Probe label="controller-list" />
      </Controller>,
    );
    expect(screen.getByTestId("controller-header")).toHaveTextContent("shared");
    expect(screen.getByTestId("controller-header")).toHaveAttribute(
      "data-extra",
      "kept",
    );
    expect(screen.getByTestId("controller-list")).toHaveTextContent("shared");
  });

  it("unwraps fragments so nested views still receive props", () => {
    render(
      <Controller value="from-controller">
        <>
          <Probe label="fragment-a" />
          <Probe label="fragment-b" />
        </>
      </Controller>,
    );
    expect(screen.getByTestId("fragment-a")).toHaveTextContent(
      "from-controller",
    );
    expect(screen.getByTestId("fragment-b")).toHaveTextContent(
      "from-controller",
    );
  });

  it("leaves non-element children unchanged", () => {
    render(
      <p>
        {cloneElements(
          ["plain", null, <Probe key="el" label="mixed-el" />],
          { value: "injected" },
        )}
      </p>,
    );
    expect(screen.getByText("plain", { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId("mixed-el")).toHaveTextContent("injected");
  });
});
