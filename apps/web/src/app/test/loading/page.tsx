import Link from "next/link";
import { HatchShadow } from "@/components/HatchShadow";

const LOAD_DELAY_MS = 3_000;

async function waitForPreview() {
  await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
}

/** Suspense fallback is `loading.tsx` beside this file. */
export default async function TestLoadingPage() {
  await waitForPreview();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] px-6">
      <HatchShadow
        faceClassName="panel border border-[var(--accent)]/25 bg-[var(--accent-dim)] px-6 py-8 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Loaded
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-[var(--ink)]">
          Quest log hydrated
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          You saw the loading state for {LOAD_DELAY_MS / 1000} seconds.
        </p>
        <Link href="/test" className="btn btn-secondary mt-6 inline-flex">
          Back to previews
        </Link>
      </HatchShadow>
    </div>
  );
}
