import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://questorylabs.com"),
  title: "Questory Labs",
  description: "Analytics and library intelligence for your Steam account",
  openGraph: {
    title: "Questory Labs",
    description: "Analytics and library intelligence for your Steam account",
    url: "https://questorylabs.com",
    siteName: "Questory Labs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Questory Labs",
    description: "Analytics and library intelligence for your Steam account",
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
