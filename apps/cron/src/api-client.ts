import { Injectable, Logger } from "@nestjs/common";
import { withApiVersion } from "@questorylabs/shared";

@Injectable()
export class ApiClient {
  private readonly logger = new Logger(ApiClient.name);

  private apiBaseUrl(): string {
    return (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000"
    ).replace(/\/$/, "");
  }

  private watchBaseUrl(): string {
    return (
      process.env.WATCH_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_WATCH_URL ||
      "http://localhost:4020"
    ).replace(/\/$/, "");
  }

  private secret(): string {
    return (process.env.CRON_SECRET || "").trim();
  }

  async postInternal(path: string): Promise<unknown> {
    return this.post(this.apiBaseUrl(), path);
  }

  async postWatchInternal(path: string): Promise<unknown> {
    return this.post(this.watchBaseUrl(), path);
  }

  private async post(base: string, path: string): Promise<unknown> {
    const secret = this.secret();
    if (!secret) {
      throw new Error("CRON_SECRET is not configured");
    }

    const versioned = withApiVersion(path);
    const url = `${base}${versioned}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // keep raw text
    }

    if (!res.ok) {
      this.logger.error(
        `POST ${url} failed: ${res.status} ${typeof body === "string" ? body : JSON.stringify(body)}`,
      );
      throw new Error(`${url} returned ${res.status}`);
    }

    return body;
  }
}
