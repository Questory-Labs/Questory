export const SEARCH_SCOPES = [
  "game",
  "friend",
  "collection",
  "artist",
  "album",
  "track",
  "music",
  "movie",
  "show",
  "watch",
  "read",
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number];

const SCOPE_ALIASES: Record<string, SearchScope> = {
  game: "game",
  games: "game",
  friend: "friend",
  friends: "friend",
  collection: "collection",
  collections: "collection",
  artist: "artist",
  album: "album",
  track: "track",
  music: "music",
  movie: "movie",
  movies: "movie",
  show: "show",
  shows: "show",
  watch: "watch",
  read: "read",
  manga: "read",
};

const GAME_FILTER_KEYS = new Set([
  "genre",
  "publisher",
  "developer",
  "hours",
  "completed",
  "deck",
  "coop",
  "price",
  "status",
]);

const DATE_FILTER_KEYS = new Set(["within", "watched", "listened", "read"]);

export type SearchActivityKind = "watch" | "listen" | "read" | "any";

export type ParsedSearchQuery = {
  text: string;
  scopes: SearchScope[];
  scopeTexts: Partial<Record<SearchScope, string>>;
  filters: Record<string, string>;
  since?: Date;
  activityKind: SearchActivityKind;
};

const DURATION_RE = /^<?=?(\d+)\s*(d|days|h|hours|w|weeks)?$/i;

export function isDurationFilterValue(value: string): boolean {
  return DURATION_RE.test(value.trim());
}

export function parseSinceDate(value: string, now = new Date()): Date | undefined {
  const m = value.trim().match(DURATION_RE);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const unit = (m[2] ?? "d").toLowerCase();
  const ms =
    unit.startsWith("h")
      ? n * 3_600_000
      : unit.startsWith("w")
        ? n * 7 * 86_400_000
        : n * 86_400_000;
  return new Date(now.getTime() - ms);
}

function readToken(q: string, start: number): { token: string; next: number } {
  let i = start;
  let buf = "";
  while (i < q.length && !/\s/.test(q[i]!)) {
    buf += q[i]!;
    i++;
    const colonIdx = buf.indexOf(":");
    if (colonIdx >= 0 && q[i] === '"') {
      i++;
      while (i < q.length && q[i] !== '"') {
        buf += q[i]!;
        i++;
      }
      if (q[i] === '"') {
        buf += q[i]!;
        i++;
      }
      break;
    }
  }
  return { token: buf, next: i };
}

function tokenize(q: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < q.length) {
    while (i < q.length && /\s/.test(q[i]!)) i++;
    if (i >= q.length) break;
    if (q[i] === '"') {
      i++;
      let buf = "";
      while (i < q.length && q[i] !== '"') {
        buf += q[i]!;
        i++;
      }
      if (q[i] === '"') i++;
      tokens.push(buf);
      continue;
    }
    const { token, next } = readToken(q, i);
    tokens.push(token);
    i = next;
  }
  return tokens;
}

function unquoteValue(value: string): string {
  return value.replace(/^"+|"+$/g, "");
}

function activityKindFromDateKey(key: string): SearchActivityKind {
  if (key === "watched") return "watch";
  if (key === "listened") return "listen";
  if (key === "read") return "read";
  return "any";
}

export function parseSearchQuery(q: string, now = new Date()): ParsedSearchQuery {
  const scopes = new Set<SearchScope>();
  const scopeTexts: Partial<Record<SearchScope, string>> = {};
  const filters: Record<string, string> = {};
  const textParts: string[] = [];
  let since: Date | undefined;
  let activityKind: SearchActivityKind = "any";

  for (const token of tokenize(q.trim())) {
    const m = token.match(/^([a-zA-Z_]+):(.+)$/);
    if (!m) {
      textParts.push(token);
      continue;
    }

    const key = m[1]!.toLowerCase();
    const value = unquoteValue(m[2]!);

    if (DATE_FILTER_KEYS.has(key) && isDurationFilterValue(value)) {
      since = parseSinceDate(value, now);
      const kind = activityKindFromDateKey(key);
      if (kind !== "any") activityKind = kind;
      continue;
    }

    const scope = SCOPE_ALIASES[key];
    if (scope) {
      scopes.add(scope);
      const prev = scopeTexts[scope];
      scopeTexts[scope] = prev ? `${prev} ${value}` : value;
      continue;
    }

    if (GAME_FILTER_KEYS.has(key)) {
      filters[key] = value;
      continue;
    }

    textParts.push(token);
  }

  return {
    text: textParts.join(" "),
    scopes: [...scopes],
    scopeTexts,
    filters,
    since,
    activityKind,
  };
}

export function shouldSearchScope(
  parsed: ParsedSearchQuery,
  scope: SearchScope,
): boolean {
  if (parsed.scopes.length === 0) return true;
  if (parsed.scopes.includes(scope)) return true;
  if (scope === "movie" || scope === "show") {
    return parsed.scopes.includes("watch");
  }
  if (scope === "artist" || scope === "album" || scope === "track") {
    return parsed.scopes.includes("music");
  }
  return false;
}

export function textForScope(parsed: ParsedSearchQuery, scope: SearchScope): string {
  const scoped = parsed.scopeTexts[scope] ?? "";
  const parts = [scoped, parsed.text].filter(Boolean);
  return parts.join(" ").trim();
}

export function formatSearchChips(parsed: ParsedSearchQuery): string[] {
  const chips: string[] = [];
  for (const scope of parsed.scopes) {
    const scoped = parsed.scopeTexts[scope];
    chips.push(scoped ? `${scope}: ${scoped}` : scope);
  }
  for (const [key, value] of Object.entries(parsed.filters)) {
    chips.push(`${key}:${value}`);
  }
  if (parsed.since) {
    const label =
      parsed.activityKind === "watch"
        ? "watched"
        : parsed.activityKind === "listen"
          ? "listened"
          : parsed.activityKind === "read"
            ? "read"
            : "within";
    chips.push(`${label} since ${parsed.since.toISOString().slice(0, 10)}`);
  }
  if (parsed.text && parsed.scopes.length === 0) chips.push(parsed.text);
  return chips;
}
