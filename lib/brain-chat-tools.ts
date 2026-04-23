import { prisma } from "@/lib/prisma";
import {
  addTracksToPlaylist,
  createPlaylist,
  deletePlaylist,
  getMyPlaylists,
  getRecentlyPlayed,
  getSpotifyProfile,
  removeTracksFromPlaylist,
  searchTracks,
} from "@/lib/spotify";
import { buildBrainSnapshot, buildDailyBrainSnapshots } from "@/lib/brain";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function getLatestPlays(userId: string, take: number) {
  return prisma.play.findMany({
    where: { userId },
    orderBy: { playedAt: "desc" },
    take,
  });
}

export async function toolGetRecentPlaysWindow(input: {
  accessToken: string;
  limit?: number;
}) {
  const limit = clampInt(input.limit ?? 15, 1, 50);
  const recent = await getRecentlyPlayed(input.accessToken, limit);
  return {
    windowSize: recent.length,
    tracks: recent.map((item) => ({
      trackId: item.track.id,
      trackName: item.track.name,
      artist: item.track.artists[0]?.name ?? "Unknown artist",
      album: item.track.album.name,
      playedAt: item.played_at,
    })),
  };
}

export async function toolGetCurrentBrainSnapshotSummary(input: { userId: string }) {
  const plays = await getLatestPlays(input.userId, 250);
  const snapshot = buildBrainSnapshot(plays);
  const ranked = [...snapshot.regions].sort((a, b) => b.intensity - a.intensity);
  return {
    moodLabel: snapshot.moodLabel,
    recommendation: snapshot.recommendation,
    confidence: snapshot.confidence,
    topSignals: ranked.slice(0, 3).map((region) => ({
      id: region.id,
      label: region.label,
      intensity: region.intensity,
    })),
    sampleSize: plays.length,
  };
}

export async function toolGetMoodTrend(input: { userId: string; days?: number }) {
  const days = clampInt(input.days ?? 10, 3, 30);
  const plays = await getLatestPlays(input.userId, 2000);
  const snapshots = buildDailyBrainSnapshots(plays).slice(-days);
  return {
    days: snapshots.length,
    trend: snapshots.map((entry) => ({
      date: entry.date,
      moodLabel: entry.snapshot.moodLabel,
      confidence: entry.snapshot.confidence,
      playCount: entry.playCount,
      dominantSignal:
        [...entry.snapshot.regions].sort((a, b) => b.intensity - a.intensity)[0]?.label ?? "N/A",
    })),
  };
}

