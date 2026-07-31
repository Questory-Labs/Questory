import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <AdminAddUserDialog
        open={open}
        onClose={vi.fn()}
        onMessage={vi.fn()}
      />
    </QueryClientProvider>,
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
