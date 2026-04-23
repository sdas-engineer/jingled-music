import type { Play, MoodLabel } from "@/types";
import { avg } from "./utils";

interface AudioProfile {
  valence: number;
  energy: number;
  tempo: number;
  danceability: number;
  acousticness: number;
}

interface IntentSignals {
  sleepLike: number;
  focusLike: number;
  workoutLike: number;
  darkLike: number;
}

interface NormalizedProfile {
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  tempoNorm: number;
  repetition: number;
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
  const sorted = [...plays].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );
  let adjacentRepeats = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].trackId === sorted[i - 1].trackId) adjacentRepeats++;
  }
  const uniqueTracks = new Set(sorted.map((p) => p.trackId)).size;
  const loopScore = sorted.length > 1 ? adjacentRepeats / (sorted.length - 1) : 0;
  const diversityPenalty = 1 - uniqueTracks / sorted.length;

  // Diversity is less informative on short sessions; reduce its influence there.
  const lengthConfidence = Math.min(1, sorted.length / 12);
  return (loopScore * 0.82) + (diversityPenalty * 0.18 * lengthConfidence);
}

function detectIntentSignals(plays: Play[]): IntentSignals {
  const sleepTerms = [
    "sleep", "pillow", "soothing", "white noise", "brown noise", "rain", "rain sounds",
    "whale", "ocean waves", "sea waves", "lullaby", "sleep well", "night sounds",
  ];
  const focusTerms = [
    "focus", "deep focus", "concentration", "study", "work", "lofi",
    "meditation", "mindfulness", "binaural", "alpha waves",
  ];
  const workoutTerms = ["gym", "workout", "running", "hype", "pump", "beast mode", "cardio"];
  const darkTerms = ["dark", "doom", "villain", "rage", "chaos", "aggressive"];

  const inspected = [...plays]
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 250);
  if (inspected.length === 0) {
    return { sleepLike: 0, focusLike: 0, workoutLike: 0, darkLike: 0 };
  }

  const countHits = (terms: string[]) =>
    inspected.reduce((count, p) => {
      const text = `${p.trackName} ${p.albumName} ${p.artistName}`.toLowerCase();
      return count + (terms.some((term) => text.includes(term)) ? 1 : 0);
    }, 0);

  return {
    sleepLike: countHits(sleepTerms) / inspected.length,
    focusLike: countHits(focusTerms) / inspected.length,
    workoutLike: countHits(workoutTerms) / inspected.length,
    darkLike: countHits(darkTerms) / inspected.length,
  };
}

function pickClosestFallbackMood(
  profile: AudioProfile,
  repetition: number
): MoodLabel {
  const { valence, energy, danceability, acousticness, tempo } = profile;
  const tempoNorm = Math.max(0, Math.min(1, (tempo - 60) / 120));

  const prototypes: Array<{ mood: MoodLabel } & NormalizedProfile> = [
    { mood: "Controlled chaos", valence: 0.25, energy: 0.88, danceability: 0.55, acousticness: 0.15, tempoNorm: 0.72, repetition: 0.35 },
    { mood: "Peak euphoria", valence: 0.82, energy: 0.86, danceability: 0.8, acousticness: 0.12, tempoNorm: 0.68, repetition: 0.25 },
    { mood: "Quiet overthinking", valence: 0.3, energy: 0.32, danceability: 0.35, acousticness: 0.58, tempoNorm: 0.38, repetition: 0.35 },
    { mood: "Late-night clarity", valence: 0.62, energy: 0.36, danceability: 0.42, acousticness: 0.62, tempoNorm: 0.42, repetition: 0.22 },
    { mood: "Soft recovery", valence: 0.52, energy: 0.28, danceability: 0.32, acousticness: 0.76, tempoNorm: 0.28, repetition: 0.24 },
    { mood: "Sprint mode", valence: 0.64, energy: 0.9, danceability: 0.78, acousticness: 0.1, tempoNorm: 0.86, repetition: 0.2 },
    { mood: "Deep focus", valence: 0.52, energy: 0.55, danceability: 0.5, acousticness: 0.3, tempoNorm: 0.52, repetition: 0.2 },
    { mood: "Obsession loop", valence: 0.5, energy: 0.5, danceability: 0.45, acousticness: 0.35, tempoNorm: 0.5, repetition: 0.78 },
    { mood: "Villain mode", valence: 0.24, energy: 0.78, danceability: 0.54, acousticness: 0.18, tempoNorm: 0.66, repetition: 0.3 },
    { mood: "Melancholic drift", valence: 0.28, energy: 0.34, danceability: 0.32, acousticness: 0.68, tempoNorm: 0.34, repetition: 0.28 },
    { mood: "In the zone", valence: 0.62, energy: 0.66, danceability: 0.66, acousticness: 0.25, tempoNorm: 0.6, repetition: 0.24 },
    { mood: "Just vibing", valence: 0.55, energy: 0.5, danceability: 0.52, acousticness: 0.45, tempoNorm: 0.52, repetition: 0.3 },
  ];

  // Normalize by expected feature spread to prevent one dimension dominating distance.
  const scales: NormalizedProfile = {
    valence: 0.22,
    energy: 0.22,
    danceability: 0.2,
    acousticness: 0.26,
    tempoNorm: 0.18,
    repetition: 0.22,
  };

  let bestMood: MoodLabel = "Just vibing";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const p of prototypes) {
    const distance =
      Math.abs(valence - p.valence) / scales.valence +
      Math.abs(energy - p.energy) / scales.energy +
      Math.abs(danceability - p.danceability) / scales.danceability +
      Math.abs(acousticness - p.acousticness) / scales.acousticness +
      Math.abs(tempoNorm - p.tempoNorm) / scales.tempoNorm +
      Math.abs(repetition - p.repetition) / scales.repetition;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMood = p.mood;
    }
  }

  return bestMood;
}

