import { API_PREFIX, type PublicRewindShare } from "@questorylabs/shared";
import { getApiUrl } from "@/lib/runtime-env";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export async function loadPublicRewindShare(
  token: string,
  opts: { countView?: boolean } = {},
): Promise<PublicRewindShare | null> {
  if (!TOKEN_RE.test(token)) return null;
  const res = await fetch(`${getApiUrl()}${API_PREFIX}/share/rewind/${encodeURIComponent(token)}${opts.countView ? "?view=1" : ""}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Share lookup failed (${res.status})`);
  return (await res.json()) as PublicRewindShare;
}
