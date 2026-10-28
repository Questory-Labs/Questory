"use client";

import type { ProfileRecap } from "../steam.settings-profile.types";
import { ProfileSection } from "./ProfileSection";

export const ProfileRecapSection = ({ recap }: { recap: ProfileRecap }) => {
  const value = recap.settings.value;
  const on = Boolean(value?.monthly);
  const disabled = !value || value.global || recap.save.busy;
  return (
    <ProfileSection id="profile-notifications" index={4} title="Notifications">
      <div className="mt-3.5 flex items-center gap-4">
        <div className="flex-1">
          <p id="profile-recap-label" className="font-normal">
            Monthly recap
          </p>
          <p className="text-sm text-[var(--muted)]">
            On the 1st, get a notification with last month&apos;s rewind for each area you used.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="profile-recap-label"
          disabled={disabled}
          onClick={() => recap.save.submit(!on)}
          className={`relative h-[30px] w-[52px] flex-none rounded-full border p-0 transition-[background-color,border-color] duration-500 disabled:cursor-not-allowed disabled:opacity-60 ${
            on
              ? "border-[var(--ok)]/50 bg-[var(--ok)]/20"
              : "border-white/[0.12] bg-white/[0.06]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-[cubic-bezier(.34,1.4,.64,1)] ${
              on ? "translate-x-[22px] bg-[var(--ink)]" : "bg-[var(--muted)]"
            }`}
          />
        </button>
      </div>
      {recap.settings.failed ? (
        <p className="mt-2 text-sm text-[var(--danger)]">Could not load recap settings.</p>
      ) : null}
      {value?.global ? (
        <p className="mt-2 text-xs text-[var(--faint)]">Enabled for everyone by your admin.</p>
      ) : null}
      {recap.error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {recap.error}
        </p>
      ) : null}
    </ProfileSection>
  );
};
