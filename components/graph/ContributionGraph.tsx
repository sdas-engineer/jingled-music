"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isToday } from "date-fns";
import type { Play, DayData, WeekData, MonthLabel } from "@/types";
import { buildDayMap, buildYearGrid, getMonthLabels } from "@/lib/graph-data";
import DayCell from "./DayCell";
import DayModal from "./DayModal";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHOW_DAY_ROWS = [1, 3, 5]; // Mon, Wed, Fri

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
  const currentYear = year ?? new Date().getFullYear();
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const { weeks, monthLabels, stats } = useMemo(() => {
    const dayMap = buildDayMap(plays);
    const weeks = buildYearGrid(currentYear, dayMap);
    const monthLabels = getMonthLabels(currentYear, weeks);

    const activeDays = plays.length > 0
      ? new Set(plays.map((p) => format(new Date(p.playedAt), "yyyy-MM-dd"))).size
      : 0;

    return {
      weeks,
      monthLabels,
      stats: { activeDays, totalPlays: plays.length },
    };
  }, [plays, currentYear]);

  const cellSize = compact ? 11 : 13;
  const gap = 3;
  const totalWidth = weeks.length * (cellSize + gap);

  return (
    <div className="w-full">
      <div className="graph-container">
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

      {/* Legend & stats */}
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center gap-3 text-[10px] text-replay-text-muted">
          <span>{stats.activeDays} active days</span>
          <span>·</span>
          <span>{stats.totalPlays.toLocaleString()} plays</span>
          <span>·</span>
          <span>{currentYear}</span>
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

      <DayModal dayData={selectedDay} onClose={() => setSelectedDay(null)} />
    </div>
  );
}
