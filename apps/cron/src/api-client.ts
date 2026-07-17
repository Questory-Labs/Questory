import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ApiClient {
  private readonly logger = new Logger(ApiClient.name);

  private baseUrl(): string {
    return (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000"
    ).replace(/\/$/, "");
  }

  private secret(): string {
    return (process.env.CRON_SECRET || "").trim();
  }

  async postInternal(path: string): Promise<unknown> {
    const secret = this.secret();
    if (!secret) {
      throw new Error("CRON_SECRET is not configured");
    }

    const url = `${this.baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
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
        `POST ${path} failed: ${res.status} ${typeof body === "string" ? body : JSON.stringify(body)}`,
      );
      throw new Error(`API ${path} returned ${res.status}`);
    }

    return body;
  }
}
