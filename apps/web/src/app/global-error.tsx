"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest ? ` · ${error.digest}` : "";

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] px-6 py-16 text-[var(--ink)]">
          <div className="max-w-lg text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Critical failure
            </p>
            <p
              className="mt-4 font-display text-7xl leading-none tracking-tight text-[var(--danger)]"
              aria-hidden
            >
              500
            </p>
            <h1 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">
              The whole app face-planted
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Even the root layout tripped. Nothing fancy here — just a hard
              reset and a sincere apology from the hatch-shadow department.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => reset()}
              >
                Reload Questory
              </button>
              <a href="/" className="btn btn-secondary">
                Go home
              </a>
            </div>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
              quest log › global_error — status: 500{digest}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
