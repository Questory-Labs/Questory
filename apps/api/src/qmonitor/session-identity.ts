export type SessionMatchKind = "exe" | "title";

export type SessionMatchIdentity = {
  matchKey: string;
  matchKind: SessionMatchKind;
  matchValue: string;
  matchExeNorm: string;
  matchTitleNorm: string;
};

/** Basename + lowercase so `C:\\Games\\dota2.exe` and `dota2.exe` match. */
export function normalizeExe(exe: string | null | undefined): string {
  if (!exe) return "";
  const trimmed = exe.trim().replace(/\\/g, "/");
  if (!trimmed) return "";
  const base = trimmed.split("/").pop() ?? trimmed;
  return base.toLowerCase();
}

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sessionMatchIdentity(
  exe: string | null | undefined,
  title: string,
): SessionMatchIdentity {
  const matchExeNorm = normalizeExe(exe);
  const matchTitleNorm = normalizeTitle(title);
  if (matchExeNorm) {
    return {
      matchKey: `exe:${matchExeNorm}`,
      matchKind: "exe",
      matchValue: matchExeNorm,
      matchExeNorm,
      matchTitleNorm,
    };
  }
  return {
    matchKey: `title:${matchTitleNorm}`,
    matchKind: "title",
    matchValue: matchTitleNorm,
    matchExeNorm: "",
    matchTitleNorm,
  };
}

export function sessionMatchesIdentity(
  exe: string | null | undefined,
  title: string,
  identity: SessionMatchIdentity,
): boolean {
  if (identity.matchKind === "exe") {
    return normalizeExe(exe) === identity.matchExeNorm;
  }
  return !normalizeExe(exe) && normalizeTitle(title) === identity.matchTitleNorm;
}
