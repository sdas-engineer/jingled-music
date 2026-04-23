import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Replay — What did your life sound like?",
    template: "%s · Replay",
  },
  description:
    "Replay transforms your Spotify listening history into a beautiful public profile. GitHub for your music life.",
  keywords: ["spotify", "music", "listening history", "profile", "replay"],
  openGraph: {
    type: "website",
    siteName: "Replay",
    title: "Replay — What did your life sound like?",
    description: "A GitHub-style contribution graph for your Spotify listening history.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Replay",
    description: "A GitHub-style contribution graph for your Spotify listening history.",
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-replay-bg text-replay-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
