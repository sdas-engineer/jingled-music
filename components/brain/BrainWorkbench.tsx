"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import BrainScene from "@/components/brain/BrainScene";
import BrainChatPanel from "@/components/brain/BrainChatPanel";
import Modal from "@/components/ui/Modal";
import {
  buildBrainClusters,
  buildBrainSnapshot,
  buildDailyBrainSnapshots,
} from "@/lib/brain";
import type { Play } from "@/types";

interface BrainWorkbenchProps {
  plays: Play[];
}

type ViewMode = "recent" | "daily" | "cluster";

export default function BrainWorkbench({ plays }: BrainWorkbenchProps) {
  const [mode, setMode] = useState<ViewMode>("recent");
  const [resetSignal, setResetSignal] = useState(0);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [clusterModalId, setClusterModalId] = useState<string | null>(null);
  const [clusterSongView, setClusterSongView] = useState<"top10" | "all">("top10");
  const daily = useMemo(() => buildDailyBrainSnapshots(plays), [plays]);
  const clusters = useMemo(() => buildBrainClusters(plays, 4), [plays]);
  const [selectedDate, setSelectedDate] = useState<string>(daily[daily.length - 1]?.date ?? "");
  const [selectedCluster, setSelectedCluster] = useState<string>(clusters[0]?.id ?? "");

  useEffect(() => {
    if (daily.length > 0 && !daily.find((d) => d.date === selectedDate)) {
      setSelectedDate(daily[daily.length - 1].date);
    }
  }, [daily, selectedDate]);

  useEffect(() => {
    if (clusters.length > 0 && !clusters.find((c) => c.id === selectedCluster)) {
      setSelectedCluster(clusters[0].id);
    }
  }, [clusters, selectedCluster]);

  const activePlays = useMemo(() => {
    if (mode === "daily" && selectedDate) {
      const day = daily.find((d) => d.date === selectedDate);
      return day?.snapshot
        ? plays.filter((p) => format(new Date(p.playedAt), "yyyy-MM-dd") === selectedDate)
        : plays;
    }
    if (mode === "cluster" && selectedCluster) {
      const cluster = clusters.find((c) => c.id === selectedCluster);
      if (cluster) {
        const clusterPlays = plays.filter((p) => cluster.playIds.includes(p.id));
        return clusterPlays.length > 0 ? clusterPlays : plays;
      }
    }
    return plays;
  }, [mode, selectedDate, selectedCluster, daily, clusters, plays]);

  const snapshot = useMemo(() => buildBrainSnapshot(activePlays), [activePlays]);

  const topRegion = [...snapshot.regions].sort((a, b) => b.intensity - a.intensity)[0];
  const rankedRegions = [...snapshot.regions].sort((a, b) => b.intensity - a.intensity);
  const selectedClusterData = useMemo(
    () => clusters.find((cluster) => cluster.id === selectedCluster) ?? null,
    [clusters, selectedCluster]
  );
  const modalClusterData = useMemo(
    () => clusters.find((cluster) => cluster.id === clusterModalId) ?? null,
    [clusters, clusterModalId]
  );
  const modalClusterSongs = useMemo(() => {
    if (!modalClusterData) return [];
    const targetPlayIds = new Set(modalClusterData.playIds);
    const grouped = new Map<
      string,
      {
        trackId: string;
        trackName: string;
        artistName: string;
        playCount: number;
        lastPlayedAt: number;
      }
    >();
    for (const play of plays) {
      if (!targetPlayIds.has(play.id)) continue;
      const existing = grouped.get(play.trackId);
      const playedAtTs = new Date(play.playedAt).getTime();
      if (existing) {
        existing.playCount += 1;
        existing.lastPlayedAt = Math.max(existing.lastPlayedAt, playedAtTs);
      } else {
        grouped.set(play.trackId, {
          trackId: play.trackId,
          trackName: play.trackName,
          artistName: play.artistName,
          playCount: 1,
          lastPlayedAt: playedAtTs,
        });
      }
    }
    return Array.from(grouped.values())
      .sort((a, b) => (b.playCount === a.playCount ? b.lastPlayedAt - a.lastPlayedAt : b.playCount - a.playCount))
      .slice(0, 40);
  }, [modalClusterData, plays]);
  const visibleModalClusterSongs =
    clusterSongView === "top10" ? modalClusterSongs.slice(0, 10) : modalClusterSongs;

  const activeContextLabel =
    mode === "recent"
      ? `Recent · ${plays.length} plays`
      : mode === "daily"
        ? `By date · ${selectedDate || "N/A"}`
        : `Cluster · ${(clusters.find((c) => c.id === selectedCluster)?.label) ?? "N/A"}`;

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#05090f] overflow-hidden relative">
      <BrainScene
        regions={snapshot.regions}
        layoutMode="full"
        resetSignal={resetSignal}
      />

      <div className="absolute top-4 left-3 z-20 w-[460px] max-w-[calc(100%-1.5rem)] rounded-xl border border-cyan-400/20 bg-black/60 backdrop-blur-md p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 mb-2">
          {[
            ["recent", "Recent"],
            ["daily", "By date"],
            ["cluster", "Clusters"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id as ViewMode)}
              className={`rounded-md px-2.5 py-1 text-[11px] border transition-colors ${
                mode === id
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-black/35 text-replay-text-secondary hover:text-replay-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {mode === "daily" && daily.length > 0 && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[11px] text-replay-text-secondary"
            >
              {daily.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} ({d.playCount})
                </option>
              ))}
            </select>
          )}
          {mode === "cluster" && clusters.length > 0 && (
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[11px] text-replay-text-secondary"
            >
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.label} ({cluster.playCount})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] text-replay-text-muted">
              Tap a glowing node to inspect region details.
            </p>
            <p className="text-[10px] text-cyan-200/85 mt-1">{activeContextLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setResetSignal((s) => s + 1)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-cyan-400/20 bg-black/50 text-cyan-200/80 hover:text-cyan-100 hover:border-cyan-300/40 whitespace-nowrap"
          >
            Reset view
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-3 z-20 w-[320px] max-w-[calc(100%-1.5rem)] rounded-xl border border-cyan-400/20 bg-black/60 backdrop-blur-md p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <p className="text-[10px] uppercase tracking-widest text-replay-text-muted">Inferred state</p>
        <p className="text-sm font-semibold text-replay-text-primary mt-1">{snapshot.moodLabel}</p>
        <p className="text-xs text-replay-text-secondary mt-1">
          Top inferred signal: <span className="text-replay-text-primary">{topRegion?.label ?? "N/A"}</span>
        </p>
        <p className="text-[11px] text-replay-text-muted mt-1">
          Confidence: {Math.round(snapshot.confidence * 100)}%
        </p>
        <p className="text-xs text-cyan-200/90 mt-1.5">{snapshot.recommendation}</p>
        <p className="text-[10px] text-replay-text-muted mt-2">
          Experimental inference from listening features, not medical or neuroscience truth.
        </p>
        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
          {rankedRegions.map((region) => (
            <div key={region.id}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-replay-text-secondary">{region.label}</span>
                <span className="text-[10px] text-replay-text-muted">{Math.round(region.intensity * 100)}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(6, region.intensity * 100)}%`, backgroundColor: region.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isChatDrawerOpen && (
        <div className="fixed right-3 bottom-5 z-50 w-[320px] max-w-[calc(100%-1.5rem)]">
          <button
            type="button"
            onClick={() => setIsChatDrawerOpen(true)}
            className="w-full text-[11px] px-3 py-2 rounded-xl border border-[#1db954] bg-[#1db954] text-black font-semibold hover:bg-[#1ed760] hover:border-[#1ed760] transition-colors"
          >
            Jingled AI Agent
          </button>
        </div>
      )}

      {isChatDrawerOpen && (
        <button
          type="button"
          aria-label="Close chat drawer overlay"
          onClick={() => setIsChatDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px]"
        />
      )}

      <div
        className={`fixed top-0 right-0 z-40 h-screen w-[410px] max-w-[92vw] border-l border-cyan-400/20 bg-[#04080e]/98 backdrop-blur-md shadow-[-8px_0_24px_rgba(0,0,0,0.35)] transition-transform duration-300 ${
          isChatDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-cyan-400/20 bg-[#050b12]/95">
          <p className="text-xs font-semibold text-cyan-100">Jingled AI Agent</p>
          <button
            type="button"
            onClick={() => setIsChatDrawerOpen(false)}
            className="text-[11px] px-2.5 py-1 rounded-md border border-cyan-300/35 bg-black/45 text-cyan-100 hover:border-cyan-200/60"
          >
            Close
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto p-4">
          <BrainChatPanel
            mode={mode}
            selectedDate={mode === "daily" ? selectedDate : undefined}
            selectedCluster={mode === "cluster" ? selectedCluster : undefined}
            drawerMode
          />
        </div>
      </div>

      <div className="absolute bottom-16 left-3 z-20 w-[360px] max-h-[270px] max-w-[calc(100%-1.5rem)] rounded-xl border border-cyan-400/20 bg-[#070d17]/95 p-3 overflow-y-auto xl:w-[440px] md:bottom-14">
        <p className="text-[10px] uppercase tracking-widest text-replay-text-muted">Clusters</p>
        <div className="mt-2 space-y-2">
          {clusters.map((cluster) => {
            const active = cluster.id === selectedCluster;
            return (
              <button
                key={cluster.id}
                type="button"
                onClick={() => {
                  setMode("cluster");
                  setSelectedCluster(cluster.id);
                  setClusterSongView("top10");
                  setClusterModalId(cluster.id);
                }}
                className={`w-full text-left rounded-lg border px-2.5 py-2 transition-colors ${
                  active
                    ? "border-cyan-300/55 bg-cyan-400/10"
                    : "border-white/10 bg-black/25 hover:border-cyan-300/35"
                }`}
              >
                <p className="text-[11px] text-replay-text-primary truncate">{cluster.label}</p>
                <p className="text-[10px] text-replay-text-muted mt-0.5">
                  {cluster.playCount} plays {cluster.topArtists.length > 0 ? `· ${cluster.topArtists.slice(0, 2).join(", ")}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <Modal open={Boolean(modalClusterData)} onClose={() => setClusterModalId(null)}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-replay-text-muted">Cluster songs</p>
              <p className="text-sm font-semibold text-replay-text-primary mt-1">
                {modalClusterData?.label ?? "Cluster"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setClusterModalId(null)}
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-replay-text-secondary hover:text-replay-text-primary"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-replay-text-muted mt-2">
            {selectedClusterData?.moodLabel ?? modalClusterData?.moodLabel ?? "Cluster mood"} · {modalClusterSongs.length} songs
          </p>
          <div className="mt-2 inline-flex items-center rounded-md border border-white/10 bg-black/25 p-0.5">
            <button
              type="button"
              onClick={() => setClusterSongView("top10")}
              className={`px-2 py-1 text-[10px] rounded ${
                clusterSongView === "top10"
                  ? "bg-white/15 text-replay-text-primary"
                  : "text-replay-text-muted"
              }`}
            >
              Top 10
            </button>
            <button
              type="button"
              onClick={() => setClusterSongView("all")}
              className={`px-2 py-1 text-[10px] rounded ${
                clusterSongView === "all"
                  ? "bg-white/15 text-replay-text-primary"
                  : "text-replay-text-muted"
              }`}
            >
              All
            </button>
          </div>
          <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {visibleModalClusterSongs.map((song) => (
              <div key={song.trackId} className="rounded-md border border-white/10 bg-black/25 p-2">
                <p className="text-[12px] text-replay-text-primary">{song.trackName}</p>
                <p className="text-[11px] text-replay-text-muted">{song.artistName}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-cyan-200/80">{song.playCount} plays</span>
                  <a
                    href={`https://open.spotify.com/track/${song.trackId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 underline underline-offset-2 hover:text-blue-300"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
            {visibleModalClusterSongs.length === 0 && (
              <p className="text-xs text-replay-text-muted">No songs found for this cluster yet.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
