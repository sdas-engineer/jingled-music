import { format, parseISO } from "date-fns";
import type { Era } from "@/types";
import { hashColor } from "@/lib/utils";

interface TopErasProps {
  eras: Era[];
}

export default function TopEras({ eras }: TopErasProps) {
  if (eras.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-widest text-replay-text-muted">
          Your eras
        </p>
        <p className="text-[10px] text-replay-text-muted">{eras.length} detected</p>
      </div>

      <div className="space-y-2">
        {eras.map((era, i) => {
          const color = hashColor(era.dominantArtist);
          const start = format(parseISO(era.startDate), "MMM ''yy");
          const end = format(parseISO(era.endDate), "MMM ''yy");

          return (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-replay-surface border border-replay-border hover:border-replay-hover transition-colors"
            >
              <div
                className="w-1.5 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden border border-replay-border"
                style={{ backgroundColor: color }}
              >
                {era.albumImage && (
                  <img src={era.albumImage} alt={era.label} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-replay-text-primary truncate">
                  {era.label}
                </p>
                <p className="text-[10px] text-replay-text-muted">
                  {start} → {end}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium text-replay-text-secondary">
                  {era.playCount}
                </p>
                <p className="text-[9px] text-replay-text-muted">plays</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
