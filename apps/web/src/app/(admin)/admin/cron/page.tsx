import { redirect } from "next/navigation";
import {
  adminTabHref,
  type AdminSearchParams,
} from "@/modules/admin/shared/admin.redirect";

export default async function AdminCronRedirect({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  redirect(adminTabHref("/admin/jobs", "cron", await searchParams));
}
