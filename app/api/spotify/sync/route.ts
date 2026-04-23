import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getValidAccessToken, getRecentlyPlayed, getAudioFeatures } from "@/lib/spotify";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(user.id);
    const recentPlays = await getRecentlyPlayed(accessToken, 50);

    if (recentPlays.length === 0) {
      return NextResponse.json({ synced: 0, message: "No recent plays found" });
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
              userId: user.id,
              trackId: track.id,
              playedAt: new Date(played_at),
            },
          },
          create: {
            userId: user.id,
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

    return NextResponse.json({
      synced,
      skipped,
      total: recentPlays.length,
      message: `Synced ${synced} plays`,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
