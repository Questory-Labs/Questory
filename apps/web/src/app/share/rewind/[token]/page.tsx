import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicRewindShare } from "@/modules/media/rewind/public/media.rewind-public.api";
import {
  PublicRewindView,
  publicRewindTitle,
} from "@/modules/media/rewind/public/media.rewind-public.view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const share = await loadPublicRewindShare(token).catch(() => null);
  if (!share) return { title: "Rewind not found - Questory", robots: { index: false } };
  const title = publicRewindTitle(share);
  const description = "A snapshot of games, music, movies and reading, shared from Questory.";
  return {
    title: `${title} - Questory`,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "article", siteName: "Questory" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedRewindPage({ params }: Props) {
  const { token } = await params;
  const share = await loadPublicRewindShare(token, { countView: true });
  if (!share) notFound();
  return <PublicRewindView share={share} />;
}
