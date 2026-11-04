export const maskSteamId = (id: string | null | undefined) => {
  if (!id) return null;
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}••••••••${id.slice(-4)}`;
};
