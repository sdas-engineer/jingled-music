import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, getSpotifyProfile } from "@/lib/spotify";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { generateUsername, slugify } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}/?error=spotify_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_params`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify-oauth-state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_state`);
  }

  cookieStore.delete("spotify-oauth-state");

  try {
    const tokens = await exchangeCode(code);
    const spotifyProfile = await getSpotifyProfile(tokens.accessToken);

    const existingUsers = await prisma.user.findMany({
      select: { username: true },
    });
    const existingSlugs = new Set(existingUsers.map((u) => u.username));

    const baseUsername = slugify(spotifyProfile.display_name ?? spotifyProfile.id);

    const user = await prisma.user.upsert({
      where: { spotifyId: spotifyProfile.id },
      create: {
        spotifyId: spotifyProfile.id,
        username: generateUsername(baseUsername || "user", existingSlugs),
        displayName: spotifyProfile.display_name ?? "Spotify User",
        email: spotifyProfile.email ?? null,
        profileImage: spotifyProfile.images?.[0]?.url ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        profile: {
          create: {
            headline: null,
            isPublic: true,
          },
        },
      },
      update: {
        displayName: spotifyProfile.display_name ?? "Spotify User",
        email: spotifyProfile.email ?? null,
        profileImage: spotifyProfile.images?.[0]?.url ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      },
    });

    const sessionToken = await createSession(user.id);
    const cookieOpts = setSessionCookie(sessionToken);

    const response = NextResponse.redirect(`${APP_URL}/dashboard`);
    response.cookies.set(cookieOpts);
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${APP_URL}/?error=auth_failed`);
  }
}
