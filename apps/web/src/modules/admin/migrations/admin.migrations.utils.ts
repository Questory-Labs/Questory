export const statusLabel = (status: string) => {
  switch (status) {
    case "not_run":
      return "Not run";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
};

export const parseResult = (
  raw: string | null,
): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};
