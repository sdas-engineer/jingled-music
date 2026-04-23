import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildDayMap, buildYearGrid, getMonthLabels, getTopArtistsFromPlays } from "@/lib/graph-data";
import { detectEras, generateHeadline } from "@/lib/era";
import Navbar from "@/components/layout/Navbar";
import ProfileHero from "@/components/profile/ProfileHero";
import ContributionGraph from "@/components/graph/ContributionGraph";
import CurrentObsession from "@/components/profile/CurrentObsession";
import TopEras from "@/components/profile/TopEras";
import ShareCard from "@/components/profile/ShareCard";
import type { Play } from "@/types";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const slug = username.startsWith("@") ? username.slice(1) : username;

  const user = await prisma.user.findUnique({
    where: { username: slug },
    select: { displayName: true, profile: true },
  });

  if (!user) return { title: "Profile not found" };

  return {
    title: `${user.displayName} on Replay`,
    description: `What did ${user.displayName}'s year sound like? See their full listening history on Replay.`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const slug = username.startsWith("@") ? username.slice(1) : username;

  const user = await prisma.user.findUnique({
    where: { username: slug },
    include: {
      profile: true,
      plays: {
        orderBy: { playedAt: "desc" },
        take: 5000,
      },
    },
  });

  if (!user || !user.profile?.isPublic) {
    notFound();
  }

  const typedPlays = user.plays as unknown as Play[];
  const year = new Date().getFullYear();
  const eras = detectEras(typedPlays);
  const topArtists = getTopArtistsFromPlays(typedPlays, 5);
  const headline = user.profile.headline ?? generateHeadline(typedPlays);

  const totalMinutes = Math.round(typedPlays.reduce((s, p) => s + p.durationMs / 60000, 0));
  const stats = {
    totalPlays: typedPlays.length,
    totalMinutes,
    uniqueTracks: new Set(typedPlays.map((p) => p.trackId)).size,
    uniqueArtists: new Set(typedPlays.map((p) => p.artistId)).size,
  };

  const profile = {
    username: user.username,
    displayName: user.displayName,
    profileImage: user.profileImage,
    headline,
    joinedAt: user.createdAt,
  };

  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />

      <main className="pt-14">
        <ProfileHero profile={profile} stats={stats} />

        <div className="mx-auto max-w-4xl px-6 py-10 space-y-12">
          {/* Contribution graph */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-replay-text-primary">
                {year} listening calendar
              </h2>
              <span className="text-xs text-replay-text-muted">
                {stats.totalPlays.toLocaleString()} plays
              </span>
            </div>
            <div className="rounded-2xl border border-replay-border bg-replay-card p-6">
              <ContributionGraph plays={typedPlays} year={year} />
            </div>
          </section>

          {/* Side sections */}
          <div className="grid sm:grid-cols-2 gap-6">
            {topArtists[0] && (
              <CurrentObsession artist={topArtists[0]} />
            )}
            <ShareCard username={user.username} displayName={user.displayName} />
          </div>

          {/* Eras */}
          {eras.length > 0 && (
            <section>
              <TopEras eras={eras} />
            </section>
          )}

          {/* Top artists */}
          {topArtists.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-4">
                Most played artists
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {topArtists.map((artist, i) => (
                  <div
                    key={artist.artistId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-replay-card border border-replay-border"
                  >
                    <span className="text-[10px] text-replay-text-muted w-4 text-right flex-shrink-0 font-mono">
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-replay-surface border border-replay-border flex-shrink-0">
                      {artist.albumImage && (
                        <img src={artist.albumImage} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-replay-text-primary truncate">
                        {artist.artist}
                      </p>
                      <p className="text-[10px] text-replay-text-muted">
                        {artist.playCount.toLocaleString()} plays
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {typedPlays.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-replay-text-muted">
                {user.displayName} hasn't synced their listening history yet.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-replay-border px-6 py-8 mt-12">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded bg-replay-accent flex items-center justify-center">
              <span className="text-[10px] font-black text-black">R</span>
            </div>
            <span className="text-xs text-replay-text-muted group-hover:text-replay-text-secondary transition-colors">
              Replay
            </span>
          </a>
          <p className="text-[11px] text-replay-text-muted">
            Build your own at replay.app
          </p>
        </div>
      </footer>
    </div>
  );
}
