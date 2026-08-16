"use client";

import { useAction, useStore } from "@questorylabs/qhttp/react";
import { api } from "@/lib/api";

type Entitlements = {
  recommendations: boolean;
  rewindAi: boolean;
};

export function AdminUserEntitlements({
  userId,
  entitlements,
  onMessage,
}: {
  userId: string;
  entitlements: Entitlements;
  onMessage: (message: string) => void;
}) {
  const store = useStore();
  const patch = useAction({
    run: (body: { feature: keyof Entitlements; enabled: boolean }) =>
      api(`/admin/users/${userId}/entitlements`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      onMessage("Entitlements updated");
      store.touch(["admin-users"]);
    },
    onError: (e: Error) => onMessage(e.message),
  });

  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs">
      {(
        [
          ["recommendations", "Recommendations"],
          ["rewindAi", "Rewind AI"],
        ] as const
      ).map(([feature, label]) => (
        <label key={feature} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={entitlements[feature]}
            disabled={patch.busy}
            onChange={(e) =>
              patch.submit({ feature, enabled: e.target.checked })
            }
          />
          <span className="text-[var(--muted)]">{label}</span>
        </label>
      ))}
    </div>
  );
}
