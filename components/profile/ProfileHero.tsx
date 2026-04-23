import Image from "next/image";
import type { PublicProfile } from "@/types";

interface ProfileHeroProps {
  profile: PublicProfile;
  stats: {
    totalPlays: number;
    totalMinutes: number;
    uniqueTracks: number;
    uniqueArtists: number;
  };
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  return `${hours}h`;
}

export default function ProfileHero({ profile, stats }: ProfileHeroProps) {
  return (
    <div className="relative pt-24 pb-12 px-6 hero-gradient">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-replay-card border-2 border-replay-border">
              {profile.profileImage ? (
                <Image
                  src={profile.profileImage}
                  alt={profile.displayName}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-replay-text-muted">
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-replay-accent rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-black">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-replay-text-primary tracking-tight">
                {profile.displayName}
              </h1>
              <span className="text-sm text-replay-text-muted">@{profile.username}</span>
            </div>
            <p className="text-sm sm:text-base text-replay-text-secondary italic leading-relaxed max-w-lg">
              &ldquo;{profile.headline}&rdquo;
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-8 pt-6 border-t border-replay-border flex-wrap">
          <StatItem value={stats.totalPlays.toLocaleString()} label="plays" />
          <StatItem value={formatMinutes(stats.totalMinutes)} label="listened" />
          <StatItem value={stats.uniqueTracks.toLocaleString()} label="tracks" />
          <StatItem value={stats.uniqueArtists.toLocaleString()} label="artists" />
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <span className="text-xl font-bold text-replay-text-primary">{value}</span>
      <span className="text-sm text-replay-text-muted ml-1.5">{label}</span>
    </div>
  );
}
