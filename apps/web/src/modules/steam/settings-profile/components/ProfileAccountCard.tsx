"use client";

import { useState, type CSSProperties } from "react";
import type { User } from "@questorylabs/shared";
import { Button, Dialog } from "@questorylabs/ui";
import { PROFILE_INPUT_CLASS } from "../steam.settings-profile.constants";
import type {
  PasswordForm,
  ProfileChangePassword,
} from "../steam.settings-profile.types";
import { memberSinceLabel } from "../steam.settings-profile.utils";

const EMPTY_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const PasswordField = ({
  label,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) => (
  <label className="label-mono flex flex-col gap-1.5 text-[10px]">
    {label}
    <input
      type="password"
      value={value}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      className={PROFILE_INPUT_CLASS}
    />
  </label>
);

const ChangePasswordDialog = ({
  changePassword,
}: {
  changePassword: ProfileChangePassword;
}) => {
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const close = () => {
    setForm(EMPTY_FORM);
    changePassword.setOpen(false);
  };
  const set = (key: keyof PasswordForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <Dialog open={changePassword.open} onClose={close} title="Change password">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          changePassword.submit(form);
        }}
      >
        <PasswordField
          label="Current password"
          value={form.currentPassword}
          autoComplete="current-password"
          onChange={set("currentPassword")}
        />
        <PasswordField
          label="New password"
          value={form.newPassword}
          autoComplete="new-password"
          onChange={set("newPassword")}
        />
        <PasswordField
          label="Confirm new password"
          value={form.confirmPassword}
          autoComplete="new-password"
          onChange={set("confirmPassword")}
        />
        {changePassword.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {changePassword.error}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={changePassword.busy}>
            {changePassword.busy ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export const ProfileAccountCard = ({
  user,
  changePassword,
}: {
  user: User | null;
  changePassword: ProfileChangePassword;
}) => {
  const name = user?.personaName || "";
  const since = memberSinceLabel(user?.createdAt);
  const meta = [user?.email, since ? `member since ${since}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <section
      aria-labelledby="profile-account"
      className="panel q-in flex flex-wrap items-center gap-[18px] px-[22px] py-5"
      style={{ "--i": 1 } as CSSProperties}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="h-[60px] w-[60px] rounded-full border border-white/10 object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-[60px] w-[60px] place-items-center rounded-full border border-white/10 bg-[linear-gradient(140deg,#3a3a3f,#1b1b1e)] text-2xl font-light"
        >
          {(name.trim()[0] || "?").toUpperCase()}
        </span>
      )}
      <div className="min-w-[200px] flex-1">
        <h2 id="profile-account" className="text-xl font-normal">
          {name || "Your account"}
        </h2>
        {meta ? (
          <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{meta}</p>
        ) : null}
        {changePassword.done ? (
          <p role="status" className="mt-1 text-sm text-[var(--accent)]">
            Password changed.
          </p>
        ) : null}
      </div>
      {user?.hasPassword ? (
        <Button variant="secondary" onClick={() => changePassword.setOpen(true)}>
          Change password
        </Button>
      ) : null}
      {user?.hasPassword ? (
        <ChangePasswordDialog changePassword={changePassword} />
      ) : null}
    </section>
  );
};
