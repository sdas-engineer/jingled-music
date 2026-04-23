import { subDays, format, setHours, setMinutes } from "date-fns";
import type { Play } from "@/types";

const MOCK_ALBUMS = [
  { id: "blond", name: "Blonde", artist: "Frank Ocean", artistId: "frank", color: "#8B7355" },
  { id: "tpab", name: "To Pimp a Butterfly", artist: "Kendrick Lamar", artistId: "kendrick", color: "#1a472a" },
  { id: "ram", name: "Random Access Memories", artist: "Daft Punk", artistId: "daftpunk", color: "#B8960C" },
  { id: "lovedeluxe", name: "Love Deluxe", artist: "Sade", artistId: "sade", color: "#8B1A1A" },
  { id: "channel", name: "Channel Orange", artist: "Frank Ocean", artistId: "frank", color: "#D4682A" },
  { id: "mbdtf", name: "My Beautiful Dark Twisted Fantasy", artist: "Kanye West", artistId: "kanye", color: "#2C1B47" },
  { id: "afterhours", name: "After Hours", artist: "The Weeknd", artistId: "weeknd", color: "#8B0000" },
  { id: "igor", name: "IGOR", artist: "Tyler, the Creator", artistId: "tyler", color: "#F5C842" },
  { id: "good_kid", name: "good kid, m.A.A.d city", artist: "Kendrick Lamar", artistId: "kendrick", color: "#2E3A59" },
  { id: "ctrl", name: "ctrl", artist: "SZA", artistId: "sza", color: "#4A3728" },
  { id: "4414", name: "4:44", artist: "JAY-Z", artistId: "jayz", color: "#1C1C1C" },
  { id: "flcl", name: "Flower Boy", artist: "Tyler, the Creator", artistId: "tyler", color: "#7DB87A" },
  { id: "nf", name: "Nights on Fire", artist: "Fred again..", artistId: "fredagain", color: "#1a2a4a" },
  { id: "10day", name: "10 Day", artist: "Chance the Rapper", artistId: "chance", color: "#E8C547" },
  { id: "sza_sos", name: "SOS", artist: "SZA", artistId: "sza", color: "#3B2F4A" },
  { id: "astroworld", name: "ASTROWORLD", artist: "Travis Scott", artistId: "travis", color: "#8B4513" },
  { id: "currents", name: "Currents", artist: "Tame Impala", artistId: "tame", color: "#5B3FA5" },
  { id: "immunity", name: "Immunity", artist: "Clairo", artistId: "clairo", color: "#A0C4FF" },
  { id: "punisher", name: "Punisher", artist: "Phoebe Bridgers", artistId: "phoebe", color: "#2C3E50" },
  { id: "imploding", name: "Imploding the Mirage", artist: "The Killers", artistId: "killers", color: "#C0392B" },
];

const MOCK_TRACKS: Record<string, { id: string; name: string }[]> = {
  blond: [
    { id: "t_nikes", name: "Nikes" },
    { id: "t_ivy", name: "Ivy" },
    { id: "t_pink", name: "Pink + White" },
    { id: "t_self", name: "Self Control" },
    { id: "t_nights", name: "Nights" },
  ],
  tpab: [
    { id: "t_alright", name: "Alright" },
    { id: "t_king_kunta", name: "King Kunta" },
    { id: "t_these", name: "These Walls" },
    { id: "t_mortal", name: "Mortal Man" },
  ],
  ram: [
    { id: "t_gsl", name: "Get Lucky" },
    { id: "t_instant", name: "Instant Crush" },
    { id: "t_touch", name: "Touch" },
    { id: "t_within", name: "Within" },
  ],
  channel: [
    { id: "t_thinkin", name: "Thinkin Bout You" },
    { id: "t_pyramids", name: "Pyramids" },
    { id: "t_sweet", name: "Sweet Life" },
  ],
  mbdtf: [
    { id: "t_dark", name: "Dark Fantasy" },
    { id: "t_runaway", name: "Runaway" },
    { id: "t_devil", name: "Devil in a New Dress" },
  ],
  afterhours: [
    { id: "t_blinding", name: "Blinding Lights" },
    { id: "t_alone", name: "Alone Again" },
    { id: "t_faith", name: "Faith" },
  ],
  igor: [
    { id: "t_earfquake", name: "EARFQUAKE" },
    { id: "t_i_think", name: "I THINK" },
    { id: "t_gone", name: "GONE, GONE / THANK YOU" },
  ],
  currents: [
    { id: "t_let", name: "Let It Happen" },
    { id: "t_yes", name: "Yes I'm Changing" },
    { id: "t_eventually", name: "Eventually" },
    { id: "t_new", name: "New Person, Same Old Mistakes" },
  ],
};

