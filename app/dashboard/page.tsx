import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateHeadline, detectEras } from "@/lib/era";
import { getTopArtistsFromPlays } from "@/lib/graph-data";
import Navbar from "@/components/layout/Navbar";
import ContributionGraph from "@/components/graph/ContributionGraph";
import SyncButton from "@/components/dashboard/SyncButton";
import type { Play } from "@/types";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const plays = await prisma.play.findMany({
    where: { userId: user.id },
    orderBy: { playedAt: "desc" },
    take: 5000,
  });

  const typedPlays = plays as unknown as Play[];

  const topArtists = getTopArtistsFromPlays(typedPlays, 3);
  const headline = generateHeadline(typedPlays);
  const eras = detectEras(typedPlays);
  const totalMinutes = Math.round(typedPlays.reduce((s, p) => s + p.durationMs / 60000, 0));

  const currentObsession = topArtists[0];

  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />

      <main className="pt-14">
        {/* Hero banner */}
        <div className="relative border-b border-replay-border hero-gradient">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-2">
                  Your replay
                </p>
                <h1 className="text-2xl font-bold text-replay-text-primary mb-2">
                  {user.displayName}
                </h1>
                {typedPlays.length > 0 ? (
                  <p className="text-sm text-replay-text-secondary italic max-w-sm">
                    "{headline}"
                  </p>
                ) : (
                  <p className="text-sm text-replay-text-muted">
                    Sync your Spotify history to get started
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <SyncButton />
                <Link
                  href={`/@${user.username}`}
                  className="rounded-full border border-replay-border bg-replay-card px-4 py-2 text-xs text-replay-text-secondary hover:text-replay-text-primary hover:border-replay-text-muted transition-all"
                >
                  View public profile ↗
                </Link>
              </div>
            </div>

            {/* Quick stats */}
            {typedPlays.length > 0 && (
              <div className="flex items-center gap-6 mt-8 pt-6 border-t border-replay-border flex-wrap">
                <QuickStat value={typedPlays.length.toLocaleString()} label="plays synced" />
                <QuickStat
                  value={`${Math.floor(totalMinutes / 60)}h`}
                  label="listened"
                />
                <QuickStat
                  value={new Set(typedPlays.map((p) => p.artistId)).size.toLocaleString()}
                  label="artists"
                />
                {currentObsession && (
                  <QuickStat value={currentObsession.artist} label="current obsession" highlight />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-10">
          {/* Contribution graph */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-replay-text-primary">
                {new Date().getFullYear()} listening history
              </h2>
              {typedPlays.length === 0 && (
                <span className="text-xs text-replay-text-muted">
                  Showing empty graph — sync to populate
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-replay-border bg-replay-card p-6">
              <ContributionGraph plays={typedPlays} />
            </div>
          </section>

          {/* Bottom grid */}
          {typedPlays.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Eras */}
              {eras.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-replay-text-primary mb-4">
                    Your eras
                  </h2>
                  <div className="space-y-2">
                    {eras.slice(0, 4).map((era, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-replay-card border border-replay-border"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 border border-replay-border"
                          style={{ backgroundColor: era.albumImage ? undefined : "#1DB954" + "33" }}
                        >
                          {era.albumImage && (
                            <img src={era.albumImage} className="w-full h-full object-cover rounded-lg" alt="" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-replay-text-primary truncate">{era.label}</p>
                          <p className="text-[10px] text-replay-text-muted">{era.playCount} plays</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Top artists */}
              {topArtists.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-replay-text-primary mb-4">
                    Top artists
                  </h2>
                  <div className="space-y-2">
                    {topArtists.map((artist, i) => (
                      <div
                        key={artist.artistId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-replay-card border border-replay-border"
                      >
                        <span className="text-[10px] text-replay-text-muted w-4 text-right flex-shrink-0 font-mono">
                          {i + 1}
                        </span>
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 border border-replay-border bg-replay-surface"
                        >
                          {artist.albumImage && (
                            <img src={artist.albumImage} className="w-full h-full object-cover rounded-full" alt="" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-replay-text-primary truncate">
                            {artist.artist}
                          </p>
                          <p className="text-[10px] text-replay-text-muted">
                            {artist.playCount} plays
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Empty state */}
          {typedPlays.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-replay-card border border-replay-border flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-replay-text-muted stroke-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-replay-text-primary mb-2">No plays yet</p>
              <p className="text-xs text-replay-text-muted mb-6">
                Hit sync to pull your recent Spotify listening history
              </p>
              <SyncButton />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuickStat({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div>
      <span className={`text-lg font-bold ${highlight ? "text-replay-accent" : "text-replay-text-primary"}`}>
        {value}
      </span>
      <span className="text-xs text-replay-text-muted ml-1.5">{label}</span>
    </div>
  );
}
