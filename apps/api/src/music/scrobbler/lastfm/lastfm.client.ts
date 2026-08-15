import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { providerFetch } from "../../../lib/qhttp-outbound";
import {
  resolveLastFmApiKey,
  resolveLastFmApiSecret,
} from "../../lib/runtime-config";
import type { LastFmRecentTrack } from "./lastfm.map";
import { asTrackArray } from "./lastfm.map";

const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

export type LastFmError = {
  error: number;
  message?: string;
};

export function signLastFmParams(
  params: Record<string, string>,
  secret: string,
): string {
  const sorted = Object.keys(params)
    .filter((key) => key !== "format" && key !== "callback" && params[key] !== "")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return createHash("md5").update(sorted + secret, "utf8").digest("hex");
}

function isLastFmError(data: unknown): data is LastFmError {
  return (
    typeof data === "object" &&
    data != null &&
    "error" in data &&
    typeof (data as LastFmError).error === "number"
  );
}

export class LastFmApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "LastFmApiError";
  }

  get authFailed() {
    return this.code === 9 || this.code === 4;
  }
}

@Injectable()
export class LastFmClient {
  async call<T>(
    method: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const apiKey = resolveLastFmApiKey();
    const secret = resolveLastFmApiSecret();
    const signed: Record<string, string> = {
      method,
      api_key: apiKey,
      ...params,
    };
    signed.api_sig = signLastFmParams(signed, secret);
    signed.format = "json";

    const url = new URL(LASTFM_API);
    for (const [key, value] of Object.entries(signed)) {
      url.searchParams.set(key, value);
    }

    const res = await providerFetch(url, undefined, { retries: 1 });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Last.fm ${method}: invalid JSON (${res.status})`);
    }
    if (isLastFmError(data)) {
      throw new LastFmApiError(
        data.error,
        data.message || `Last.fm error ${data.error}`,
      );
    }
    if (!res.ok) {
      throw new Error(`Last.fm ${method}: HTTP ${res.status}`);
    }
    return data as T;
  }

  getToken() {
    return this.call<{ token: string }>("auth.getToken");
  }

  getSession(token: string) {
    return this.call<{ session: { name: string; key: string } }>(
      "auth.getSession",
      { token },
    );
  }

  async getRecentTracks(opts: {
    user: string;
    from?: string;
    limit: number;
    page?: number;
    sk?: string;
  }) {
    const params: Record<string, string> = {
      user: opts.user,
      limit: String(opts.limit),
      extended: "1",
    };
    if (opts.from) params.from = opts.from;
    if (opts.page) params.page = String(opts.page);
    if (opts.sk) params.sk = opts.sk;
    const data = await this.call<{
      recenttracks?: { track?: LastFmRecentTrack | LastFmRecentTrack[] };
    }>("user.getRecentTracks", params);
    return asTrackArray(data.recenttracks?.track);
  }
}
