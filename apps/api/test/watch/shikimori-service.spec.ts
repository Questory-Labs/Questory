import { beforeEach, vi } from "vitest";
import { ShikimoriService } from "../../src/watch/shikimori/shikimori.service";
import { shikimoriUserAgent } from "../../src/watch/lib/provider-user-agent";
import { jsonRes } from "./list-provider-harness";
import { describeListProviderLifecycle } from "./list-provider-lifecycle-cases";
import { describeListProviderOAuth } from "./list-provider-oauth-cases";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../src/watch/lib/provider-fetch", () => ({
  providerFetch: fetchMock,
}));

const TOKEN_URL = "https://shikimori.one/oauth/token";

beforeEach(() => {
  vi.stubEnv("SHIKIMORI_CLIENT_ID", "cid");
  vi.stubEnv("SHIKIMORI_CLIENT_SECRET", "csecret");
});

describeListProviderLifecycle({
  provider: "shikimori",
  label: "Shikimori",
  Service: ShikimoriService,
  fetchMock,
  tokenUrl: TOKEN_URL,
  emptyApi: (url) =>
    url.endsWith("/api/users/whoami") ? jsonRes({ id: 7 }) : jsonRes([]),
  animeUrlPart: "/anime_rates",
  mangaUrlPart: "/manga_rates",
  refreshExtras: () => ({ client_id: "cid", client_secret: "csecret" }),
});

describeListProviderOAuth({
  provider: "shikimori",
  label: "Shikimori",
  Service: ShikimoriService,
  fetchMock,
  authorizeBase: "https://shikimori.one/oauth/authorize",
  tokenUrl: TOKEN_URL,
  envPrefix: "SHIKIMORI",
  userAgent: shikimoriUserAgent(),
});
