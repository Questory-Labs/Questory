"use client";

import type { FamilyInsights } from "@questorylabs/shared";
import { FAMILY_PANEL_ROW_LIMIT } from "../steam.family.constants";
import { shareableLabel } from "../steam.family.utils";
import { FamilyListPanel } from "./FamilyListPanel";

const LinkedNote = ({ count }: { count: number | undefined }) => (
  <p className="mx-1.5 mt-3 text-xs leading-snug text-[var(--faint)]">
    Only members who linked a Questory account share their wishlists
    {count != null ? ` (${count} linked)` : ""}. Other members&apos; Steam
    wishlists aren&apos;t available.
  </p>
);

export const FamilyShareablePanel = ({
  insights,
  setSelectedAppId,
}: {
  insights: FamilyInsights | undefined;
  setSelectedAppId: (appId: number | null) => void;
}) => (
  <FamilyListPanel
    title="Shareable now"
    description="Owned by one member, wanted by another"
    tone="var(--ok)"
    index={6}
    rows={(insights?.shareableNow ?? [])
      .slice(0, FAMILY_PANEL_ROW_LIMIT)
      .map((item) => ({
        key: `${item.appId}-${item.ownerSteamId}-${item.wantedBySteamId}`,
        title: item.name,
        detail: shareableLabel(item),
        onClick: () => setSelectedAppId(item.appId),
      }))}
    empty="Nothing on a linked member's wishlist is owned elsewhere in the family yet."
    footer={<LinkedNote count={insights?.linkedMemberCount} />}
  />
);

export const FamilyWishlistGapsPanel = ({
  insights,
  money,
  setSelectedAppId,
}: {
  insights: FamilyInsights | undefined;
  money: (n: number | null | undefined) => string;
  setSelectedAppId: (appId: number | null) => void;
}) => (
  <FamilyListPanel
    title="Wishlist gaps"
    description="Wanted by two or more, owned by nobody"
    tone="var(--read)"
    index={8}
    rows={(insights?.wishlistGaps ?? [])
      .slice(0, FAMILY_PANEL_ROW_LIMIT)
      .map((item) => ({
        key: item.appId,
        title: item.name,
        detail: (
          <span title={item.wantedBy.join(", ")}>
            {item.wantedBy.length} members
            {item.currentPrice != null ? ` · ${money(item.currentPrice)}` : ""}
          </span>
        ),
        onClick: () => setSelectedAppId(item.appId),
      }))}
    empty="No game is wanted by two or more linked members yet."
    footer={<LinkedNote count={insights?.linkedMemberCount} />}
  />
);
