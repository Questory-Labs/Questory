import { describe, expect, it } from "vitest";
import {
  QUESTORY_PROFILE_FORMAT,
  QUESTORY_PROFILE_VERSION,
  QuestoryProfileArchiveSchema,
} from "./profile-archive";

const minimal = {
  format: QUESTORY_PROFILE_FORMAT,
  version: QUESTORY_PROFILE_VERSION,
  exportedAt: "2026-08-29T12:00:00.000Z",
};

describe("QuestoryProfileArchiveSchema", () => {
  it("accepts a minimal v1 archive", () => {
    const parsed = QuestoryProfileArchiveSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.library).toEqual([]);
    expect(parsed.data.music.listens).toEqual([]);
    expect(parsed.data.services).toEqual([]);
  });

  it("rejects the wrong format name", () => {
    const parsed = QuestoryProfileArchiveSchema.safeParse({
      ...minimal,
      format: "other.profile",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unsupported version", () => {
    const parsed = QuestoryProfileArchiveSchema.safeParse({
      ...minimal,
      version: 2,
    });
    expect(parsed.success).toBe(false);
  });
});
