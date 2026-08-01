import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";

const PREVIEWS = [
  {
    href: "/test/404",
    code: "404",
    label: "Not found",
    hint: "Triggers `not-found.tsx`",
  },
  {
    href: "/test/500",
    code: "500",
    label: "Server error",
    hint: "Throws into `error.tsx`",
  },
  {
    href: "/test/400",
    code: "400",
    label: "Bad request",
    hint: "Static status preview",
  },
  {
    href: "/test/403",
    code: "403",
    label: "Forbidden",
    hint: "Static status preview",
  },
  {
    href: "/test/loading",
    code: "…",
    label: "Loading",
    hint: "Suspense + `loading.tsx` (3s delay)",
  },
] as const;

export default function TestHubPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" className="mb-10" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Dev harness
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
          Status page previews
        </h1>
        <p className="mt-3 max-w-xl text-[var(--muted)]">
          Local-only routes for eyeballing error, empty, and loading states.
          Production builds 404 these URLs.
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {PREVIEWS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block h-full">
                <HatchShadow
                  className="h-full"
                  faceClassName="panel flex h-full flex-col border border-[var(--line)] px-5 py-4 hover:border-[var(--line-strong)]"
                >
                  <span className="font-display text-3xl text-[var(--accent)]">
                    {item.code}
                  </span>
                  <span className="mt-2 font-semibold text-[var(--ink)]">
                    {item.label}
                  </span>
                  <span className="mt-1 text-sm text-[var(--faint)]">
                    {item.hint}
                  </span>
                </HatchShadow>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
          quest log › dev_harness — clearance: local_only
        </p>
      </div>
    </div>
  );
}
