"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import type { DayData } from "@/types";
import { buildDayDetail } from "@/lib/graph-data";
import { getMoodColor, getMoodDescription } from "@/lib/mood";
import { formatDuration, hashColor } from "@/lib/utils";

interface DayModalProps {
  dayData: DayData | null;
  onClose: () => void;
  onDockTrack?: (track: { id: string; name: string; artist: string }) => void;
}

const TIMELINE_PAGE_SIZE = 8;

export default function DayModal({ dayData, onClose, onDockTrack }: DayModalProps) {
  const open = Boolean(dayData && dayData.totalPlays > 0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [timelinePage, setTimelinePage] = useState(0);

  const detail = dayData && open ? buildDayDetail(dayData.date, dayData) : null;
  const topTrackId = detail?.topTrack?.trackId;
  const selectedTrackId = activeTrackId ?? topTrackId ?? null;
  const canPlayDay = Boolean(selectedTrackId);
  const embedUrl = selectedTrackId
    ? `https://open.spotify.com/embed/track/${selectedTrackId}?utm_source=jingled&theme=0`
    : null;
  const totalTimelinePages = detail
    ? Math.ceil(detail.dayData.plays.length / TIMELINE_PAGE_SIZE)
    : 0;
  const sortedTimelinePlays = detail
    ? [...detail.dayData.plays]
      .sort(
        (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
      )
    : [];

  const pagedTimelinePlays = detail
    ? sortedTimelinePlays
      .slice(
      timelinePage * TIMELINE_PAGE_SIZE,
      timelinePage * TIMELINE_PAGE_SIZE + TIMELINE_PAGE_SIZE
    )
    : [];

  useEffect(() => {
    setShowPlayer(false);
    setActiveTrackId(null);
    setTimelinePage(0);
  }, [dayData?.date]);

  return (
    <Modal open={open} onClose={onClose}>
      {detail && (
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-1">
                {format(parseISO(detail.date), "EEEE, MMMM d · yyyy")}
              </p>
              <h2 className="text-base sm:text-lg font-semibold text-replay-text-primary leading-snug">
                What did this day sound like?
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-replay-text-muted hover:text-replay-text-secondary transition-colors ml-4 flex-shrink-0 mt-0.5"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Top track */}
          {detail.topTrack && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-replay-surface border border-replay-border mb-3.5">
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: detail.topTrack.albumImage
                    ? undefined
                    : hashColor(detail.topTrack.albumId),
                }}
              >
                {detail.topTrack.albumImage && (
                  <Image
                    src={detail.topTrack.albumImage}
                    alt={detail.topTrack.albumName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] text-replay-accent uppercase tracking-wider font-medium">
                    Top song
                  </span>
                </div>
                <p className="text-sm font-semibold text-replay-text-primary truncate leading-tight">
                  {detail.topTrack.trackName}
                </p>
                <p className="text-xs text-replay-text-secondary truncate">
                  {detail.topTrack.artistName} · {detail.topTrack.albumName}
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            <Stat label="Tracks" value={String(detail.dayData.totalPlays)} />
            <Stat label="Duration" value={formatDuration(detail.totalMinutes * 60000)} />
            <Stat label="Top artist" value={detail.topArtist ?? "—"} small />
          </div>

          {/* Mood */}
          <div className="p-3 rounded-xl bg-replay-surface border border-replay-border mb-3.5">
            <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-2">
              Dominant mood
            </p>
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-semibold"
                style={{ color: getMoodColor(detail.mood) }}
              >
                {detail.mood}
              </span>
              <span className="text-xs text-replay-text-muted max-w-[160px] text-right">
                {getMoodDescription(detail.mood)}
              </span>
            </div>
          </div>

          {/* Hour timeline */}
          {detail.dayData.plays.length > 0 && (
            <div className="mb-3.5">
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-3">
                Listening timeline (local time)
              </p>
              <div className="space-y-1">
                {pagedTimelinePlays.map((play, idx) => {
                  const playTrackId = play.trackId ?? null;
                  const isActive = selectedTrackId === playTrackId;
                  return (
                  <motion.div
                    key={play.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="text-[10px] text-replay-text-muted w-14 flex-shrink-0 font-mono">
                      {format(new Date(play.playedAt), "h:mm a")}
                    </span>
                    <button
                      type="button"
                      disabled={!playTrackId}
                      onClick={() => {
                        if (!playTrackId) return;
                        setActiveTrackId(playTrackId);
                        setShowPlayer(true);
                        onDockTrack?.({
                          id: playTrackId,
                          name: play.trackName,
                          artist: play.artistName,
                        });
                      }}
                      className={`flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-lg px-2 py-1.5 transition-colors ${
                        isActive
                          ? "bg-replay-accent/10 border border-replay-accent/20"
                          : "hover:bg-replay-surface border border-transparent"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hashColor(play.albumId) }}
                      />
                      <span className="text-xs text-replay-text-secondary truncate max-w-[38%]">
                        {play.artistName}
                      </span>
                      <span className="text-xs text-replay-text-muted truncate">
                        — {play.trackName}
                      </span>
                    </button>
                  </motion.div>
                );
                })}
              </div>
              {totalTimelinePages > 1 && (
                <div className="mt-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={timelinePage === 0}
                    onClick={() => setTimelinePage((p) => Math.max(0, p - 1))}
                    className="text-[11px] px-2 py-1 rounded-md text-replay-text-secondary hover:text-replay-text-primary hover:bg-replay-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="text-[10px] text-replay-text-muted">
                    Page {timelinePage + 1} / {totalTimelinePages}
                  </span>
                  <button
                    type="button"
                    disabled={timelinePage >= totalTimelinePages - 1}
                    onClick={() => setTimelinePage((p) => Math.min(totalTimelinePages - 1, p + 1))}
                    className="text-[11px] px-2 py-1 rounded-md text-replay-text-secondary hover:text-replay-text-primary hover:bg-replay-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-replay-border pt-3.5">
            {showPlayer && embedUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-replay-border bg-black">
                <div className="overflow-hidden bg-black">
                  <iframe
                    title="Spotify track player"
                    src={embedUrl}
                    width="100%"
                    height="152"
                    className="block w-[calc(100%+2px)] h-[152px] -mx-px"
                    style={{ border: 0 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
            <span className="text-[10px] text-replay-text-muted">
              {detail.dayData.totalPlays} plays across{" "}
              {new Set(detail.dayData.plays.map((p) => p.albumId)).size} albums
            </span>
            <button
              type="button"
              disabled={!canPlayDay}
              onClick={() => {
                if (!canPlayDay) return;
                if (selectedTrackId) {
                  const selectedPlay = detail.dayData.plays.find((p) => p.trackId === selectedTrackId) ?? detail.topTrack;
                  if (selectedPlay) {
                    onDockTrack?.({
                      id: selectedPlay.trackId,
                      name: selectedPlay.trackName,
                      artist: selectedPlay.artistName,
                    });
                  }
                }
                setShowPlayer((v) => !v);
              }}
              className="text-xs text-replay-accent hover:text-replay-accent/80 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {showPlayer ? "Hide player" : "Play this day"}
            </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="p-2.5 rounded-xl bg-replay-surface border border-replay-border text-center">
      <p className="text-[9px] uppercase tracking-wider text-replay-text-muted mb-1">{label}</p>
      <p className={`font-semibold text-replay-text-primary truncate ${small ? "text-xs" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}
