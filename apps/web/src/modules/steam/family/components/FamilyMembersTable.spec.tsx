import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FamilyMemberSummary } from "@questorylabs/shared";
import { FamilyMembersTable } from "./FamilyMembersTable";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

const owner: FamilyMemberSummary = {
  steamId: "76561198000000001",
  personaName: "Sam",
  librarySize: 5,
  isMe: true,
  role: "owner",
};

const guest: FamilyMemberSummary = {
  steamId: "76561198000000002",
  personaName: "Alex",
  librarySize: 3,
  isMe: false,
  role: "member",
};

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("FamilyMembersTable", () => {
  afterEach(cleanup);

  it("does not offer remove on the owner row", () => {
    wrap(
      <FamilyMembersTable
        members={[owner]}
        money={(n) => String(n ?? "—")}
      />,
    );
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(screen.getByText("Sam (me)")).toBeInTheDocument();
  });

  it("confirms before removing a member", () => {
    wrap(
      <FamilyMembersTable
        members={[owner, guest]}
        money={(n) => String(n ?? "—")}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Remove family member?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Remove Alex from the family/)).toBeInTheDocument();
  });
});
