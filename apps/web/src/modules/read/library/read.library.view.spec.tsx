import { cleanup, render, screen } from "@testing-library/react";
import type { ReadLibraryPage } from "@questorylabs/shared";
import { afterEach, describe, expect, it } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { ReadLibraryView } from "./read.library.view";
import type { ReadLibraryViewProps } from "./read.library.types";

const library: ReadLibraryPage = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [
    {
      id: "i1",
      listStatus: "reading",
      score: 8,
      progressChapters: 12,
      progressVolumes: 2,
      listedAt: null,
      title: {
        id: "t1",
        name: "Berserk",
        format: "manga",
        category: "manga",
        coverUrl: null,
        chapters: 40,
        volumes: 10,
        year: 1989,
        genres: [],
      },
    },
  ],
};

const renderView = (patch: Partial<ReadLibraryViewProps> = {}) =>
  render(
    <ReadLibraryView
      {...({
        library: mockResource({ empty: false, failed: false, value: library }),
        page: 1,
        setPage: () => {},
        status: "",
        setStatus: () => {},
        format: "",
        setFormat: () => {},
        category: "",
        setCategory: () => {},
        qDraft: "",
        setQDraft: () => {},
        onSearch: () => {},
        ...patch,
      } as ReadLibraryViewProps)}
    />,
  );

describe("ReadLibraryView", () => {
  afterEach(cleanup);

  it("shows an error when library failed", () => {
    renderView({
      library: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load library.")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no items", () => {
    renderView({
      library: mockResource({
        empty: false,
        failed: false,
        value: { total: 0, page: 1, pageSize: 15, items: [] },
      }),
    });
    expect(screen.getByText("No titles yet")).toBeInTheDocument();
  });

  it("renders titles when ready", () => {
    renderView();
    expect(screen.getByText("Berserk")).toBeInTheDocument();
  });
});
