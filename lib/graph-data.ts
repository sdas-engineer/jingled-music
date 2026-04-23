import {
  format,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  getMonth,
} from "date-fns";
import type { Play, DayData, WeekData, MonthLabel, AlbumSummary, HourBlock, DayDetail } from "@/types";
import { hashColor } from "./utils";
import { detectDayMood } from "./mood";

export function buildDayMap(plays: Play[]): Map<string, DayData> {
  const dayMap = new Map<string, DayData>();

  for (const play of plays) {
    const dateKey = format(new Date(play.playedAt), "yyyy-MM-dd");

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        plays: [],
        totalPlays: 0,
        totalMinutes: 0,
        dominantAlbum: null,
      });
    }

    const day = dayMap.get(dateKey)!;
    day.plays.push(play);
    day.totalPlays++;
    day.totalMinutes += play.durationMs / 60000;
  }

  for (const [, day] of dayMap) {
    day.totalMinutes = Math.round(day.totalMinutes);
    day.dominantAlbum = findDominantAlbum(day.plays);
  }

  return dayMap;
}

function findDominantAlbum(plays: Play[]): AlbumSummary | null {
  if (plays.length === 0) return null;

  const albumCounts = new Map<string, { count: number; play: Play }>();
  for (const play of plays) {
    const key = play.albumId;
    if (!albumCounts.has(key)) {
      albumCounts.set(key, { count: 0, play });
    }
    albumCounts.get(key)!.count++;
  }

  let maxCount = 0;
  let dominantPlay: Play | null = null;
  for (const { count, play } of albumCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
      dominantPlay = play;
    }
  }

  if (!dominantPlay) return null;

  return {
    id: dominantPlay.albumId,
    name: dominantPlay.albumName,
    artist: dominantPlay.artistName,
    image: dominantPlay.albumImage,
    color: hashColor(dominantPlay.albumId),
  };
}

export function buildYearGrid(year: number, dayMap: Map<string, DayData>): WeekData[] {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const weekStarts = eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 0 } // Sunday
  );

  return weekStarts.map((weekStart, weekIndex) => {
    const days: (DayData | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      if (date < yearStart || date > yearEnd) {
        days.push(null);
      } else {
        const key = format(date, "yyyy-MM-dd");
        days.push(dayMap.get(key) ?? { date: key, plays: [], totalPlays: 0, totalMinutes: 0, dominantAlbum: null });
      }
    }
    return { days, weekIndex };
  });
}

export function getMonthLabels(year: number, weeks: WeekData[]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  const seen = new Set<number>();

  for (const week of weeks) {
    for (const day of week.days) {
      if (!day) continue;
      const date = parseISO(day.date);
      const month = getMonth(date);
      if (!seen.has(month) && date.getDate() <= 7) {
        seen.add(month);
        labels.push({
          label: format(date, "MMM"),
          weekIndex: week.weekIndex,
        });
      }
    }
  }

  return labels;
}

export function buildDayDetail(date: string, dayData: DayData): DayDetail {
  const plays = dayData.plays;
  const topTrack = findTopTrack(plays);
  const topArtist = findTopArtist(plays);
  const hourBlocks = buildHourBlocks(plays);
  const mood = detectDayMood(plays);

  return {
    date,
    dayData,
    topTrack,
    topArtist,
    hourBlocks,
    mood,
    totalMinutes: dayData.totalMinutes,
  };
}

function findTopTrack(plays: Play[]): Play | null {
  if (plays.length === 0) return null;

  const counts = new Map<string, { count: number; play: Play }>();
  for (const play of plays) {
    if (!counts.has(play.trackId)) {
      counts.set(play.trackId, { count: 0, play });
    }
    counts.get(play.trackId)!.count++;
  }

  let max = 0;
  let winner: Play | null = null;
  for (const { count, play } of counts.values()) {
    if (count > max) {
      max = count;
      winner = play;
    }
  }
  return winner;
}

function findTopArtist(plays: Play[]): string | null {
  if (plays.length === 0) return null;

  const counts = new Map<string, number>();
  for (const play of plays) {
    counts.set(play.artistName, (counts.get(play.artistName) ?? 0) + 1);
  }

  let max = 0;
  let winner: string | null = null;
  for (const [artist, count] of counts) {
    if (count > max) {
      max = count;
      winner = artist;
    }
  }
  return winner;
}

function buildHourBlocks(plays: Play[]): HourBlock[] {
  const hourMap = new Map<number, Play[]>();

  for (const play of plays) {
    const hour = new Date(play.playedAt).getHours();
    if (!hourMap.has(hour)) hourMap.set(hour, []);
    hourMap.get(hour)!.push(play);
  }

  const blocks: HourBlock[] = [];

  for (const [hour, hourPlays] of hourMap) {
    const dominant = findDominantAlbum(hourPlays);
    const topArtist = findTopArtist(hourPlays) ?? "Unknown";
    const topTrack = findTopTrack(hourPlays);

    blocks.push({
      hour,
      artist: topArtist,
      trackName: topTrack?.trackName ?? "",
      albumImage: dominant?.image ?? null,
      albumColor: dominant?.color ?? hashColor(topArtist),
      plays: hourPlays,
    });
  }

  return blocks.sort((a, b) => a.hour - b.hour);
}

export function getTopArtistsFromPlays(
  plays: Play[],
  limit = 5
): { artist: string; artistId: string; playCount: number; albumImage: string | null }[] {
  const artistMap = new Map<
    string,
    { artist: string; artistId: string; playCount: number; albumImage: string | null }
  >();

  for (const play of plays) {
    if (!artistMap.has(play.artistId)) {
      artistMap.set(play.artistId, {
        artist: play.artistName,
        artistId: play.artistId,
        playCount: 0,
        albumImage: play.albumImage,
      });
    }
    artistMap.get(play.artistId)!.playCount++;
    if (play.albumImage && !artistMap.get(play.artistId)!.albumImage) {
      artistMap.get(play.artistId)!.albumImage = play.albumImage;
    }
  }

  return Array.from(artistMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}
