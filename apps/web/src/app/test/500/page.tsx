import { devOnly } from "@/lib/dev-only";

/** Throws into `app/error.tsx`. */
export default function Test500Page() {
  devOnly();
  throw new Error("Intentional test 500 — quest log preview");
}
