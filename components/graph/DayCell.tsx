"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import type { DayData } from "@/types";
import { cn, formatDuration } from "@/lib/utils";

interface DayCellProps {
  dayData: DayData | null;
  today?: boolean;
  onSelect: (day: DayData) => void;
}

interface TooltipState {
  x: number;
  y: number;
  visible: boolean;
}

export default function DayCell({ dayData, today, onSelect }: DayCellProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, visible: false });
  const ref = useRef<HTMLDivElement>(null);

  const isEmpty = !dayData || dayData.totalPlays === 0;
  const album = dayData?.dominantAlbum;

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!dayData || isEmpty) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, visible: true });
  };

  const handleMouseLeave = () => {
    setTooltip((t) => ({ ...t, visible: false }));
  };

  const handleClick = () => {
    if (dayData && !isEmpty) onSelect(dayData);
  };

  const cellStyle: React.CSSProperties = {};
  if (album?.image) {
    cellStyle.backgroundImage = `url(${album.image})`;
    cellStyle.backgroundSize = "cover";
    cellStyle.backgroundPosition = "center";
  } else if (album?.color) {
    cellStyle.backgroundColor = album.color;
  }

  return (
    <>
      <div
        ref={ref}
        role={isEmpty ? undefined : "button"}
        tabIndex={isEmpty ? -1 : 0}
        aria-label={
          dayData
            ? `${format(parseISO(dayData.date), "MMM d, yyyy")} — ${dayData.totalPlays} plays`
            : undefined
        }
        className={cn(
          "day-cell",
          isEmpty ? "day-cell-empty cursor-default" : "cursor-pointer",
          today && "ring-1 ring-replay-accent ring-offset-1 ring-offset-replay-bg"
        )}
        style={cellStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      />
      {tooltip.visible && dayData && (
        <DayTooltip dayData={dayData} x={tooltip.x} y={tooltip.y} />
      )}
    </>
  );
}

function DayTooltip({ dayData, x, y }: { dayData: DayData; x: number; y: number }) {
  const album = dayData.dominantAlbum;
  const dateLabel = format(parseISO(dayData.date), "EEEE, MMM d");

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: x,
        top: y - 8,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="glass-card rounded-xl p-3 min-w-[200px] shadow-2xl">
        <div className="flex items-center gap-2.5 mb-2">
          {album?.image ? (
            <Image
              src={album.image}
              alt={album.name}
              width={36}
              height={36}
              className="w-9 h-9 rounded object-cover flex-shrink-0"
            />
          ) : album ? (
            <div
              className="w-9 h-9 rounded flex-shrink-0"
              style={{ backgroundColor: album.color }}
            />
          ) : null}
          {album && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-replay-text-primary truncate leading-tight">
                {album.name}
              </p>
              <p className="text-[10px] text-replay-text-secondary truncate">
                {album.artist}
              </p>
            </div>
          )}
        </div>
        <div className="border-t border-replay-border pt-2 flex items-center justify-between">
          <span className="text-[10px] text-replay-text-muted">{dateLabel}</span>
          <span className="text-[10px] text-replay-text-secondary">
            {dayData.totalPlays} plays · {formatDuration(dayData.totalMinutes * 60000)}
          </span>
        </div>
      </div>
      <div className="w-2 h-2 glass-card rotate-45 mx-auto -mt-1" />
    </div>
  );
}
