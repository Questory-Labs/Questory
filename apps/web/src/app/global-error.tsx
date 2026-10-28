"use client";

import "./globals.css";

import { StatusPage } from "@/components/StatusPage";
import { errorRequestId } from "@/lib/api";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest ? ` · ${error.digest}` : "";
  const reference = errorRequestId(error) ?? error.digest;

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
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <StatusPage
          code="500"
          eyebrow="Critical failure"
          title="The whole app"
          titleAccent="face-planted"
          taglineContext="serverError"
          logLine={`quest log › global_error — status: 500${digest}`}
          reference={reference}
          tone="danger"
          primary={{ label: "Reload Questory", onClick: () => reset() }}
          secondary={{ label: "Go home", href: "/" }}
        />
      </body>
    </html>
  );
}
