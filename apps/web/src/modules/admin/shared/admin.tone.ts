export type AdminTone = "ok" | "warn" | "danger" | "muted" | "accent" | "warm";

export const TONE_TEXT: Record<AdminTone, string> = {
  ok: "text-[var(--ok)]",
  warn: "text-[var(--warn)]",
  danger: "text-[var(--danger)]",
  muted: "text-[var(--faint)]",
  accent: "text-[var(--accent)]",
  warm: "text-[var(--warm)]",
};

export const TONE_GLOW: Record<AdminTone, string> = {
  ok: "shadow-[0_0_8px_var(--ok)]",
  warn: "shadow-[0_0_8px_var(--warn)]",
  danger: "shadow-[0_0_8px_var(--danger)]",
  muted: "",
  accent: "shadow-[0_0_8px_var(--accent)]",
  warm: "shadow-[0_0_8px_var(--warm)]",
};

export const statusTone = (status: string | null | undefined): AdminTone => {
  switch (status) {
    case "completed":
    case "success":
    case "ok":
      return "ok";
    case "failed":
    case "error":
      return "danger";
    case "running":
      return "warm";
    case "pending":
      return "warn";
    default:
      return "muted";
  }
};
