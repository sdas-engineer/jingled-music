"use client";

import { useMemo } from "react";
import Link from "next/link";
import { generateMockPlays } from "@/lib/mock-data";
import { detectEras, generateHeadline } from "@/lib/era";
import { getTopArtistsFromPlays } from "@/lib/graph-data";
import { hashColor } from "@/lib/utils";
import ContributionGraph from "@/components/graph/ContributionGraph";
import TopEras from "@/components/profile/TopEras";
import type { Play } from "@/types";

export default function DemoProfileView() {
  const { plays, headline, eras, topArtists, stats } = useMemo(() => {
    const plays = generateMockPlays() as Play[];
    const headline = generateHeadline(plays);
    const eras = detectEras(plays);
    const topArtists = getTopArtistsFromPlays(plays, 5);
    const totalMinutes = Math.round(plays.reduce((s, p) => s + p.durationMs / 60000, 0));
    const stats = {
      totalPlays: plays.length,
      totalMinutes,
      uniqueTracks: new Set(plays.map((p) => p.trackId)).size,
      uniqueArtists: new Set(plays.map((p) => p.artistId)).size,
    };
    return { plays, headline, eras, topArtists, stats };
  }, []);

  const primaryColor = topArtists[0] ? hashColor(topArtists[0].artistId) : "#1DB954";

  return (
    <>
      {/* Demo banner */}
      <div className="sticky top-14 z-30 bg-replay-accent/10 border-b border-replay-accent/20 px-6 py-2.5 flex items-center justify-between">
        <p className="text-xs text-replay-accent font-medium">
          Demo profile — sample data, not your real history
        </p>
        <Link
          href="/api/auth/login"
          className="text-xs font-semibold text-replay-accent hover:text-replay-accent/80 transition-colors"
        >
          Connect your Spotify →
        </Link>
      </div>

      {/* Profile hero */}
      <div className="relative border-b border-replay-border hero-gradient">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-replay-border"
                style={{ backgroundColor: primaryColor + "33", color: primaryColor }}
              >
                F
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-replay-accent rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-black">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-replay-text-primary">Demo User</h1>
                <span className="text-sm text-replay-text-muted">@demo</span>
                <span className="text-[10px] border border-replay-border bg-replay-card rounded-full px-2 py-0.5 text-replay-text-muted">
                  sample profile
                </span>
              </div>
              <p className="text-sm text-replay-text-secondary italic max-w-sm">"{headline}"</p>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-8 pt-6 border-t border-replay-border flex-wrap">
            <Stat value={stats.totalPlays.toLocaleString()} label="plays" />
            <Stat value={`${Math.floor(stats.totalMinutes / 60)}h`} label="listened" />
            <Stat value={stats.uniqueTracks.toLocaleString()} label="tracks" />
            <Stat value={stats.uniqueArtists.toLocaleString()} label="artists" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10 space-y-12">
        {/* Graph */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-replay-text-primary">
              {new Date().getFullYear()} listening calendar
            </h2>
            <span className="text-xs text-replay-text-muted">click any day</span>
          </div>
          <div className="rounded-2xl border border-replay-border bg-replay-card p-6">
            <ContributionGraph plays={plays} />
          </div>
        </section>

        {/* Eras + top artists */}
        <div className="grid sm:grid-cols-2 gap-10">
          {eras.length > 0 && <TopEras eras={eras.slice(0, 4)} />}

          <div>
            <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-4">
              Most played artists
            </p>
            <div className="space-y-2">
              {topArtists.map((artist, i) => (
                <div key={artist.artistId} className="flex items-center gap-3 p-3 rounded-xl bg-replay-card border border-replay-border">
                  <span className="text-[10px] text-replay-text-muted w-4 text-right font-mono">{i + 1}</span>
                  <div
                    className="w-8 h-8 rounded-full border border-replay-border flex-shrink-0"
                    style={{ backgroundColor: hashColor(artist.artistId) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-replay-text-primary truncate">{artist.artist}</p>
                    <p className="text-[10px] text-replay-text-muted">{artist.playCount} plays</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-replay-accent/20 bg-replay-accent/5 p-8 text-center">
          <h3 className="text-lg font-bold text-replay-text-primary mb-2">
            See your real listening history
          </h3>
          <p className="text-sm text-replay-text-muted mb-6">
            Connect Spotify and get your personalized Replay profile in seconds.
          </p>
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2.5 rounded-full bg-replay-accent px-6 py-3 text-sm font-semibold text-black hover:bg-replay-accent/90 transition-all glow-green"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Start your Replay
          </Link>
        </div>
      </div>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <span className="text-xl font-bold text-replay-text-primary">{value}</span>
      <span className="text-sm text-replay-text-muted ml-1.5">{label}</span>
    </div>
  );
}
