import type { FeatureFlagsService } from "./feature-flags.service";

function webOrigin(): string {
  return (
    process.env.WEB_ORIGIN ||
    process.env.NEXT_PUBLIC_WEB_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** OAuth for shared list providers always returns to the Watch callback path. */
export async function listProviderConnectedUrl(
  flags: FeatureFlagsService,
  provider: string,
): Promise<string> {
  const watchOn = await flags.isDomainEnabled("watch");
  const section = watchOn ? "watch" : "read";
  return `${webOrigin()}/${section}/settings?${provider}=connected`;
}
