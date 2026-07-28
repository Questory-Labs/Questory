import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://questorylabs.com"),
  title: "Questory",
  description:
    "Steam-first library and media intelligence — games, music, movies/TV, and reading",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Questory",
  },
  openGraph: {
    title: "Questory",
    description:
      "Steam-first library and media intelligence — games, music, movies/TV, and reading",
    url: "https://questorylabs.com",
    siteName: "Questory",
    type: "website",
    images: [{ url: "/web-app-manifest-512x512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Questory",
    description:
      "Steam-first library and media intelligence — games, music, movies/TV, and reading",
    images: ["/web-app-manifest-512x512.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Written at container start so Hub images honor compose environment. */}
        <Script src="/runtime-env.js" strategy="beforeInteractive" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
