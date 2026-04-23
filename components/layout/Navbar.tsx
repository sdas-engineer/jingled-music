"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NavUser {
  displayName: string;
  username: string;
  profileImage: string | null;
}

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    const configured = Number.parseInt(process.env.NEXT_PUBLIC_AUTO_SYNC_INTERVAL_MS ?? "", 10);
    const intervalMs = Number.isFinite(configured) && configured > 0 ? configured : 5 * 60 * 1000;

    let syncing = false;
    const run = async () => {
      if (syncing) return;
      if (document.visibilityState !== "visible") return;
      syncing = true;
      try {
        await fetch("/api/spotify/sync", { method: "POST" });
      } catch {
        // Best effort background sync while user is active.
      } finally {
        syncing = false;
      }
    };

    // Kick once shortly after mount so users don't wait full interval.
    const initial = window.setTimeout(run, 2000);
    const interval = window.setInterval(run, intervalMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-replay-border bg-replay-bg/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded bg-replay-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-black stroke-[2.2]" aria-hidden>
              <path
                d="M14 5v10.5a2.5 2.5 0 1 1-1-2V7.2l6-1.7v8a2.5 2.5 0 1 1-1-2V4z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-replay-text-primary group-hover:text-white transition-colors">
            Jingled
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-20 h-5 rounded shimmer" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-replay-text-secondary hover:text-replay-text-primary transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href={`/@${user.username}`}
                className="text-sm text-replay-text-secondary hover:text-replay-text-primary transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/brain"
                className="text-sm text-replay-text-secondary hover:text-replay-text-primary transition-colors"
              >
                Brain
              </Link>
              <Link
                href="/api/auth/logout"
                className="text-sm text-replay-text-muted hover:text-replay-text-secondary transition-colors"
              >
                Log out
              </Link>
            </>
          ) : (
            <Link
              href="/api/auth/login"
              className="inline-flex items-center gap-2 rounded-full bg-replay-accent px-4 py-1.5 text-xs font-semibold text-black hover:bg-replay-accent/90 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden>
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Connect Spotify
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
