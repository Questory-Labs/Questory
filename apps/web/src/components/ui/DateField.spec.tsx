import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateField } from "./DateField";

describe("DateField", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens a calendar and picks a day without using a native date input", () => {
    const onChange = vi.fn();
    render(<DateField label="Date" value="2026-08-16" onChange={onChange} />);

    expect(screen.queryByDisplayValue("2026-08-16")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-08-01" }));

    expect(onChange).toHaveBeenCalledWith("2026-08-01");
    expect(screen.queryByRole("dialog", { name: "Choose date" })).not.toBeInTheDocument();
  });

  it("pages months from the calendar header", () => {
    const onChange = vi.fn();
    render(<DateField label="Date" value="2026-08-16" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-09-02" }));

    expect(onChange).toHaveBeenCalledWith("2026-09-02");
  });

  it("jumps to a month from the month grid", () => {
    const onChange = vi.fn();
    render(<DateField label="Date" value="2026-08-16" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose month" }));
    fireEvent.click(screen.getByRole("button", { name: "January" }));
    fireEvent.click(screen.getByRole("button", { name: "2026-01-05" }));

    expect(onChange).toHaveBeenCalledWith("2026-01-05");
  });

  it("jumps to a year from the year list", () => {
    const onChange = vi.fn();
    render(<DateField label="Date" value="2026-08-16" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose year" }));
    fireEvent.click(screen.getByRole("button", { name: "Year 2019" }));
    fireEvent.click(screen.getByRole("button", { name: "2019-08-04" }));

    expect(onChange).toHaveBeenCalledWith("2019-08-04");
  });
});
