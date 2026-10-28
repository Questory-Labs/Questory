export type AdminSearchParams = Record<string, string | string[] | undefined>;

export const adminTabHref = (
  path: string,
  tab: string,
  searchParams: AdminSearchParams = {},
) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  params.set("tab", tab);
  return `${path}?${params.toString()}`;
};
