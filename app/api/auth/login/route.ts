import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSpotifyAuthUrl } from "@/lib/spotify";

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  const state = generateState();
  const authUrl = getSpotifyAuthUrl(state);

  const cookieStore = await cookies();
  cookieStore.set("spotify-oauth-state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return NextResponse.redirect(authUrl);
}
