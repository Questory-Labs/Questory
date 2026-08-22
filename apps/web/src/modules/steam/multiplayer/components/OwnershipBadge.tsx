export const OwnershipBadge = ({
  ownership,
  ownedByYou,
  ownedByFriends,
  missingFriends,
  isSuggested,
}: {
  ownership: "shared" | "partial" | "unowned";
  ownedByYou: boolean;
  ownedByFriends: string[];
  missingFriends: string[];
  isSuggested: boolean;
}) => {
  const prefix = isSuggested ? "Suggested · " : "";

  if (ownership === "unowned") {
    return (
      <div className="space-y-0.5">
        <span className="inline-block rounded bg-[var(--warm)]/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--bg-0)]">
          {prefix}Not owned
        </span>
      </div>
    );
  }

  const owners = [
    ...(ownedByYou ? ["You"] : []),
    ...ownedByFriends.slice(0, 2),
  ];
  const ownerLabel = owners.length ? owners.join(", ") : "Partial";
  const missing =
    missingFriends.length > 0
      ? `Missing: ${missingFriends.slice(0, 2).join(", ")}${
          missingFriends.length > 2 ? ` +${missingFriends.length - 2}` : ""
        }`
      : ownedByYou
        ? null
        : "You don’t own";

  return (
    <div className="space-y-0.5">
      <span className="inline-block rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--bg-0)]">
        {prefix}
        {ownerLabel}
      </span>
      {missing ? (
        <div className="text-[10px] font-medium text-white/90">{missing}</div>
      ) : null}
    </div>
  );
};
