"use client";

import { useAction, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { api } from "@/lib/api";

const inputClassName =
  "mt-1 w-full border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm";

type AdminAddUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onMessage: (message: string) => void;
};

export const AdminAddUserDialog = ({
  open,
  onClose,
  onMessage,
}: AdminAddUserDialogProps) => {
  const store = useStore();
  const [personaName, setPersonaName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const create = useAction({
    run: (body: {
      personaName: string;
      email: string;
      password: string;
    }) =>
      api("/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      onMessage("User created");
      setPersonaName("");
      setEmail("");
      setPassword("");
      store.touch(["admin-users"]);
      onClose();
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const handleClose = () => {
    if (create.busy) return;
    onClose();
  };

  const handleSubmit = () => {
    create.submit({
      personaName: personaName.trim(),
      email: email.trim(),
      password,
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Add user">
      <div className="space-y-3">
        <label className="block text-sm" htmlFor="add-user-username">
          <span className="text-[var(--muted)]">Username</span>
          <input
            id="add-user-username"
            value={personaName}
            onChange={(e) => setPersonaName(e.target.value)}
            maxLength={64}
            autoComplete="off"
            className={inputClassName}
          />
        </label>
        <label className="block text-sm" htmlFor="add-user-email">
          <span className="text-[var(--muted)]">Email</span>
          <input
            id="add-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className={inputClassName}
          />
        </label>
        <label className="block text-sm" htmlFor="add-user-password">
          <span className="text-[var(--muted)]">Password</span>
          <input
            id="add-user-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            autoComplete="new-password"
            className={inputClassName}
          />
        </label>
      </div>

      {create.failed ? (
        <p className="mt-3 text-sm text-[var(--warm)]">
          {(create.error as Error).message}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose} disabled={create.busy}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            create.busy ||
            !personaName.trim() ||
            !email.trim() ||
            password.length < 10
          }
        >
          Create
        </Button>
      </div>
    </Dialog>
  );
};
