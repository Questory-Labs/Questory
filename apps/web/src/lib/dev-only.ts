import { notFound } from "next/navigation";

/** Hide dev harness routes in production builds. */
export function devOnly() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}
