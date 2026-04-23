import {
  format,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  addDays,
  parseISO,
  getMonth,
} from "date-fns";
import type { Play, DayData, WeekData, MonthLabel, AlbumSummary, HourBlock, DayDetail } from "@/types";
import { hashColor, rankKeysByCount } from "./utils";
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
    day.dominantAlbum = findDominantAlbum(day.plays);
  }

  return dayMap;
}

function findDominantAlbum(plays: Play[]): AlbumSummary | null {
  if (plays.length === 0) return null;
  const rankedAlbumIds = rankKeysByCount(plays, (p) => p.albumId);
  const dominantPlay = rankedAlbumIds.length > 0
    ? [...plays].reverse().find((p) => p.albumId === rankedAlbumIds[0]) ?? null
    : null;
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
    { weekStartsOn: 1 } // Monday
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
  const firstWeekForMonth = new Map<number, number>();

  for (const week of weeks) {
    let weekHasMonthStart = false;
    for (const day of week.days) {
      if (!day) continue;
      const date = parseISO(day.date);
      const month = getMonth(date);
      if (!firstWeekForMonth.has(month)) {
        firstWeekForMonth.set(month, week.weekIndex);
      }
      if (date.getDate() === 1 && !seen.has(month)) {
        weekHasMonthStart = true;
      }
    }
    if (weekHasMonthStart) {
      const dayWithMonthStart = week.days.find((d) => d && parseISO(d.date).getDate() === 1);
      if (dayWithMonthStart) {
        const date = parseISO(dayWithMonthStart.date);
        const month = getMonth(date);
        seen.add(month);
        labels.push({
          label: format(date, "MMM"),
          weekIndex: week.weekIndex,
        });
      }
    }
  }

  for (const [month, weekIndex] of firstWeekForMonth.entries()) {
    if (seen.has(month)) continue;
    const date = new Date(year, month, 1);
    labels.push({
      label: format(date, "MMM"),
      weekIndex,
    });
    seen.add(month);
  }

  labels.sort((a, b) => a.weekIndex - b.weekIndex);

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
  const rankedTrackIds = rankKeysByCount(plays, (p) => p.trackId);
  return rankedTrackIds.length > 0
    ? [...plays].reverse().find((p) => p.trackId === rankedTrackIds[0]) ?? null
    : null;
}

function findTopArtist(plays: Play[]): string | null {
  if (plays.length === 0) return null;
  const rankedArtists = rankKeysByCount(plays, (p) => p.artistName);
  return rankedArtists[0] ?? null;
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
  const artistMap = new Map<string, {
    artist: string;
    artistId: string;
    playCount: number;
    albums: Map<string, { count: number; image: string | null }>;
  }>();

  for (const play of plays) {
    if (!artistMap.has(play.artistId)) {
      artistMap.set(play.artistId, {
        artist: play.artistName,
        artistId: play.artistId,
        playCount: 0,
        albums: new Map<string, { count: number; image: string | null }>(),
      });
    }
    const entry = artistMap.get(play.artistId)!;
    entry.playCount++;
    const albumStats = entry.albums.get(play.albumId) ?? { count: 0, image: play.albumImage };
    albumStats.count++;
    if (!albumStats.image && play.albumImage) albumStats.image = play.albumImage;
    entry.albums.set(play.albumId, albumStats);
  }

  const ranked = Array.from(artistMap.values())
    .map((entry) => {
      const topAlbumImage = Array.from(entry.albums.values())
        .sort((a, b) => b.count - a.count)[0]?.image ?? null;
      return {
        artist: entry.artist,
        artistId: entry.artistId,
        playCount: entry.playCount,
        albumImage: topAlbumImage,
      };
    })
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);

  return ranked;
}
