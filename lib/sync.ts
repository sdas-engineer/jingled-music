import { prisma } from "./prisma";
import { getAudioFeatures, getRecentlyPlayed } from "./spotify";

export interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
}

const SPOTIFY_SYNC_PAGE_SIZE = 50;
const SPOTIFY_SYNC_MAX_PAGES = Math.max(
  1,
  Number.parseInt(process.env.SPOTIFY_SYNC_MAX_PAGES ?? "20", 10) || 20
);

export async function syncRecentPlaysForUser(userId: string, accessToken: string): Promise<SyncResult> {
  const recentPlays: Awaited<ReturnType<typeof getRecentlyPlayed>> = [];
  const seen = new Set<string>();
  let before: number | undefined;

  for (let page = 0; page < SPOTIFY_SYNC_MAX_PAGES; page++) {
    const batch = await getRecentlyPlayed(accessToken, SPOTIFY_SYNC_PAGE_SIZE, before);
    if (batch.length === 0) break;

    for (const item of batch) {
      const key = `${item.track.id}:${item.played_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recentPlays.push(item);
    }

    const last = batch[batch.length - 1];
    if (!last || batch.length < SPOTIFY_SYNC_PAGE_SIZE) break;
    before = new Date(last.played_at).getTime() - 1;
  }

  if (recentPlays.length === 0) {
    return { synced: 0, skipped: 0, total: 0 };
  }

  const trackIds = [...new Set(recentPlays.map((p) => p.track.id))];
  const audioFeatures = await getAudioFeatures(accessToken, trackIds).catch(() => []);
  const featureMap = new Map(audioFeatures.map((f) => [f.id, f]));

  let synced = 0;
  let skipped = 0;

  for (const item of recentPlays) {
    const { track, played_at } = item;
    const features = featureMap.get(track.id);
    const albumImage = track.album.images.find((img) => img.width <= 300)?.url
      ?? track.album.images[0]?.url
      ?? null;

    try {
      await prisma.play.upsert({
        where: {
          userId_trackId_playedAt: {
            userId,
            trackId: track.id,
            playedAt: new Date(played_at),
          },
        },
        create: {
          userId,
          trackId: track.id,
          trackName: track.name,
          artistName: track.artists[0]?.name ?? "Unknown",
          artistId: track.artists[0]?.id ?? "unknown",
          albumName: track.album.name,
          albumId: track.album.id,
          albumImage,
          playedAt: new Date(played_at),
          durationMs: track.duration_ms,
          valence: features?.valence ?? null,
          energy: features?.energy ?? null,
          tempo: features?.tempo ?? null,
          danceability: features?.danceability ?? null,
          acousticness: features?.acousticness ?? null,
          loudness: features?.loudness ?? null,
        },
        update: {},
      });
      synced++;
    } catch {
      skipped++;
    }
  }

  return {
    synced,
    skipped,
    total: recentPlays.length,
  };
}
