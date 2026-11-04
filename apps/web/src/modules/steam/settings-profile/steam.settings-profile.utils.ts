import { ChangePasswordSchema } from "@questorylabs/shared";
import { parseApiError } from "@/lib/auth-api";
import type { PasswordForm } from "./steam.settings-profile.types";

const newPasswordSchema = ChangePasswordSchema.shape.newPassword;

export const memberSinceLabel = (createdAt: string | null | undefined) => {
  if (!createdAt) return null;
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

export const passwordFormError = (form: PasswordForm): string | null => {
  if (!form.currentPassword) return "Enter your current password.";
  const min = newPasswordSchema.minLength;
  const max = newPasswordSchema.maxLength;
  if (min != null && form.newPassword.length < min) {
    return `New password must be at least ${min} characters.`;
  }
  if (max != null && form.newPassword.length > max) {
    return `New password must be ${max} characters or fewer.`;
  }
  if (form.newPassword !== form.confirmPassword) return "New passwords don't match.";
  return null;
};

export const changePasswordErrorMessage = (err: unknown) => {
  const parsed = parseApiError(err);
  if (
    parsed.status === 429 ||
    (parsed.status === 401 && (parsed.retryAfterSec ?? 0) > 0)
  ) {
    return parsed.retryAfterSec
      ? `Too many attempts. Try again in ${parsed.retryAfterSec}s.`
      : "Too many attempts, try again later";
  }
  if (parsed.status === 401) return "Current password is incorrect.";
  return parsed.message || "Could not change password.";
};

export const maskToken = (prefix: string) => `${prefix}••••••••`;
