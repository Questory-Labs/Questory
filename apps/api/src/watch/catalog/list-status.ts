export function isDroppedListStatus(status?: string | null): boolean {
  return status?.trim().toLowerCase() === "dropped";
}
