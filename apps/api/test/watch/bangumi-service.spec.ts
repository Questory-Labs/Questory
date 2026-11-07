import { beforeEach, vi } from "vitest";
import { BangumiService } from "../../src/watch/bangumi/bangumi.service";
import { questoryUserAgent } from "../../src/watch/lib/provider-user-agent";
import { jsonRes } from "./list-provider-harness";
import { describeListProviderLifecycle } from "./list-provider-lifecycle-cases";
import { describeListProviderOAuth } from "./list-provider-oauth-cases";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../src/watch/lib/provider-fetch", () => ({
  providerFetch: fetchMock,
}));

const TOKEN_URL = "https://bgm.tv/oauth/access_token";

beforeEach(() => {
  vi.stubEnv("BANGUMI_CLIENT_ID", "cid");
  vi.stubEnv("BANGUMI_CLIENT_SECRET", "csecret");
});

describeListProviderLifecycle({
  provider: "bangumi",
  label: "Bangumi",
  Service: BangumiService,
  fetchMock,
  tokenUrl: TOKEN_URL,
  emptyApi: (url) =>
    url.endsWith("/v0/me")
      ? jsonRes({ username: "someone" })
      : jsonRes({ data: [] }),
  animeUrlPart: "subject_type=2",
  mangaUrlPart: "subject_type=1",
  refreshExtras: () => ({ client_id: "cid", client_secret: "csecret" }),
});

describeListProviderOAuth({
  provider: "bangumi",
  label: "Bangumi",
  Service: BangumiService,
  fetchMock,
  authorizeBase: "https://bgm.tv/oauth/authorize",
  tokenUrl: TOKEN_URL,
  envPrefix: "BANGUMI",
  userAgent: questoryUserAgent(),
});
