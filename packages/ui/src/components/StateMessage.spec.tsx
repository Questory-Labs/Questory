import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StateMessage } from "./StateMessage";

describe("StateMessage", () => {
  it("renders an error label and children", () => {
    render(<StateMessage variant="error">Could not load.</StateMessage>);
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Could not load.")).toBeInTheDocument();
  });

  it("renders a loading label", () => {
    render(<StateMessage variant="loading">Hang on.</StateMessage>);
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Hang on.")).toBeInTheDocument();
  });
});
