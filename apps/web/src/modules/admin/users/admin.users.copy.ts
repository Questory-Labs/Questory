import type { AdminUser, ConfirmAction, SyncTarget } from "./admin.users.types";

export const SYNC_ACTIONS: Array<{ target: SyncTarget; label: string }> = [
  { target: "music", label: "Sync music" },
  { target: "movie", label: "Sync movie" },
  { target: "read", label: "Sync read" },
  { target: "catalog", label: "Sync catalog" },
  { target: "price", label: "Sync price" },
];

export const userLabel = (user: AdminUser) => user.email || user.personaName;

export const syncDialogCopy = (target: SyncTarget, user: AdminUser) => {
  const name = userLabel(user);
  switch (target) {
    case "music":
      return {
        title: "Sync music?",
        body: `Queue metadata enrichment for tracks listened by ${name}. This does not pull new scrobbles from external services.`,
      };
    case "movie":
      return {
        title: "Sync movie?",
        body: `Re-sync connected watch providers (Trakt, Letterboxd, anime lists) for ${name}. Skips providers that are not connected.`,
      };
    case "read":
      return {
        title: "Sync read?",
        body: `Re-sync connected manga/list providers for ${name}. Skips providers that are not connected.`,
      };
    case "catalog":
      return {
        title: "Sync catalog?",
        body: `Enqueue a full Steam library, wishlist, friends, and metadata refresh for ${name}. Requires a linked Steam account.`,
      };
    case "price":
      return {
        title: "Sync price?",
        body: `Refresh regional prices for ${name}'s library and wishlist.`,
      };
  }
};

export const confirmDialogCopy = (confirm: ConfirmAction) => {
  if (confirm.kind === "role") {
    const promote = confirm.promote;
    return {
      title: promote ? "Promote to admin?" : "Demote admin?",
      body: promote
        ? `Grant admin access to ${userLabel(confirm.user)}? They will be able to use the admin console.`
        : `Remove admin access from ${userLabel(confirm.user)}?`,
      confirmLabel: promote ? "Promote" : "Demote",
      destructive: !promote,
    };
  }
  if (confirm.kind === "delete") {
    return {
      title: "Delete user?",
      body: `Permanently delete ${userLabel(confirm.user)} and all associated data. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    };
  }
  if (confirm.kind === "start-fresh") {
    return {
      title: "Start fresh?",
      body: `Wipe library, wishlist, friends, family, collections, music, watch, API keys, and sync history for ${userLabel(confirm.user)} while keeping the account and Steam link.`,
      confirmLabel: "Start fresh",
      destructive: true,
    };
  }
  const copy = syncDialogCopy(confirm.target, confirm.user);
  return { ...copy, confirmLabel: "Sync", destructive: false };
};
