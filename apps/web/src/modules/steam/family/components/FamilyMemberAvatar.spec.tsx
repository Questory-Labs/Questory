import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MEMBER_AVATAR_GRADIENTS } from "../steam.family.constants";
import { FamilyMemberAvatar } from "./FamilyMemberAvatar";

describe("FamilyMemberAvatar", () => {
  afterEach(() => cleanup());

  it("renders the avatar image when present", () => {
    const { container } = render(
      <FamilyMemberAvatar name="Sam" avatarUrl="https://x/a.png" index={0} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://x/a.png");
  });

  it("falls back to an initial on a cycled gradient", () => {
    const { container } = render(
      <FamilyMemberAvatar name=" alex" index={MEMBER_AVATAR_GRADIENTS.length + 1} size="sm" />,
    );
    const el = container.querySelector("span")!;
    expect(el).toHaveTextContent("A");
    expect(el.className).toContain(MEMBER_AVATAR_GRADIENTS[1].split(" ")[0]);
    expect(el.className).toContain("h-5");
  });
});
