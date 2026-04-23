import type { Play, Era } from "@/types";
import { format, startOfWeek } from "date-fns";
import { rankKeysByCount } from "./utils";

interface WeekSummary {
  weekStart: string;
  dominantArtist: string;
  dominantArtistId: string;
  dominantAlbum: string | null;
  dominantAlbumId: string | null;
  albumImage: string | null;
  playCount: number;
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  tempoNorm: number;
  latestPlayAtMs: number;
}

function groupByWeek(plays: Play[]): Map<string, Play[]> {
  const weeks = new Map<string, Play[]>();
  for (const play of plays) {
    const d = new Date(play.playedAt);
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(monday, "yyyy-MM-dd");
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(play);
  }
  return weeks;
}

function summarizeWeek(weekStart: string, plays: Play[]): WeekSummary {
  const dominantArtist = rankKeysByCount(
    plays,
    (p) => p.artistName,
    { latestFn: (p) => new Date(p.playedAt).getTime() }
  )[0] ?? "Unknown";
  const dominantArtistId = rankKeysByCount(
    plays,
    (p) => p.artistId,
    { latestFn: (p) => new Date(p.playedAt).getTime() }
  )[0] ?? "";

  const artistPlays = plays.filter((p) => p.artistName === dominantArtist);
  const dominantAlbumId = rankKeysByCount(
    artistPlays,
    (p) => p.albumId,
    { latestFn: (p) => new Date(p.playedAt).getTime() }
  )[0] ?? null;
  const albumPlay = dominantAlbumId
    ? artistPlays.find((p) => p.albumId === dominantAlbumId)
    : null;

  const withFeatures = plays.filter(
    (p) =>
      p.valence !== null &&
      p.energy !== null &&
      p.danceability !== null &&
      p.acousticness !== null &&
      p.tempo !== null
  );
  const sample = withFeatures.length > 0 ? withFeatures : plays;
  const valence =
    sample.reduce((sum, p) => sum + (p.valence ?? 0.5), 0) / Math.max(sample.length, 1);
  const energy =
    sample.reduce((sum, p) => sum + (p.energy ?? 0.5), 0) / Math.max(sample.length, 1);
  const danceability =
    sample.reduce((sum, p) => sum + (p.danceability ?? 0.5), 0) / Math.max(sample.length, 1);
  const acousticness =
    sample.reduce((sum, p) => sum + (p.acousticness ?? 0.5), 0) / Math.max(sample.length, 1);
  const tempo =
    sample.reduce((sum, p) => sum + (p.tempo ?? 110), 0) / Math.max(sample.length, 1);
  const tempoNorm = Math.max(0, Math.min(1, (tempo - 60) / 120));
  const latestPlayAtMs = plays.reduce(
    (max, p) => Math.max(max, new Date(p.playedAt).getTime()),
    0
  );

  return {
    weekStart,
    dominantArtist,
    dominantArtistId,
    dominantAlbum: albumPlay?.albumName ?? null,
    dominantAlbumId,
    albumImage: albumPlay?.albumImage ?? null,
    playCount: plays.length,
    valence,
    energy,
    danceability,
    acousticness,
    tempoNorm,
    latestPlayAtMs,
  };
}

function eraLabel(summary: WeekSummary): string {
  const { dominantArtist, dominantAlbum } = summary;
  const energetic = summary.energy > 0.7 || summary.tempoNorm > 0.7;
  const introspective = summary.energy < 0.42 && summary.acousticness > 0.5;
  const warm = summary.valence > 0.62;
  const dark = summary.valence < 0.38 && summary.energy > 0.58;

  const term = energetic
    ? "arc"
    : introspective
      ? "drift"
      : dark
        ? "spiral"
        : warm
          ? "phase"
          : "era";

  if (dominantAlbum) {
    return `The ${dominantAlbum} ${term}`;
  }
  return `${dominantArtist} ${term}`;
}

