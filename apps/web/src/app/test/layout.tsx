import type { ReactNode } from "react";
import { devOnly } from "@/lib/dev-only";

export default function TestLayout({ children }: { children: ReactNode }) {
  devOnly();
  return children;
}
