"use client";

import { useState } from "react";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type { ProviderDisconnectResult } from "@questorylabs/shared";
import { Button, Dialog } from "@/components/ui";

export const DisconnectButton = ({
  title,
  path,
  fetchFn,
  touches,
  description,
}: {
  title: string;
  path: string;
  fetchFn: <T>(path: string, init?: RequestInit) => Promise<T>;
  touches: string[];
  description?: string;
}) => {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disconnect = useAction({
    run: () => fetchFn<ProviderDisconnectResult>(path, { method: "DELETE" }),
    onSuccess: () => {
      setOpen(false);
      setError(null);
      store.touch([...touches.map((t) => [t]), ["shell-sync-status"], ["sources-overview"]]);
    },
    onError: (err) => setError(err.message || "Disconnect failed"),
  });

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Disconnect
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Disconnect ${title}?`}>
        <p className="text-sm text-[var(--muted)]">
          {description ??
            `Syncing from ${title} stops and its stored tokens are removed. History already imported stays.`}
        </p>
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={disconnect.busy} onClick={() => disconnect.submit()}>
            {disconnect.busy ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
