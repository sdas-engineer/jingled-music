"use client";

import { useState } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import Modal from "@/components/ui/Modal";
import type { Era } from "@/types";

interface ErasPanelProps {
  eras: Era[];
}

export default function ErasPanel({ eras }: ErasPanelProps) {
  const [activeEra, setActiveEra] = useState<Era | null>(null);

  if (eras.length === 0) return null;

  return (
    <>
      <section>
        <h2 className="text-sm font-semibold text-replay-text-primary mb-4">
          Your eras
        </h2>
        <div className="space-y-2">
          {eras.slice(0, 4).map((era, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveEra(era)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-replay-card border border-replay-border hover:border-replay-text-muted transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 border border-replay-border"
                style={{ backgroundColor: era.albumImage ? undefined : "#1DB95433" }}
              >
                {era.albumImage && (
                  <Image src={era.albumImage} className="w-full h-full object-cover rounded-lg" alt="" width={32} height={32} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-replay-text-primary truncate">{era.label}</p>
                <p className="text-[10px] text-replay-text-muted">
                  {era.playCount} plays · {Math.round(era.eraConfidence * 100)}% conf
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <Modal open={Boolean(activeEra)} onClose={() => setActiveEra(null)}>
        {activeEra && (
          <div className="p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-1">
              Era details
            </p>
            <h3 className="text-base sm:text-lg font-semibold text-replay-text-primary">
              {activeEra.label}
            </h3>
            <p className="text-xs text-replay-text-secondary mt-1">
              {format(parseISO(activeEra.startDate), "MMM d, yyyy")} - {format(parseISO(activeEra.endDate), "MMM d, yyyy")}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Stat label="Dominant artist" value={activeEra.dominantArtist} />
              <Stat label="Dominant album" value={activeEra.dominantAlbum ?? "N/A"} />
              <Stat label="Plays" value={String(activeEra.playCount)} />
              <Stat label="Confidence" value={`${Math.round(activeEra.eraConfidence * 100)}%`} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-replay-border bg-replay-surface p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-replay-text-muted mb-1">{label}</p>
      <p className="text-xs font-medium text-replay-text-primary truncate">{value}</p>
    </div>
  );
}

