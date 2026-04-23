import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getValidAccessToken, getMyPlaylists, createPlaylist, addTracksToPlaylist, getSpotifyProfile } from "@/lib/spotify";

const payloadSchema = z.object({
  trackId: z.string().min(5).max(64),
});

const QUICK_PLAYLIST_NAME = "Jingled Quick Picks";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = payloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(user.id);
    const playlists = await getMyPlaylists(accessToken, 50);
    let playlist = playlists.find((item) => item.name.toLowerCase() === QUICK_PLAYLIST_NAME.toLowerCase());
    if (!playlist) {
      const profile = await getSpotifyProfile(accessToken);
      playlist = await createPlaylist({
        accessToken,
        userId: profile.id,
        name: QUICK_PLAYLIST_NAME,
        description: "Saved from Jingled Brain Assistant",
        isPublic: false,
      });
    }

    await addTracksToPlaylist({
      accessToken,
      playlistId: playlist.id,
      trackUris: [`spotify:track:${parsed.data.trackId}`],
    });

    return NextResponse.json({
      added: true,
      playlistId: playlist.id,
      playlistName: playlist.name,
    });
  } catch (error) {
    console.error("quick-add failed", error);
    return NextResponse.json({ error: "Could not add to playlist." }, { status: 500 });
  }
}
