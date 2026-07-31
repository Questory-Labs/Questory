/** Case-insensitive Prisma `contains` filter for string fields. */
export function containsInsensitive(text: string) {
  return { contains: text, mode: "insensitive" as const };
}
