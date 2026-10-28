"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const pickAdminTab = <T extends string>(
  requested: string | null,
  tabs: readonly T[],
): T => (tabs.find((t) => t === requested) ?? tabs[0]) as T;

export const useAdminTab = <T extends string>(tabs: readonly T[]) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = pickAdminTab(searchParams.get("tab"), tabs);

  const setTab = (next: T) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return [tab, setTab] as const;
};
