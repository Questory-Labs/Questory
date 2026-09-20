import type {
  FeatureDomain,
  FeatureSource,
  ListSyncScope,
} from "@questorylabs/shared";
import type { FeatureFlagsService } from "./feature-flags.service";

/** List providers shared by Watch (anime) and Read (manga). */
export const LIST_PROVIDER_SOURCES = [
  "anilist",
  "mal",
  "kitsu",
  "shikimori",
  "bangumi",
] as const satisfies readonly FeatureSource[];

export const LIST_PROVIDER_DOMAINS = [
  "watch",
  "read",
] as const satisfies readonly FeatureDomain[];

export type ListSyncHalves = {
  skip: boolean;
  watch: boolean;
  read: boolean;
};

export async function resolveListSyncHalves(
  flags: FeatureFlagsService,
  source: FeatureSource,
  scope: ListSyncScope = "both",
): Promise<ListSyncHalves> {
  if (!(await flags.isSourceEnabled(source))) {
    return { skip: true, watch: false, read: false };
  }
  const wantWatch =
    (scope === "watch" || scope === "both") &&
    (await flags.isDomainEnabled("watch"));
  const wantRead =
    (scope === "read" || scope === "both") &&
    (await flags.isDomainEnabled("read"));
  if (!wantWatch && !wantRead) {
    return { skip: true, watch: false, read: false };
  }
  return { skip: false, watch: wantWatch, read: wantRead };
}