export function detectDayMood(plays: Play[]): MoodLabel {
  if (plays.length === 0) return "Just vibing";

  const profile = getAudioProfile(plays);
  const repetition = detectRepetition(plays);
  const intents = detectIntentSignals(plays);

  const { valence, energy, tempo, danceability, acousticness } = profile;
  const tempoNorm = Math.max(0, Math.min(1, (tempo - 60) / 120));

  // Strong sleep/ambient safeguard so calm-night sessions do not get mislabeled as focus.
  if (intents.sleepLike >= 0.22 && intents.focusLike < 0.18 && (energy < 0.56 || acousticness > 0.48)) {
    return "Soft recovery";
  }

  // Single decision system: robust blended scoring across moods.
  const scores: Record<MoodLabel, number> = {
    "Controlled chaos": energy * 1.35 + (1 - valence) * 1.0 + intents.darkLike * 0.75 + tempoNorm * 0.25,
    "Peak euphoria": energy * 1.2 + valence * 1.1 + danceability * 0.9,
    "Quiet overthinking": (1 - energy) * 1.1 + (1 - valence) * 0.95 + acousticness * 0.4,
    "Late-night clarity": (1 - energy) * 0.8 + valence * 0.9 + acousticness * 0.7,
    "Soft recovery": (1 - energy) * 1.3 + acousticness * 1.1 + intents.sleepLike * 1.15,
    "Sprint mode": energy * 1.4 + tempoNorm * 1.15 + intents.workoutLike * 1.05,
    "Deep focus":
      (1 - Math.abs(energy - 0.52)) * 1.05 +
      (1 - Math.abs(tempoNorm - 0.5)) * 0.78 +
      (1 - Math.abs(danceability - 0.5)) * 0.4 +
      intents.focusLike * 0.95 +
      (1 - acousticness) * 0.35 -
      intents.sleepLike * 0.6,
    "Obsession loop": repetition * 1.7 + (plays.length >= 6 ? 0.12 : 0),
    "Villain mode": energy * 0.95 + (1 - valence) * 1.15 + intents.darkLike * 0.95,
    "Melancholic drift": (1 - valence) * 1.1 + acousticness * 0.9 + (1 - energy) * 0.8,
    "In the zone": energy * 0.95 + valence * 0.75 + danceability * 0.7,
    // Neutral baseline; intentionally lower than strong-signal moods.
    "Just vibing":
      0.25 +
      (1 - Math.abs(valence - 0.5)) * 0.35 +
      (1 - Math.abs(energy - 0.5)) * 0.35 +
      (1 - Math.abs(danceability - 0.5)) * 0.15,
  };

  const ranked = (Object.entries(scores) as Array<[MoodLabel, number]>).sort((a, b) => b[1] - a[1]);
  const [topMood, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;
  // Explicit low-signal behavior: ambiguity or weak absolute score defaults to neutral.
  if (topScore < 0.9 || topScore - secondScore < 0.12) {
    if (intents.sleepLike >= 0.2 && (energy < 0.58 || acousticness > 0.45)) return "Soft recovery";
    if (intents.focusLike >= 0.24 && energy >= 0.3 && energy <= 0.75) return "Deep focus";
    if (intents.workoutLike >= 0.24 && energy > 0.6) return "Sprint mode";
    return pickClosestFallbackMood(profile, repetition);
  }
  return topMood;
}

const MOOD_DESCRIPTIONS: Record<MoodLabel, string> = {
  "Controlled chaos": "High intensity, low comfort zone",
  "Peak euphoria": "Everything felt possible",
  "Quiet overthinking": "Inner monologue was loud",
  "Late-night clarity": "Thoughts were clear, world was quiet",
  "Soft recovery": "Low arousal and restoration mode",
  "Sprint mode": "Moving fast, no time to feel",
  "Deep focus": "Steady concentration and low distraction",
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
