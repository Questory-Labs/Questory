import { render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { describe, expect, it, vi } from "vitest";
import { MultiScrobblerCard } from "./MultiScrobblerCard";

vi.mock("@/lib/music", () => ({
  getMusicUrl: () => "http://api.test",
}));

vi.mock("@/components/ApiKeyPanel", () => ({
  ApiKeyPanel: () => <div>ingest-key-panel</div>,
}));

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("MultiScrobblerCard", () => {
  it("locks ingest while native scrobbling is on", () => {
    wrap(<MultiScrobblerCard active={true} nativeLocked={true} />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(
      screen.getByText(/native Last.fm scrobbling is on/),
    ).toBeInTheDocument();
    expect(screen.queryByText("ingest-key-panel")).not.toBeInTheDocument();
  });

  it("shows the ingest key panel when native scrobbling is off", () => {
    wrap(<MultiScrobblerCard active={true} nativeLocked={false} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("ingest-key-panel")).toBeInTheDocument();
  });
});
