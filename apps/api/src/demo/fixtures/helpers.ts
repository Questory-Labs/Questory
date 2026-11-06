const DAY_MS = 24 * 60 * 60 * 1000;

export const DEMO_GAMES = [
  { appId: 1145360, name: "Hades", minutes: 5820, genres: ["Action", "Roguelike"] },
  { appId: 413150, name: "Stardew Valley", minutes: 12480, genres: ["Simulation", "RPG"] },
  { appId: 367520, name: "Hollow Knight", minutes: 3360, genres: ["Metroidvania", "Action"] },
  { appId: 504230, name: "Celeste", minutes: 1740, genres: ["Platformer", "Indie"] },
  { appId: 620, name: "Portal 2", minutes: 1260, genres: ["Puzzle", "Co-op"] },
  { appId: 105600, name: "Terraria", minutes: 9420, genres: ["Sandbox", "Co-op"] },
  { appId: 632470, name: "Disco Elysium", minutes: 2280, genres: ["RPG", "Story Rich"] },
  { appId: 1086940, name: "Baldur's Gate 3", minutes: 15600, genres: ["RPG", "Co-op"] },
  { appId: 1245620, name: "Elden Ring", minutes: 7260, genres: ["Action", "RPG"] },
  { appId: 427520, name: "Factorio", minutes: 10800, genres: ["Automation", "Strategy"] },
  { appId: 1091500, name: "Cyberpunk 2077", minutes: 0, genres: ["RPG", "Open World"] },
  { appId: 548430, name: "Deep Rock Galactic", minutes: 4380, genres: ["Co-op", "Shooter"] },
  { appId: 892970, name: "Valheim", minutes: 3120, genres: ["Survival", "Co-op"] },
  { appId: 646570, name: "Slay the Spire", minutes: 6240, genres: ["Roguelike", "Card Game"] },
  { appId: 1426210, name: "It Takes Two", minutes: 0, genres: ["Co-op", "Adventure"] },
  { appId: 728880, name: "Overcooked! 2", minutes: 540, genres: ["Co-op", "Casual"] },
] as const;

export const DEMO_FRIENDS = [
  { steamId: "10000000000000001", personaName: "Nova Tinker" },
  { steamId: "10000000000000002", personaName: "Moss Runner" },
  { steamId: "10000000000000003", personaName: "Quill Harper" },
] as const;

export function steamHeaderUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export function daysAhead(days: number): string {
  return daysAgo(-days);
}
