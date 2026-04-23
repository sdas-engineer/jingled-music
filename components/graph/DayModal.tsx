"use client";

import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import type { DayData } from "@/types";
import { buildDayDetail } from "@/lib/graph-data";
import { getMoodColor, getMoodDescription } from "@/lib/mood";
import { formatDuration, formatHour, hashColor } from "@/lib/utils";

interface DayModalProps {
  dayData: DayData | null;
  onClose: () => void;
}

export default function DayModal({ dayData, onClose }: DayModalProps) {
  const open = Boolean(dayData && dayData.totalPlays > 0);

  const detail = dayData && open ? buildDayDetail(dayData.date, dayData) : null;

  return (
    <Modal open={open} onClose={onClose}>
      {detail && (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-1">
                {format(parseISO(detail.date), "EEEE, MMMM d · yyyy")}
              </p>
              <h2 className="text-lg font-semibold text-replay-text-primary leading-snug">
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-replay-surface border border-replay-border mb-4">
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: detail.topTrack.albumImage
                    ? undefined
                    : hashColor(detail.topTrack.albumId),
                }}
              >
                {detail.topTrack.albumImage && (
                  <img
                    src={detail.topTrack.albumImage}
                    alt={detail.topTrack.albumName}
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
                <p className="text-sm font-semibold text-replay-text-primary truncate">
                  {detail.topTrack.trackName}
                </p>
                <p className="text-xs text-replay-text-secondary truncate">
                  {detail.topTrack.artistName} · {detail.topTrack.albumName}
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Tracks" value={String(detail.dayData.totalPlays)} />
            <Stat label="Duration" value={formatDuration(detail.totalMinutes * 60000)} />
            <Stat label="Top artist" value={detail.topArtist ?? "—"} small />
          </div>

          {/* Mood */}
          <div className="p-3 rounded-xl bg-replay-surface border border-replay-border mb-4">
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
          {detail.hourBlocks.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-3">
                Listening timeline
              </p>
              <div className="space-y-1.5">
                {detail.hourBlocks.slice(0, 8).map((block) => (
                  <motion.div
                    key={block.hour}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: block.hour * 0.02 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-[10px] text-replay-text-muted w-12 flex-shrink-0 font-mono">
                      {formatHour(block.hour)}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: block.albumColor }}
                    />
                    <span className="text-xs text-replay-text-secondary truncate">
                      {block.artist}
                    </span>
                    {block.trackName && (
                      <span className="text-xs text-replay-text-muted truncate">
                        — {block.trackName}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-replay-border pt-4 flex items-center justify-between">
            <span className="text-[10px] text-replay-text-muted">
              {detail.dayData.totalPlays} plays across{" "}
              {new Set(detail.dayData.plays.map((p) => p.albumId)).size} albums
            </span>
            <button className="text-xs text-replay-accent hover:text-replay-accent/80 transition-colors font-medium">
              Play this day ↗
            </button>
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
