"use client";

import type { BrainChatSongCard } from "@/types";

interface SongCardListProps {
  songCards: BrainChatSongCard[];
  quickAddBusyId: string | null;
  onQuickAdd: (trackId: string) => void;
}

export default function SongCardList({ songCards, quickAddBusyId, onQuickAdd }: SongCardListProps) {
  if (songCards.length === 0) return null;

  return (
    <div className="space-y-4 pt-1">
      {songCards.map((card) => (
        <div key={card.trackId} className="min-w-0 max-w-full">
          <p className="text-xs text-replay-text-primary mb-1">{card.trackName}</p>
          <p className="text-[11px] text-replay-text-muted mb-1.5">{card.artistName}</p>
          <div className="bg-black overflow-hidden min-h-[152px] rounded-none">
            <iframe
              src={`https://open.spotify.com/embed/track/${card.trackId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block w-full border-0 bg-transparent rounded-none"
              style={{ borderRadius: 0 }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.open(card.spotifyUrl, "_blank", "noopener,noreferrer")}
              className="text-[11px] px-2 py-1 border border-white/15 text-replay-text-secondary hover:text-replay-text-primary"
            >
              Play on Spotify
            </button>
            <button
              type="button"
              onClick={() => onQuickAdd(card.trackId)}
              disabled={quickAddBusyId === card.trackId}
              className="text-[11px] px-2 py-1 border border-white/15 text-replay-text-secondary hover:text-replay-text-primary disabled:opacity-50"
            >
              {quickAddBusyId === card.trackId ? "Adding..." : "Add to Quick Picks"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