export async function toolSuggestTracksForState(input: {
  userId: string;
  accessToken: string;
  limit?: number;
  recommendationMode?: "discovery" | "familiar";
  avoidTrackIds?: string[];
  diversitySeed?: number;
}) {
  const limit = clampInt(input.limit ?? 5, 1, 15);
  const plays = await getLatestPlays(input.userId, 2000);
  const current = buildBrainSnapshot(plays.slice(0, 250));
  const targetSignal = [...current.regions].sort((a, b) => b.intensity - a.intensity)[0];
  const signalOrder = [...current.regions].sort((a, b) => b.intensity - a.intensity);
  const dominantSignal = signalOrder[0]?.id ?? "focus";
  const topArtists = Array.from(
    plays.reduce((map, play) => {
      map.set(play.artistName, (map.get(play.artistName) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([artist]) => artist);
  const listenedTrackIds = new Set(plays.map((play) => play.trackId));
  const avoidTrackIds = new Set((input.avoidTrackIds ?? []).filter(Boolean));
  const blockedTrackIds = new Set<string>([...listenedTrackIds, ...avoidTrackIds]);
  const recommendationMode = input.recommendationMode ?? "discovery";
  const jitterSeed = Number.isFinite(input.diversitySeed) ? Number(input.diversitySeed) : Date.now();
  const jitter = (id: string, index: number) => {
    let hash = 2166136261 ^ (jitterSeed + index);
    const value = `${id}-${index}`;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash % 1000) / 1000;
  };

  if (recommendationMode === "familiar") {
    const scored = new Map<string, { score: number; trackName: string; artistName: string; count: number }>();
    for (const play of plays) {
      const entry = scored.get(play.trackId) ?? {
        score: 0,
        trackName: play.trackName,
        artistName: play.artistName,
        count: 0,
      };
      const boost =
        dominantSignal === "focus"
          ? (play.energy ?? 0.5) * 0.6 + (play.danceability ?? 0.5) * 0.4
          : dominantSignal === "calm"
            ? (play.acousticness ?? 0.5) * 0.75 + (1 - (play.energy ?? 0.5)) * 0.25
            : dominantSignal === "drive"
              ? (play.energy ?? 0.5) * 0.7 + ((play.tempo ?? 110) / 220) * 0.3
              : dominantSignal === "reflection"
                ? (play.acousticness ?? 0.5) * 0.5 + (1 - (play.valence ?? 0.5)) * 0.5
                : dominantSignal === "emotion"
                  ? (play.valence ?? 0.5) * 0.5 + (play.energy ?? 0.5) * 0.5
                  : (1 - (play.valence ?? 0.5)) * 0.5 + (play.energy ?? 0.5) * 0.5;
      entry.score += boost;
      entry.count += 1;
      scored.set(play.trackId, entry);
    }
    const familiarSuggestions = Array.from(scored.entries())
      .map(([trackId, value]) => ({
        trackId,
        trackName: value.trackName,
        artistName: value.artistName,
        score:
          value.score / Math.max(1, value.count) +
          Math.min(0.2, value.count * 0.02) +
          jitter(trackId, value.count) * 0.05,
      }))
      .filter((track) => !avoidTrackIds.has(track.trackId))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      basedOnSignal: targetSignal?.label ?? "Unknown",
      confidence: current.confidence,
      strategy: "Familiar mode, prioritizes your known favorites.",
      suggestions: familiarSuggestions.map((track) => ({
        ...track,
        spotifyUrl: `https://open.spotify.com/track/${track.trackId}`,
        albumImage: plays.find((p) => p.trackId === track.trackId)?.albumImage ?? null,
        uri: `spotify:track:${track.trackId}`,
      })),
    };
  }

  const signalKeywordMap: Record<string, string[]> = {
    focus: ["deep focus", "instrumental electronic", "minimal techno"],
    calm: ["ambient chill", "neoclassical ambient", "sleep ambient"],
    drive: ["high energy electronic", "workout house", "drum and bass"],
    reflection: ["indie acoustic", "dream pop", "late night jazz"],
    emotion: ["soul alternative", "melodic indie", "rnb atmospheric"],
    overload: ["downtempo reset", "chillout", "ambient meditation"],
  };
  const keywords = signalKeywordMap[dominantSignal] ?? ["fresh discovery music"];
  const queries = [
    ...topArtists.map((artist) => `${artist} ${keywords[0]}`),
    ...keywords,
  ].slice(0, 8);

  const unique = new Map<string, { trackId: string; trackName: string; artistName: string; score: number }>();
  for (let i = 0; i < queries.length; i++) {
    const found = await searchTracks(input.accessToken, queries[i], 10);
    for (let j = 0; j < found.length; j++) {
      const track = found[j];
      if (blockedTrackIds.has(track.id)) continue;
      const existing = unique.get(track.id);
      const rankBoost = 1 - j / 20;
      const queryBoost = 1 - i / 12;
      const score = rankBoost * 0.7 + queryBoost * 0.3 + jitter(track.id, i + j) * 0.08;
      if (!existing || score > existing.score) {
        unique.set(track.id, {
          trackId: track.id,
          trackName: track.name,
          artistName: track.artists[0]?.name ?? "Unknown artist",
          score,
        });
      }
    }
  }

  const suggestions = Array.from(unique.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    basedOnSignal: targetSignal?.label ?? "Unknown",
    confidence: current.confidence,
    strategy: "Discovery-first, excludes your already played tracks.",
    suggestions: suggestions.map((track) => ({
      ...track,
      spotifyUrl: `https://open.spotify.com/track/${track.trackId}`,
      albumImage: null,
      uri: `spotify:track:${track.trackId}`,
    })),
  };
}

function assertConfirmed(confirmToken?: string) {
  if (confirmToken !== "CONFIRM") {
    throw new Error("Mutation blocked. Pass confirmToken=CONFIRM after user confirmation.");
  }
}

export async function toolSearchSpotifyTracks(input: {
  accessToken: string;
  query: string;
  limit?: number;
}) {
  const tracks = await searchTracks(input.accessToken, input.query, clampInt(input.limit ?? 8, 1, 20));
  return {
    count: tracks.length,
    tracks: tracks.map((track) => ({
      trackId: track.id,
      trackName: track.name,
      artistName: track.artists[0]?.name ?? "Unknown artist",
      uri: track.uri,
      spotifyUrl: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
      albumImage: track.album.images?.[0]?.url ?? null,
    })),
  };
}

export async function toolListSpotifyPlaylists(input: { accessToken: string }) {
  const playlists = await getMyPlaylists(input.accessToken, 50);
  return {
    count: playlists.length,
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      trackCount: playlist.tracks?.total ?? 0,
      isPublic: playlist.public ?? false,
    })),
  };
}

export async function toolCreateSpotifyPlaylist(input: {
  accessToken: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  confirmToken?: string;
}) {
  assertConfirmed(input.confirmToken);
  const profile = await getSpotifyProfile(input.accessToken);
  const playlist = await createPlaylist({
    accessToken: input.accessToken,
    userId: profile.id,
    name: input.name,
    description: input.description,
    isPublic: input.isPublic,
  });
  return {
    playlistId: playlist.id,
    name: playlist.name,
    message: `Created playlist "${playlist.name}"`,
  };
}

export async function toolAddTracksToPlaylist(input: {
  accessToken: string;
  playlistId: string;
  trackUris: string[];
  confirmToken?: string;
}) {
  assertConfirmed(input.confirmToken);
  const uris = input.trackUris.filter((uri) => typeof uri === "string" && uri.startsWith("spotify:track:")).slice(0, 100);
  const result = await addTracksToPlaylist({
    accessToken: input.accessToken,
    playlistId: input.playlistId,
    trackUris: uris,
  });
  return { added: uris.length, snapshotId: result.snapshot_id };
}

export async function toolRemoveTracksFromPlaylist(input: {
  accessToken: string;
  playlistId: string;
  trackUris: string[];
  confirmToken?: string;
}) {
  assertConfirmed(input.confirmToken);
  const uris = input.trackUris.filter((uri) => typeof uri === "string" && uri.startsWith("spotify:track:")).slice(0, 100);
  const result = await removeTracksFromPlaylist({
    accessToken: input.accessToken,
    playlistId: input.playlistId,
    trackUris: uris,
  });
  return { removed: uris.length, snapshotId: result.snapshot_id };
}

export async function toolDeleteSpotifyPlaylist(input: {
  accessToken: string;
  playlistId: string;
  confirmToken?: string;
}) {
  assertConfirmed(input.confirmToken);
  await deletePlaylist({
    accessToken: input.accessToken,
    playlistId: input.playlistId,
  });
  return { deleted: true };
}
