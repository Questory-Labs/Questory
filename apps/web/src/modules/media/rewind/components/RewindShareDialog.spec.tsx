import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { RewindShareDialog } from "./RewindShareDialog";

vi.mock("@/lib/api", () => ({ api: vi.fn() }));

import { api } from "@/lib/api";

const mockedApi = vi.mocked(api);

function wrap() {
  const store = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={store}>
      <RewindShareDialog domain="games" period="2026-09" />
    </ResourceProvider>,
  );
}

describe("RewindShareDialog", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedApi.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/rewind/shares" && init?.method === "POST") {
        return {
          id: "s1",
          domain: "games",
          period: "2026-09",
          tokenPrefix: "abcdefgh",
          theme: null,
          includesAi: true,
          viewCount: 0,
          createdAt: "2026-10-01T00:00:00.000Z",
          url: "https://q.example/share/rewind/abcdefghTOKEN",
          token: "abcdefghTOKEN",
        };
      }
      if (path === "/rewind/shares") return { items: [] };
      if (path === "/rewind/badges") return { items: [] };
      if (init?.method === "DELETE") return { ok: true };
      throw new Error(`unexpected ${path}`);
    });
  });
  afterEach(cleanup);

  it("does not fetch until opened, then creates a link with the AI flag", async () => {
    wrap();
    expect(mockedApi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Share link" }));
    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/rewind/shares"));
    fireEvent.click(screen.getByLabelText(/Include the AI rewind text/));
    fireEvent.click(screen.getByRole("button", { name: "Create share link" }));
    await waitFor(() =>
      expect(screen.getByDisplayValue("https://q.example/share/rewind/abcdefghTOKEN")).toBeInTheDocument(),
    );
    const post = mockedApi.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(post[1]!.body as string)).toMatchObject({
      domain: "games",
      period: "2026-09",
      includeAi: true,
    });
  });

  it("asks for confirmation before revoking", async () => {
    mockedApi.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/rewind/shares" && !init?.method) {
        return {
          items: [
            {
              id: "s9",
              domain: "games",
              period: "2026-09",
              tokenPrefix: "zzzzzzzz",
              theme: null,
              includesAi: false,
              viewCount: 3,
              createdAt: "2026-10-01T00:00:00.000Z",
              url: "https://q.example/share/rewind/zzzzzzzz…",
            },
          ],
        };
      }
      if (path === "/rewind/badges") return { items: [] };
      if (init?.method === "DELETE") return { ok: true };
      throw new Error(`unexpected ${path}`);
    });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: "Share link" }));
    const revokeButton = await screen.findByRole("button", { name: "Revoke" });
    fireEvent.click(revokeButton);
    expect(screen.getByText("Revoke share link?")).toBeInTheDocument();
    expect(mockedApi.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    fireEvent.click(screen.getAllByRole("button", { name: "Revoke" }).at(-1)!);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/rewind/shares/s9", { method: "DELETE" }),
    );
  });
});
