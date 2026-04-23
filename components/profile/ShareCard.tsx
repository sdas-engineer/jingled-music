"use client";

import { useState } from "react";

interface ShareCardProps {
  username: string;
  displayName: string;
}

export default function ShareCard({ username, displayName }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/@${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-2xl border border-replay-border bg-replay-card p-5">
      <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-4">
        Share your profile
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-replay-surface border border-replay-border rounded-xl px-3 py-2 min-w-0">
          <p className="text-xs text-replay-text-secondary truncate font-mono">
            {profileUrl}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 rounded-xl bg-replay-surface border border-replay-border px-3 py-2 text-xs text-replay-text-secondary hover:text-replay-text-primary hover:border-replay-text-muted transition-all"
        >
          {copied ? (
            <span className="text-replay-accent">Copied!</span>
          ) : (
            "Copy"
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => {
            const text = `Check out my music year on Replay — a GitHub-style graph of my listening history 🎵 ${profileUrl}`;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(twitterUrl, "_blank", "noopener,noreferrer");
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-replay-surface border border-replay-border py-2 text-[11px] text-replay-text-secondary hover:text-replay-text-primary hover:border-replay-text-muted transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-replay-surface border border-replay-border py-2 text-[11px] text-replay-text-secondary hover:text-replay-text-primary hover:border-replay-text-muted transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2" aria-hidden>
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copy link
        </button>
      </div>
    </div>
  );
}
