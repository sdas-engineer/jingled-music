import type { Play, MoodLabel } from "@/types";
import { avg } from "./utils";

interface AudioProfile {
  valence: number;
  energy: number;
  tempo: number;
  danceability: number;
  acousticness: number;
}

function getAudioProfile(plays: Play[]): AudioProfile {
  const withFeatures = plays.filter(
    (p) => p.valence !== null && p.energy !== null
  );

  if (withFeatures.length === 0) {
    return { valence: 0.5, energy: 0.5, tempo: 120, danceability: 0.5, acousticness: 0.3 };
  }

  return {
    valence: avg(withFeatures.map((p) => p.valence ?? 0.5)),
    energy: avg(withFeatures.map((p) => p.energy ?? 0.5)),
    tempo: avg(withFeatures.map((p) => p.tempo ?? 120)),
    danceability: avg(withFeatures.map((p) => p.danceability ?? 0.5)),
    acousticness: avg(withFeatures.map((p) => p.acousticness ?? 0.3)),
  };
}

function detectRepetition(plays: Play[]): number {
  if (plays.length === 0) return 0;
  const uniqueTracks = new Set(plays.map((p) => p.trackId)).size;
  return 1 - uniqueTracks / plays.length;
}

export function detectDayMood(plays: Play[]): MoodLabel {
  if (plays.length === 0) return "Just vibing";

  const profile = getAudioProfile(plays);
  const repetition = detectRepetition(plays);

  const { valence, energy, tempo, danceability, acousticness } = profile;

  if (repetition > 0.5) return "Obsession loop";

  if (energy > 0.75 && valence < 0.35) return "Controlled chaos";
  if (energy > 0.75 && valence > 0.65 && danceability > 0.65) return "Peak euphoria";
  if (energy > 0.75 && valence < 0.5) return "Villain mode";
  if (energy > 0.7 && tempo > 140) return "Sprint mode";

  if (energy < 0.35 && valence < 0.4) return "Quiet overthinking";
  if (energy < 0.35 && valence < 0.5 && acousticness > 0.5) return "Melancholic drift";
  if (energy < 0.4 && valence > 0.55) return "Late-night clarity";
  if (energy < 0.5 && valence > 0.5 && acousticness > 0.4) return "Soft recovery";

  if (energy > 0.5 && energy < 0.75 && valence > 0.45) return "In the zone";
  if (energy > 0.4 && valence > 0.4 && danceability > 0.5) return "Just vibing";

  return "Deep focus";
}

const MOOD_DESCRIPTIONS: Record<MoodLabel, string> = {
  "Controlled chaos": "High intensity, low comfort zone",
  "Peak euphoria": "Everything felt possible",
  "Quiet overthinking": "Inner monologue was loud",
  "Late-night clarity": "Thoughts were clear, world was quiet",
  "Soft recovery": "Healing energy, no pressure",
  "Sprint mode": "Moving fast, no time to feel",
  "Deep focus": "Locked in and unreachable",
  "Obsession loop": "Same songs, different hour",
  "Villain mode": "Introspective and a little dark",
  "Melancholic drift": "Somewhere between past and now",
  "In the zone": "Steady and productive",
  "Just vibing": "No particular agenda",
};

export function getMoodDescription(mood: MoodLabel): string {
  return MOOD_DESCRIPTIONS[mood];
}

export function getMoodColor(mood: MoodLabel): string {
  const colors: Record<MoodLabel, string> = {
    "Controlled chaos": "#ef4444",
    "Peak euphoria": "#f59e0b",
    "Quiet overthinking": "#6366f1",
    "Late-night clarity": "#06b6d4",
    "Soft recovery": "#10b981",
    "Sprint mode": "#f97316",
    "Deep focus": "#8b5cf6",
    "Obsession loop": "#ec4899",
    "Villain mode": "#dc2626",
    "Melancholic drift": "#64748b",
    "In the zone": "#22c55e",
    "Just vibing": "#a78bfa",
  };
  return colors[mood] ?? "#888888";
}
