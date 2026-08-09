import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAddUserDialog } from "./AdminAddUserDialog";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function renderDialog(open = true) {
  const qc = new ResourceStore({ retries: false });

  return render(
    <ResourceProvider store={qc}>
      <AdminAddUserDialog
        open={open}
        onClose={vi.fn()}
        onMessage={vi.fn()}
      />
    </ResourceProvider>,
  );
}

describe("AdminAddUserDialog", () => {
  it("renders username, email, and password fields", () => {
    renderDialog();

    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables create when the form is valid", () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password1234" },
    });

    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });
});
