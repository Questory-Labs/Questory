import { encodeEnterpriseInternalToken } from "@questorylabs/shared/enterprise-internal-token";
import { providerFetch } from "../lib/qhttp-outbound";

const QENGINE_REWIND_URL = "http://127.0.0.1:4030/v1/enterprise/rewind/generate";

export const REWIND_AI_FALLBACK =
  "Wow! You've had quite a journey. We couldn't load your AI insights right now, but your stats speak for themselves!";

function enterpriseBaseUrl(): string {
  return (process.env.ENTERPRISE_URL || "http://127.0.0.1:4030").replace(
    /\/$/,
    "",
  );
}

export async function callRewindGenerate(
  userId: string,
  domain: "music" | "watch" | "read",
  period: string,
  stats: unknown,
): Promise<string> {
  const token = encodeEnterpriseInternalToken({ userId, isAdmin: false });
  const response = await providerFetch(
    `${enterpriseBaseUrl()}/v1/enterprise/rewind/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ domain, period, stats }),
    },
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown error");
    throw new Error(`Failed to generate rewind from qengine: ${err}`);
  }

  const data = (await response.json()) as { content?: string };
  const content = (data.content ?? "").trim();
  return content || REWIND_AI_FALLBACK;
}
