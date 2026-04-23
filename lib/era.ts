import type { Play, Era } from "@/types";
import { format, parseISO, addDays } from "date-fns";
import { hashColor } from "./utils";

interface WeekSummary {
  weekStart: string;
  dominantArtist: string;
  dominantArtistId: string;
  dominantAlbum: string | null;
  dominantAlbumId: string | null;
  albumImage: string | null;
  playCount: number;
}

function groupByWeek(plays: Play[]): Map<string, Play[]> {
  const weeks = new Map<string, Play[]>();
  for (const play of plays) {
    const d = new Date(play.playedAt);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    const key = format(monday, "yyyy-MM-dd");
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(play);
  }
  return weeks;
}

function dominantEntity<T extends string>(
  entries: T[]
): T | null {
  const counts = new Map<T, number>();
  for (const e of entries) counts.set(e, (counts.get(e) ?? 0) + 1);
  let max = 0;
  let winner: T | null = null;
  for (const [k, v] of counts) {
    if (v > max) {
      max = v;
      winner = k;
    }
  }
  return winner;
}

function summarizeWeek(weekStart: string, plays: Play[]): WeekSummary {
  const dominantArtist = dominantEntity(plays.map((p) => p.artistName)) ?? "Unknown";
  const dominantArtistId = dominantEntity(plays.map((p) => p.artistId)) ?? "";

  const artistPlays = plays.filter((p) => p.artistName === dominantArtist);
  const dominantAlbumId = dominantEntity(artistPlays.map((p) => p.albumId));
  const albumPlay = dominantAlbumId
    ? artistPlays.find((p) => p.albumId === dominantAlbumId)
    : null;

  return {
    weekStart,
    dominantArtist,
    dominantArtistId,
    dominantAlbum: albumPlay?.albumName ?? null,
    dominantAlbumId,
    albumImage: albumPlay?.albumImage ?? null,
    playCount: plays.length,
  };
}

function eraLabel(summary: WeekSummary): string {
  const { dominantArtist, dominantAlbum } = summary;

  const albumTerms = ["spiral", "era", "phase", "arc", "period"];
  const artistTerms = ["era", "arc", "season", "chapter"];

  if (dominantAlbum) {
    const term = albumTerms[Math.abs(dominantAlbum.charCodeAt(0)) % albumTerms.length];
    return `The ${dominantAlbum} ${term}`;
  }
  const term = artistTerms[Math.abs(dominantArtist.charCodeAt(0)) % artistTerms.length];
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

  const eras: Era[] = [];
  let i = 0;

  while (i < summaries.length) {
    let j = i + 1;
    while (
      j < summaries.length &&
      summaries[j].dominantArtistId === summaries[i].dominantArtistId
    ) {
      j++;
    }

    const spanWeeks = j - i;
    if (spanWeeks >= 2) {
      const startSummary = summaries[i];
      const endSummary = summaries[j - 1];
      const endDate = addDays(parseISO(endSummary.weekStart), 6);

      const spanPlays = summaries
        .slice(i, j)
        .flatMap((s) => weeks.get(s.weekStart) ?? []);

      const totalPlays = spanPlays.length;
      const label = eraLabel(startSummary);

      eras.push({
        startDate: startSummary.weekStart,
        endDate: format(endDate, "yyyy-MM-dd"),
        label,
        dominantArtist: startSummary.dominantArtist,
        dominantAlbum: startSummary.dominantAlbum,
        albumImage: startSummary.albumImage,
        playCount: totalPlays,
      });
    }

    i = j;
  }

  return eras.sort((a, b) => b.playCount - a.playCount).slice(0, 6);
}

export function generateHeadline(plays: Play[]): string {
  if (plays.length === 0) {
    return "Building a listening history, one song at a time";
  }

  const artistCounts = new Map<string, number>();
  for (const play of plays) {
    artistCounts.set(play.artistName, (artistCounts.get(play.artistName) ?? 0) + 1);
  }

  let topArtist = "music";
  let topCount = 0;
  for (const [artist, count] of artistCounts) {
    if (count > topCount) {
      topCount = count;
      topArtist = artist;
    }
  }

  const templates = [
    `Permanently in a ${topArtist} recovery cycle`,
    `Currently serving a life sentence in the ${topArtist} mines`,
    `Professional ${topArtist} apologist`,
    `${topArtist} subscriber. No thoughts, just vibes.`,
    `Emotionally sponsored by ${topArtist}`,
    `${topArtist} is the answer to questions I haven't asked yet`,
    `Running on ${topArtist} and questionable decisions`,
  ];

  const idx = topArtist.charCodeAt(0) % templates.length;
  return templates[idx];
}
