import { notFound } from "next/navigation";

/** Triggers the nearest `not-found.tsx`. */
export default function Test404Page() {
  notFound();
}
