import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MoodBar } from "./MoodBar";

describe("MoodBar", () => {
  afterEach(cleanup);

  it("submits the typed mood", () => {
    const onCurate = vi.fn();
    render(<MoodBar busy={false} onCurate={onCurate} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Mood" }), {
      target: { value: "  I have 45 minutes and want something cozy  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Curate" }));

    expect(onCurate).toHaveBeenCalledWith(
      "I have 45 minutes and want something cozy",
    );
  });

  it("submits undefined for an empty mood (plain curation)", () => {
    const onCurate = vi.fn();
    render(<MoodBar busy={false} onCurate={onCurate} />);
    fireEvent.click(screen.getByRole("button", { name: "Curate" }));
    expect(onCurate).toHaveBeenCalledWith(undefined);
  });

  it("chips fill the input and submit immediately", () => {
    const onCurate = vi.fn();
    render(<MoodBar busy={false} onCurate={onCurate} />);
    fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
    expect(onCurate).toHaveBeenCalledWith("Surprise me");
    expect(screen.getByRole("textbox", { name: "Mood" })).toHaveValue(
      "Surprise me",
    );
  });

  it("disables everything while a job runs", () => {
    render(<MoodBar busy onCurate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Curating…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Mood" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cozy evening" })).toBeDisabled();
  });
});
