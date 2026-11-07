"use client";

import { useState } from "react";
import { Button } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";

type Status = "idle" | "busy" | "done" | "failed";

export function NotificationVerifyView({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setStatus("busy");
    setError(null);
    try {
      await api<{ ok: true }>("/notifications/verify", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setStatus("done");
    } catch (err) {
      setError(parseApiError(err).message || "This link is invalid or has expired");
      setStatus("failed");
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-xl font-semibold">Confirm email notifications</h1>
      {status === "done" ? (
        <p role="status" className="text-sm text-[var(--ok)]">
          Confirmed. Questory notifications will now arrive at this address.
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            Press Confirm to start receiving Questory notifications at the address this link was
            sent to. If you did not ask for this, close this page.
          </p>
          <div>
            <Button onClick={confirm} disabled={status === "busy"}>
              {status === "busy" ? "Confirming…" : "Confirm"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
