import { redirect } from "next/navigation";
import {
  adminTabHref,
  type AdminSearchParams,
} from "@/modules/admin/shared/admin.redirect";

export default async function AdminSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  redirect(adminTabHref("/admin/system", "settings", await searchParams));
}
