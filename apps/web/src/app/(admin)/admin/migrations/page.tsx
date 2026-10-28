import { redirect } from "next/navigation";
import {
  adminTabHref,
  type AdminSearchParams,
} from "@/modules/admin/shared/admin.redirect";

export default async function AdminMigrationsRedirect({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  redirect(adminTabHref("/admin/system", "migrations", await searchParams));
}
