import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getSpotifyAuthUrl } from "@/lib/spotify";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-production-32ch"
);

async function generateState(): Promise<string> {
  const nonce = crypto.randomUUID();
  return new SignJWT({ nonce, type: "spotify_oauth_state" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function GET() {
  const state = await generateState();
  const authUrl = getSpotifyAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
