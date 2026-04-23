"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { generateMockPlays, MOCK_ALBUMS } from "@/lib/mock-data";
import { buildDayMap, buildYearGrid, getMonthLabels } from "@/lib/graph-data";
import { hashColor } from "@/lib/utils";

export default function LandingGraph() {
  const { weeks, monthLabels } = useMemo(() => {
    const plays = generateMockPlays();
    const year = new Date().getFullYear();
    const dayMap = buildDayMap(plays);
    const weeks = buildYearGrid(year, dayMap);
    const monthLabels = getMonthLabels(year, weeks);
    return { weeks, monthLabels };
  }, []);

  const cellSize = 12;
  const gap = 3;

  return (
    <div className="overflow-x-auto pb-2">
      <div style={{ minWidth: weeks.length * (cellSize + gap) + 32 }}>
        {/* Month labels */}
        <div className="flex ml-8 mb-1.5" style={{ gap: `${gap}px` }}>
          {monthLabels.map((label, i) => (
            <div
              key={label.label}
              className="text-[9px] text-replay-text-muted flex-shrink-0"
              style={{
                marginLeft:
                  i === 0
                    ? label.weekIndex * (cellSize + gap)
                    : (label.weekIndex - (monthLabels[i - 1]?.weekIndex ?? 0) - 1) * (cellSize + gap),
              }}
            >
              {label.label}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col flex-shrink-0" style={{ gap: `${gap}px`, width: 28 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-end pr-1.5"
                style={{ height: cellSize }}
              >
                {[1, 3, 5].includes(i) && (
                  <span className="text-[8px] text-replay-text-muted">{d}</span>
                )}
              </div>
            ))}
          </div>

          {/* Cells */}
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
                const album = day?.dominantAlbum;
                const isEmpty = !day || day.totalPlays === 0;

                const style: React.CSSProperties = {
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 2,
                };

                if (isEmpty) {
                  style.backgroundColor = "#161616";
                  style.border = "1px solid #1f1f1f";
                } else if (album?.color) {
                  style.backgroundColor = album.color;
                  // intensity based on play count
                  const intensity = Math.min(1, day.totalPlays / 8);
                  style.opacity = 0.4 + intensity * 0.6;
                }

                return (
                  <div
                    key={`${week.weekIndex}-${dayIdx}`}
                    style={style}
                    title={day?.date ? format(new Date(day.date), "MMM d") : undefined}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Album legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-replay-border">
          {MOCK_ALBUMS.slice(0, 6).map((album) => (
            <div key={album.id} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: album.color }}
              />
              <span className="text-[9px] text-replay-text-muted whitespace-nowrap">
                {album.name}
              </span>
            </div>
          ))}
          <span className="text-[9px] text-replay-text-muted ml-auto">+ {MOCK_ALBUMS.length - 6} more</span>
        </div>
      </div>
    </div>
  );
}
