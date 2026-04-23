import { hashColor } from "@/lib/utils";

interface CurrentObsessionProps {
  artist: {
    artist: string;
    artistId: string;
    playCount: number;
    albumImage: string | null;
  };
}

export default function CurrentObsession({ artist }: CurrentObsessionProps) {
  const color = hashColor(artist.artistId);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-replay-border bg-replay-card p-6">
      {/* Background glow */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-4">
        Current obsession
      </p>

      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border border-replay-border"
          style={{ backgroundColor: color }}
        >
          {artist.albumImage && (
            <img
              src={artist.albumImage}
              alt={artist.artist}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-replay-text-primary leading-tight">
            {artist.artist}
          </p>
          <p className="text-sm text-replay-text-secondary mt-0.5">
            {artist.playCount.toLocaleString()} plays in your history
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-replay-border">
        <p className="text-xs text-replay-text-muted">
          Currently owned by{" "}
          <span className="text-replay-text-secondary font-medium">{artist.artist}</span>
        </p>
      </div>
    </div>
  );
}
