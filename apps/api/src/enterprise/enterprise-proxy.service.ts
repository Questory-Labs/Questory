import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { encodeEnterpriseInternalToken } from "@questorylabs/shared/enterprise-internal-token";
import { providerFetch } from "../lib/qhttp-outbound";

export type EnterpriseForwardOptions = {
  userId: string;
  isAdmin: boolean;
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
};

@Injectable()
export class EnterpriseProxyService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (
      process.env.ENTERPRISE_URL || "http://127.0.0.1:4030"
    ).replace(/\/$/, "");
  }

  mintToken(userId: string, isAdmin: boolean): string {
    return encodeEnterpriseInternalToken({ userId, isAdmin });
  }

  async forward<T>(opts: EnterpriseForwardOptions): Promise<T> {
    const url = new URL(
      opts.path.startsWith("/") ? opts.path : `/${opts.path}`,
      `${this.baseUrl}/`,
    );
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        if (value != null && value !== "") url.searchParams.set(key, value);
      }
    }

    const token = this.mintToken(opts.userId, opts.isAdmin);
    const init: RequestInit = {
      method: opts.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }

    let res: Response;
    try {
      res = await providerFetch(url.toString(), init);
    } catch {
      throw new ServiceUnavailableException("Enterprise service unavailable");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpException(
        text || `Enterprise request failed: ${res.status}`,
        res.status,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Public availability probe — no auth. */
  async forwardPublic<T>(path: string): Promise<T> {
    const url = new URL(
      path.startsWith("/") ? path : `/${path}`,
      `${this.baseUrl}/`,
    );
    let res: Response;
    try {
      res = await providerFetch(url.toString(), { cache: "no-store" });
    } catch {
      throw new ServiceUnavailableException("Enterprise service unavailable");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpException(
        text || `Enterprise request failed: ${res.status}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  }
}
