import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

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
    hint: "Static status preview",
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
    <div className="flex min-h-screen flex-col bg-[var(--bg-0)] text-[var(--ink)]">
      <header className="px-6 pt-6">
        <BrandMark href="/" size="sm" wordmarkClassName="text-lg" />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="label-mono m-0 text-[11px]">Dev harness</p>
        <h1 className="mt-3 mb-0 text-[clamp(34px,4.4vw,52px)] font-light leading-[1.02] tracking-[-0.045em]">
          Status page <span className="font-serif text-[#a1a1a6]">previews</span>
        </h1>
        <p className="mt-3 max-w-xl text-[var(--muted)]">
          Local-only routes for eyeballing error, empty, and loading states.
          Production builds 404 these URLs.
        </p>

        <ul className="mt-10 grid gap-3 p-0 sm:grid-cols-2">
          {PREVIEWS.map((item, i) => (
            <li key={item.href} className="q-in list-none" style={{ "--i": i } as React.CSSProperties}>
              <Link
                href={item.href}
                className="panel q-lift flex h-full flex-col px-5 py-4 transition-colors hover:border-[var(--line-strong)]"
              >
                <span className="font-display text-3xl text-[var(--ink)]">
                  {item.code}
                </span>
                <span className="mt-2 text-[var(--ink)]">{item.label}</span>
                <span className="mt-1 font-mono text-[11px] text-[var(--faint)]">
                  {item.hint}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]">
          quest log › dev_harness — clearance: local_only
        </p>
      </main>
    </div>
  );
}
