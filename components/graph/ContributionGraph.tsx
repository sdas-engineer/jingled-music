"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO, isToday } from "date-fns";
import type { Play, DayData, WeekData, MonthLabel } from "@/types";
import { buildDayMap, buildYearGrid, getMonthLabels } from "@/lib/graph-data";
import DayCell from "./DayCell";
import DayModal from "./DayModal";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHOW_DAY_ROWS = [0, 2, 4]; // Mon, Wed, Fri

interface ContributionGraphProps {
  plays: Play[];
  year?: number;
  compact?: boolean;
}

export default function ContributionGraph({
  plays,
  year,
  compact = false,
}: ContributionGraphProps) {
  const fallbackYear = year ?? new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(plays.map((p) => new Date(p.playedAt).getFullYear()))).sort((a, b) => b - a);
    return years.length > 0 ? years : [fallbackYear];
  }, [plays, fallbackYear]);
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears.includes(fallbackYear) ? fallbackYear : availableYears[0]
  );
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dockedTrack, setDockedTrack] = useState<{ id: string; name: string; artist: string } | null>(null);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const { weeks, monthLabels, stats } = useMemo(() => {
    const dayMap = buildDayMap(plays);
    const weeks = buildYearGrid(selectedYear, dayMap);
    const monthLabels = getMonthLabels(selectedYear, weeks);
    const yearPrefix = `${selectedYear}-`;
    const yearPlays = plays.filter((p) => format(new Date(p.playedAt), "yyyy-MM-dd").startsWith(yearPrefix));

    const activeDays = yearPlays.length > 0
      ? new Set(yearPlays.map((p) => format(new Date(p.playedAt), "yyyy-MM-dd"))).size
      : 0;

    return {
      weeks,
      monthLabels,
      stats: { activeDays, totalPlays: yearPlays.length },
    };
  }, [plays, selectedYear]);

  const cellSize = compact ? 11 : 13;
  const gap = 3;
  const totalWidth = weeks.length * (cellSize + gap);

  return (
    <div className="w-full">
      <div className="lg:flex lg:items-start lg:gap-3">
        <div className="graph-container flex-1 min-w-0">
          <div style={{ minWidth: totalWidth + 32 }}>
          {/* Month labels */}
          <div className="flex ml-8 mb-1" style={{ gap: `${gap}px` }}>
            {monthLabels.map((label) => (
              <div
                key={label.label}
                className="text-[10px] text-replay-text-muted flex-shrink-0"
                style={{
                  marginLeft:
                    label === monthLabels[0]
                      ? label.weekIndex * (cellSize + gap)
                      : (label.weekIndex - (monthLabels[monthLabels.indexOf(label) - 1]?.weekIndex ?? 0) - 1) *
                        (cellSize + gap),
                }}
              >
                {label.label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div
              className="flex flex-col flex-shrink-0"
              style={{ gap: `${gap}px`, width: 28 }}
            >
              {DAY_LABELS.map((day, i) => (
                <div
                  key={day}
                  className="flex items-center justify-end pr-1.5"
                  style={{ height: cellSize }}
                >
                  {SHOW_DAY_ROWS.includes(i) && (
                    <span className="text-[9px] text-replay-text-muted">{day}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="relative" style={{ position: "relative" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: `repeat(7, ${cellSize}px)`,
                  gridAutoFlow: "column",
                  gap: `${gap}px`,
                }}
              >
                {weeks.map((week) =>
                  week.days.map((day, dayIdx) => {
                    const dateKey = day?.date;
                    const isT = dateKey ? isToday(parseISO(dateKey)) : false;
                    return (
                      <DayCell
                        key={`${week.weekIndex}-${dayIdx}`}
                        dayData={day}
                        today={isT}
                        onSelect={setSelectedDay}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
        <div className="mt-3 lg:mt-0 lg:w-[92px] lg:flex-shrink-0">
          <div className="rounded-lg border border-replay-border bg-replay-card overflow-hidden">
            {availableYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 transition-colors ${
                  y === selectedYear
                    ? "bg-replay-accent/20 text-replay-text-primary border-replay-accent/30"
                    : "text-replay-text-secondary border-replay-border hover:bg-replay-surface"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend & stats */}
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center gap-3 text-[10px] text-replay-text-muted">
          <span>{stats.activeDays} active days</span>
          <span>·</span>
          <span>{stats.totalPlays.toLocaleString()} plays</span>
          <span>·</span>
          <span>{selectedYear}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-replay-text-muted">Less</span>
          {[0.15, 0.35, 0.6, 0.85, 1].map((opacity) => (
            <div
              key={opacity}
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: `rgba(29, 185, 84, ${opacity})` }}
            />
          ))}
          <span className="text-[10px] text-replay-text-muted">More</span>
        </div>
      </div>

      <DayModal
        dayData={selectedDay}
        onClose={() => setSelectedDay(null)}
        onDockTrack={(track) => setDockedTrack(track)}
      />
      {dockedTrack && (
        <div className="fixed bottom-3 right-3 z-50 w-[min(92vw,360px)] rounded-xl border border-replay-border bg-black shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-replay-card border-b border-replay-border">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted">Now playing</p>
              <p className="text-xs text-replay-text-primary truncate">
                {dockedTrack.name} · {dockedTrack.artist}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDockedTrack(null)}
              className="text-[11px] text-replay-text-secondary hover:text-replay-text-primary"
              aria-label="Close docked player"
            >
              Close
            </button>
          </div>
          <iframe
            title="Docked Spotify track player"
            src={`https://open.spotify.com/embed/track/${dockedTrack.id}?utm_source=jingled&theme=0`}
            width="100%"
            height="152"
            className="block w-[calc(100%+2px)] h-[152px] -mx-px"
            style={{ border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
