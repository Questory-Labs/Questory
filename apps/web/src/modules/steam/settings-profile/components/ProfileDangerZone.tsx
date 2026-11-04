"use client";

import type { CSSProperties } from "react";
import { DELETE_ACCOUNT_CONFIRMATION } from "@questorylabs/shared";
import { Button, Dialog } from "@questorylabs/ui";
import { PROFILE_INPUT_CLASS } from "../steam.settings-profile.constants";
import type { ProfileDeleteAccount } from "../steam.settings-profile.types";

export const ProfileDangerZone = ({
  deleteAccount,
}: {
  deleteAccount: ProfileDeleteAccount;
}) => {
  const matches = deleteAccount.confirmText === DELETE_ACCOUNT_CONFIRMATION;
  return (
    <section
      aria-labelledby="profile-danger"
      className="q-in rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(180deg,rgba(240,79,79,0.06),rgba(240,79,79,0.01))] px-[22px] py-5"
      style={{ "--i": 6 } as CSSProperties}
    >
      <h2
        id="profile-danger"
        className="flex items-center gap-2 text-[17px] font-normal text-[#f59a9a]"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
        Delete account
      </h2>
      <p className="mt-0.5 text-sm text-[var(--muted)]">
        Removes your account and all synced data from this instance. This can&apos;t be undone.
      </p>
      <Button
        variant="ghost-danger"
        className="mt-3.5"
        onClick={() => deleteAccount.setOpen(true)}
      >
        Delete account…
      </Button>
      <Dialog
        open={deleteAccount.open}
        onClose={() => deleteAccount.setOpen(false)}
        title="Delete your account?"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            deleteAccount.submit();
          }}
        >
          <p className="text-sm text-[var(--muted)]">
            This permanently removes your account, linked services and all synced data.
            It can&apos;t be undone. Export your data first if you want a copy.
          </p>
          <label className="label-mono mt-4 flex flex-col gap-1.5 text-[10px]">
            Type {DELETE_ACCOUNT_CONFIRMATION} to confirm
            <input
              value={deleteAccount.confirmText}
              onChange={(e) => deleteAccount.setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={PROFILE_INPUT_CLASS}
            />
          </label>
          {deleteAccount.error ? (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {deleteAccount.error}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => deleteAccount.setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!matches || deleteAccount.busy}>
              {deleteAccount.busy ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
};
