"use client";

export const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: "border border-[var(--warm)] text-[var(--warm)]",
    running:
      "bg-[color-mix(in_srgb,var(--warm)_18%,transparent)] text-[var(--warm)]",
    completed:
      "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]",
    failed:
      "bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] text-[var(--danger)]",
  };
  const label =
    status === "completed"
      ? "Done"
      : status === "pending"
        ? "Queued"
        : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
        styles[status] || "text-[var(--muted)]"
      }`}
    >
      {label}
    </span>
  );
};
