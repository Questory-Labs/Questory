import Link from "next/link";

const LOAD_DELAY_MS = 3_000;

async function waitForPreview() {
  await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
}

/** Suspense fallback is `loading.tsx` beside this file. */
export default async function TestLoadingPage() {
  await waitForPreview();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] px-6">
      <div className="panel q-pop px-6 py-8 text-center">
        <p className="label-mono m-0 text-[11px]">Loaded</p>
        <h1 className="mt-3 mb-0 text-3xl font-light tracking-[-0.04em] text-[var(--ink)]">
          Quest log <span className="font-serif text-[#a1a1a6]">hydrated</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          You saw the loading state for {LOAD_DELAY_MS / 1000} seconds.
        </p>
        <Link href="/test" className="btn btn-ghost mt-6 inline-flex">
          Back to previews
        </Link>
      </div>
    </div>
  );
}
