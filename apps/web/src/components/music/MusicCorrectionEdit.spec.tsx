import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicCorrectionEdit } from "./MusicCorrectionEdit";

vi.mock("@/lib/music", () => ({
  musicFetch: vi.fn(),
}));

import { musicFetch } from "@/lib/music";

const form = {
  kind: "track" as const,
  original: {
    title: "Shubhaarambh (From \"Kai Po Che\")",
    artistName: "Amit Trivedi, Shreya Ghoshal",
    albumTitle: "Kai Po Che (Original Motion Picture Soundtrack)",
  },
  current: {
    title: "Shubhaarambh (From \"Kai Po Che\")",
    displayName: null,
    artists: [
      { id: "combined", name: "Amit Trivedi, Shreya Ghoshal" },
    ],
    albumTitle: "Kai Po Che (Original Motion Picture Soundtrack)",
    albumId: "r1",
  },
  hasRule: false,
  sourceListenCount: 1,
};

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("MusicCorrectionEdit", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(musicFetch).mockReset();
    vi.mocked(musicFetch).mockImplementation(async (path: string) => {
      if (String(path).startsWith("/corrections/tracks/")) return form;
      if (String(path).startsWith("/catalog/suggest")) return { items: [] };
      throw new Error(`unexpected ${path}`);
    });
  });

  it("splits Edit and Merge into tabs and posts individual artists", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    const onMerge = vi.fn().mockResolvedValue({ trackId: "t2" });

    wrap(
      <MusicCorrectionEdit
        kind="track"
        entityId="t1"
        onSave={onSave}
        onMerge={onMerge}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Edit" })).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: "Merge" })).toBeInTheDocument();
    expect(
      screen.getByText("This track will appear under all of them", {
        exact: false,
      }),
    ).toBeInTheDocument();

    const individual = screen.getByPlaceholderText(
      "Enter each artist one by one…",
    );
    fireEvent.change(individual, { target: { value: "Amit Trivedi" } });
    fireEvent.keyDown(individual, { key: "Enter" });
    fireEvent.change(individual, { target: { value: "Shreya Ghoshal" } });
    fireEvent.keyDown(individual, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        artists: [
          { id: undefined, name: "Amit Trivedi" },
          { id: undefined, name: "Shreya Ghoshal" },
        ],
      });
    });
  });

  it("shows merge search on the Merge tab", async () => {
    wrap(
      <MusicCorrectionEdit
        kind="track"
        entityId="t1"
        onSave={vi.fn()}
        onMerge={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Merge" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Merge" }));
    expect(screen.getByPlaceholderText("Search your tracks…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Merge" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