export function detectEras(plays: Play[]): Era[] {
  if (plays.length === 0) return [];

  const sorted = [...plays].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );

  const weeks = groupByWeek(sorted);
  const weekKeys = Array.from(weeks.keys()).sort();

  const summaries: WeekSummary[] = weekKeys.map((k) =>
    summarizeWeek(k, weeks.get(k)!)
  );

  const weightedDistance = (a: WeekSummary, b: WeekSummary): number => {
    return (
      Math.abs(a.valence - b.valence) * 1.1 +
      Math.abs(a.energy - b.energy) * 1.2 +
      Math.abs(a.danceability - b.danceability) * 0.9 +
      Math.abs(a.acousticness - b.acousticness) * 0.9 +
      Math.abs(a.tempoNorm - b.tempoNorm) * 0.8
    );
  };

  const boundaries = new Set<number>([0]);
  for (let i = 1; i < summaries.length; i++) {
    const prev = summaries[i - 1];
    const curr = summaries[i];
    const artistChanged = prev.dominantArtistId !== curr.dominantArtistId;
    const albumChanged = prev.dominantAlbumId !== curr.dominantAlbumId;
    const drift = weightedDistance(prev, curr);

    // Calibrated boundary detection: identity shifts are meaningful but
    // should not overpower sonic continuity by default.
    const boundaryScore =
      (artistChanged ? 0.38 : 0) +
      (albumChanged ? 0.16 : 0) +
      Math.min(0.8, drift * 0.92);

    if (boundaryScore >= 0.74 || drift >= 0.66) {
      boundaries.add(i);
    }
  }
  boundaries.add(summaries.length);

  const sortedBounds = Array.from(boundaries).sort((a, b) => a - b);
  const eras: Era[] = [];

  for (let b = 0; b < sortedBounds.length - 1; b++) {
    const i = sortedBounds[b];
    const j = sortedBounds[b + 1];
    const spanWeeks = j - i;
    if (spanWeeks >= 2) {
      const segment = summaries.slice(i, j);
      const startSummary = segment[0];
      const endSummary = segment[segment.length - 1];
      const spanPlays = segment.flatMap((s) => weeks.get(s.weekStart) ?? []);
      const latestPlayAtMs = spanPlays.reduce(
        (max, p) => Math.max(max, new Date(p.playedAt).getTime()),
        0
      );

      const totalPlays = spanPlays.length;
      const representative = summarizeWeek(startSummary.weekStart, spanPlays);
      const label = eraLabel(representative);
      const confidence = clamp01(
        0.4 +
          Math.min(0.35, totalPlays / 220) +
          Math.min(0.25, spanWeeks / 8)
      );

      eras.push({
        startDate: startSummary.weekStart,
        endDate: format(new Date(latestPlayAtMs || endSummary.latestPlayAtMs), "yyyy-MM-dd"),
        label,
        dominantArtist: representative.dominantArtist,
        dominantAlbum: representative.dominantAlbum,
        albumImage: representative.albumImage,
        playCount: totalPlays,
        eraConfidence: confidence,
      });
    } else {
      // Preserve intense single-week shifts rather than dropping them.
      const segment = summaries.slice(i, j);
      const only = segment[0];
      const spanPlays = weeks.get(only.weekStart) ?? [];
      if (spanPlays.length >= 18) {
        const representative = summarizeWeek(only.weekStart, spanPlays);
        eras.push({
          startDate: only.weekStart,
          endDate: format(new Date(only.latestPlayAtMs), "yyyy-MM-dd"),
          label: eraLabel(representative),
          dominantArtist: representative.dominantArtist,
          dominantAlbum: representative.dominantAlbum,
          albumImage: representative.albumImage,
          playCount: spanPlays.length,
          eraConfidence: 0.52,
        });
      }
    }
  }

  return eras
    .sort((a, b) => {
      const aWeeks = Math.max(
        1,
        Math.round(
          (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        ) + 1
      );
      const bWeeks = Math.max(
        1,
        Math.round(
          (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        ) + 1
      );
      const aDensity = a.playCount / aWeeks;
      const bDensity = b.playCount / bWeeks;
      const aScore = aDensity * 0.65 + a.playCount * 0.35;
      const bScore = bDensity * 0.65 + b.playCount * 0.35;
      return bScore - aScore;
    })
    .slice(0, 6);
}

export function generateHeadline(plays: Play[]): string {
  if (plays.length === 0) {
    return "Building a listening history, one song at a time";
  }

  const eras = detectEras(plays);
  const topEra = eras[0];
  if (topEra) {
    if (topEra.dominantAlbum) {
      return `Currently in the ${topEra.dominantAlbum} phase`;
    }
    return `Currently in a ${topEra.dominantArtist} arc`;
  }

  const artistCounts = new Map<string, number>();
  for (const play of plays) {
    artistCounts.set(play.artistName, (artistCounts.get(play.artistName) ?? 0) + 1);
  }
  const topArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "music";
  return `${topArtist} on repeat lately`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
