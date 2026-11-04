"use client";

import { MEMBER_AVATAR_GRADIENTS } from "../steam.family.constants";

export const FamilyMemberAvatar = ({
  name,
  avatarUrl,
  index,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  index: number;
  size?: "sm" | "md";
}) => {
  const box = size === "sm" ? "h-5 w-5 text-[9px]" : "h-[30px] w-[30px] text-xs";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={`${box} shrink-0 rounded-full object-cover`} />
    );
  }
  const gradient = MEMBER_AVATAR_GRADIENTS[index % MEMBER_AVATAR_GRADIENTS.length];
  return (
    <span
      aria-hidden="true"
      className={`${box} ${gradient} grid shrink-0 place-items-center rounded-full font-medium text-[var(--ink)]`}
    >
      {(name.trim()[0] || "?").toUpperCase()}
    </span>
  );
};
