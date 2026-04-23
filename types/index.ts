export interface User {
  id: string;
  spotifyId: string;
  username: string;
  displayName: string;
  profileImage: string | null;
  email: string | null;
  createdAt: Date;
}

export interface Play {
  id: string;
  userId: string;
  trackId: string;
  trackName: string;
  artistName: string;
  artistId: string;
  albumName: string;
  albumId: string;
  albumImage: string | null;
  playedAt: Date;
  durationMs: number;
  valence: number | null;
  energy: number | null;
  tempo: number | null;
  danceability: number | null;
  acousticness: number | null;
  loudness: number | null;
}

export interface AlbumSummary {
  id: string;
  name: string;
  artist: string;
  image: string | null;
  color: string;
}

export interface DayData {
  date: string; // "yyyy-MM-dd"
  plays: Play[];
  totalPlays: number;
  totalMinutes: number;
  dominantAlbum: AlbumSummary | null;
}

export interface WeekData {
  days: (DayData | null)[];
  weekIndex: number;
}

export interface MonthLabel {
  label: string;
  weekIndex: number;
}

export interface HourBlock {
  hour: number;
  artist: string;
  trackName: string;
  albumImage: string | null;
  albumColor: string;
  plays: Play[];
}

export interface DayDetail {
  date: string;
  dayData: DayData;
  topTrack: Play | null;
  topArtist: string | null;
  hourBlocks: HourBlock[];
  mood: MoodLabel;
  totalMinutes: number;
}

export type MoodLabel =
  | "Controlled chaos"
  | "Peak euphoria"
  | "Quiet overthinking"
  | "Late-night clarity"
  | "Soft recovery"
  | "Sprint mode"
  | "Deep focus"
  | "Obsession loop"
  | "Villain mode"
  | "Melancholic drift"
  | "In the zone"
  | "Just vibing";

export interface Era {
  startDate: string;
  endDate: string;
  label: string;
  dominantArtist: string;
  dominantAlbum: string | null;
  albumImage: string | null;
  playCount: number;
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

export interface SpotifyRecentPlay {
  track: {
    id: string;
    name: string;
    duration_ms: number;
    artists: { id: string; name: string }[];
    album: {
      id: string;
      name: string;
      images: { url: string; width: number; height: number }[];
    };
  };
  played_at: string;
}

export interface SpotifyAudioFeature {
  id: string;
  valence: number;
  energy: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  loudness: number;
}

export interface PublicProfile {
  username: string;
  displayName: string;
  profileImage: string | null;
  headline: string;
  joinedAt: Date;
}