function getTracksForAlbum(albumId: string) {
  const tracks = MOCK_TRACKS[albumId] ?? [
    { id: `${albumId}_t1`, name: "Track 01" },
    { id: `${albumId}_t2`, name: "Track 02" },
  ];
  return tracks;
}

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Weighted era selection: certain albums dominate certain time periods
const ERA_WEIGHTS: { albumIdx: number; startDay: number; endDay: number; weight: number }[] = [
  { albumIdx: 0, startDay: 300, endDay: 365, weight: 8 },  // Blonde era: recent
  { albumIdx: 1, startDay: 200, endDay: 300, weight: 7 },  // TPAB era
  { albumIdx: 6, startDay: 150, endDay: 220, weight: 6 },  // After Hours era
  { albumIdx: 16, startDay: 60, endDay: 150, weight: 7 },  // Currents era
  { albumIdx: 11, startDay: 0, endDay: 80, weight: 8 },    // Flower Boy era
];

function pickAlbumForDay(dayIndex: number, rand: () => number): typeof MOCK_ALBUMS[number] {
  const applicableEras = ERA_WEIGHTS.filter(
    (e) => dayIndex >= e.startDay && dayIndex <= e.endDay
  );

  if (applicableEras.length > 0 && rand() < 0.65) {
    const era = applicableEras[Math.floor(rand() * applicableEras.length)];
    return MOCK_ALBUMS[era.albumIdx];
  }

  return MOCK_ALBUMS[Math.floor(rand() * MOCK_ALBUMS.length)];
}

export function generateMockPlays(): Play[] {
  const plays: Play[] = [];
  const today = new Date();
  const rand = seededRand(42);

  for (let dayOffset = 364; dayOffset >= 0; dayOffset--) {
    const dayIndex = 364 - dayOffset;
    const date = subDays(today, dayOffset);
    const dow = date.getDay();

    // Fewer plays on early morning weekdays, more on weekends/evenings
    const isWeekend = dow === 0 || dow === 6;
    const basePlays = isWeekend ? 5 : 3;
    const maxExtra = isWeekend ? 6 : 4;
    const numPlays = rand() < 0.15 ? 0 : basePlays + Math.floor(rand() * maxExtra);

    if (numPlays === 0) continue;

    // Pick 1-3 dominant albums for the day
    const dominantAlbum = pickAlbumForDay(dayIndex, rand);
    const secondaryAlbum = pickAlbumForDay(dayIndex, rand);

    for (let p = 0; p < numPlays; p++) {
      const album = p < numPlays * 0.65 ? dominantAlbum : secondaryAlbum;
      const tracks = getTracksForAlbum(album.id);
      const track = tracks[Math.floor(rand() * tracks.length)];

      const hour = Math.floor(7 + rand() * 17); // 7 AM - midnight
      const minute = Math.floor(rand() * 60);
      const playedAt = setMinutes(setHours(date, hour), minute);

      const hasFeatures = rand() > 0.25;

      plays.push({
        id: `mock_${dayOffset}_${p}`,
        userId: "mock-user",
        trackId: track.id,
        trackName: track.name,
        artistName: album.artist,
        artistId: album.artistId,
        albumName: album.name,
        albumId: album.id,
        albumImage: null, // real app uses Spotify CDN URLs
        playedAt,
        durationMs: 180000 + Math.floor(rand() * 120000),
        valence: hasFeatures ? Math.round(rand() * 100) / 100 : null,
        energy: hasFeatures ? Math.round(rand() * 100) / 100 : null,
        tempo: hasFeatures ? 80 + Math.round(rand() * 100) : null,
        danceability: hasFeatures ? Math.round(rand() * 100) / 100 : null,
        acousticness: hasFeatures ? Math.round(rand() * 100) / 100 : null,
        loudness: hasFeatures ? -20 + rand() * 18 : null,
      });
    }
  }

  return plays.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
}

export { MOCK_ALBUMS };
