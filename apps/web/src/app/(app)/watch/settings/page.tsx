import { redirect } from "next/navigation";
import { sourcesHref } from "@/modules/media/sources/media.sources.utils";

export default async function WatchSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(sourcesHref("watch", await searchParams));
}
