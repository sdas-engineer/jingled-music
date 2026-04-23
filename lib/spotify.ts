import { prisma } from "./prisma";
import type {
  SpotifyTokens,
  SpotifyProfile,
  SpotifyRecentPlay,
  SpotifyAudioFeature,
} from "@/types";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const SCOPES = [
  "user-read-recently-played",
  "user-top-read",
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
].join(" ");

export function getSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SCOPES,
    state,
    show_dialog: "false",
  });
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

async function spotifyTokenRequest(body: Record<string, string>): Promise<SpotifyTokens> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function exchangeCode(code: string): Promise<SpotifyTokens> {
  return spotifyTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const tokens = await spotifyTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  // Spotify may not return a new refresh_token; keep old one
  if (!tokens.refreshToken) {
    tokens.refreshToken = refreshToken;
  }
  return tokens;
}

async function spotifyFetch<T>(
  endpoint: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

async function spotifyRequest<T>(input: {
  endpoint: string;
  accessToken: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}): Promise<T> {
  const res = await fetch(`${SPOTIFY_API_BASE}${input.endpoint}`, {
    method: input.method ?? "GET",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      ...(input.body ? { "Content-Type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API error: ${res.status} ${input.endpoint} ${text}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function getSpotifyProfile(accessToken: string): Promise<SpotifyProfile> {
  return spotifyFetch<SpotifyProfile>("/me", accessToken);
}

export async function getRecentlyPlayed(
  accessToken: string,
  limit = 50,
  before?: number
): Promise<SpotifyRecentPlay[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", String(before));

  const data = await spotifyFetch<{ items: SpotifyRecentPlay[] }>(
    `/me/player/recently-played?${params}`,
    accessToken
  );
  return data.items ?? [];
}

export async function getAudioFeatures(
  accessToken: string,
  trackIds: string[]
): Promise<SpotifyAudioFeature[]> {
  if (trackIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  const results: SpotifyAudioFeature[] = [];
  for (const chunk of chunks) {
    const data = await spotifyFetch<{ audio_features: SpotifyAudioFeature[] }>(
      `/audio-features?ids=${chunk.join(",")}`,
      accessToken
    );
    results.push(...(data.audio_features ?? []).filter(Boolean));
  }
  return results;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return user.accessToken;
  }

  const tokens = await refreshAccessToken(user.refreshToken);
  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    },
  });

  return tokens.accessToken;
}

export interface SpotifyPlaylistLite {
  id: string;
  name: string;
  tracks: { total: number };
  owner?: { id: string; display_name?: string | null };
  public?: boolean | null;
}

export interface SpotifyTrackLite {
  id: string;
  name: string;
  uri: string;
  external_urls?: { spotify?: string };
  artists: { id: string; name: string }[];
  album: { id: string; name: string; images?: { url: string }[] };
}

export async function searchTracks(accessToken: string, query: string, limit = 8): Promise<SpotifyTrackLite[]> {
  const safeLimit = Math.max(1, Math.min(10, limit));
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(safeLimit),
  });
  const data = await spotifyRequest<{ tracks: { items: SpotifyTrackLite[] } }>({
    endpoint: `/search?${params.toString()}`,
    accessToken,
  });
  return data.tracks?.items ?? [];
}

export async function getMyPlaylists(accessToken: string, limit = 30): Promise<SpotifyPlaylistLite[]> {
  const params = new URLSearchParams({ limit: String(Math.max(1, Math.min(50, limit))) });
  const data = await spotifyRequest<{ items: SpotifyPlaylistLite[] }>({
    endpoint: `/me/playlists?${params.toString()}`,
    accessToken,
  });
  return data.items ?? [];
}

export async function createPlaylist(input: {
  accessToken: string;
  userId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
}): Promise<SpotifyPlaylistLite> {
  return spotifyRequest<SpotifyPlaylistLite>({
    endpoint: `/users/${encodeURIComponent(input.userId)}/playlists`,
    accessToken: input.accessToken,
    method: "POST",
    body: {
      name: input.name,
      description: input.description ?? "",
      public: Boolean(input.isPublic),
    },
  });
}

export async function addTracksToPlaylist(input: {
  accessToken: string;
  playlistId: string;
  trackUris: string[];
}): Promise<{ snapshot_id: string }> {
  return spotifyRequest<{ snapshot_id: string }>({
    endpoint: `/playlists/${encodeURIComponent(input.playlistId)}/tracks`,
    accessToken: input.accessToken,
    method: "POST",
    body: { uris: input.trackUris },
  });
}

export async function removeTracksFromPlaylist(input: {
  accessToken: string;
  playlistId: string;
  trackUris: string[];
}): Promise<{ snapshot_id: string }> {
  return spotifyRequest<{ snapshot_id: string }>({
    endpoint: `/playlists/${encodeURIComponent(input.playlistId)}/tracks`,
    accessToken: input.accessToken,
    method: "DELETE",
    body: { tracks: input.trackUris.map((uri) => ({ uri })) },
  });
}

export async function deletePlaylist(input: {
  accessToken: string;
  playlistId: string;
}): Promise<void> {
  await spotifyRequest<{}>({
    endpoint: `/playlists/${encodeURIComponent(input.playlistId)}/followers`,
    accessToken: input.accessToken,
    method: "DELETE",
  });
}
