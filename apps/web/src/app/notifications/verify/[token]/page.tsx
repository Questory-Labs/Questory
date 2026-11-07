import type { Metadata } from "next";
import { NotificationVerifyView } from "@/modules/steam/settings-notifications/steam.notifications-verify.view";

export const metadata: Metadata = {
  title: "Confirm email notifications - Questory",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

export default async function NotificationVerifyPage({ params }: Props) {
  const { token } = await params;
  return <NotificationVerifyView token={token} />;
}
