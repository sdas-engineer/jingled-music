import type { Play } from "@/types";
import { format } from "date-fns";

export interface BrainRegionSignal {
  id: string;
  label: string;
  description: string;
  intensity: number;
  color: string;
  position: [number, number, number];
}

export interface BrainFlowSignal {
  id: string;
  from: string;
  to: string;
  strength: number;
  color: string;
  speed: number;
}

export interface BrainSnapshot {
  confidence: number;
  moodLabel: string;
  recommendation: string;
  regions: BrainRegionSignal[];
  flows: BrainFlowSignal[];
}

export interface DailyBrainSnapshot {
  date: string;
  playCount: number;
  snapshot: BrainSnapshot;
}

export interface BrainCluster {
  id: string;
  label: string;
  moodLabel: string;
  playCount: number;
  centroid: number[];
  topArtists: string[];
  playIds: string[];
}

export interface BrainNetworkNode {
  id: string;
  label: string;
  intensity: number;
  color: string;
}

export interface BrainNetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const FEATURE_WEIGHTS = [1, 1.1, 0.9, 0.85, 0.75, 0.7];

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = avg(nums);
  const variance = avg(nums.map((n) => (n - mean) ** 2));
  return Math.sqrt(variance);
}

function normalizeLoudness(values: number[]): number {
  // Typical loudness range is ~[-35, -5]. Convert to 0..1.
  if (values.length === 0) return 0.5;
  const mean = avg(values);
  return clamp01((mean + 35) / 30);
}

function normalizeTempo(values: number[]): number {
  // Typical tempo range used for normalization.
  if (values.length === 0) return 0.5;
  const mean = avg(values);
  return clamp01((mean - 60) / 120);
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function computeRegionActivations(input: {
  valence: number;
  energy: number;
  dance: number;
  acoustic: number;
  loudness: number;
  tempo: number;
  valenceVar: number;
  energyVar: number;
}) {
  const { valence, energy, dance, acoustic, loudness, tempo, valenceVar, energyVar } = input;
  return {
    calm: clamp01(acoustic * 0.55 + (1 - energy) * 0.3 + (1 - tempo) * 0.1 + (1 - loudness) * 0.05),
    drive: clamp01(energy * 0.45 + tempo * 0.25 + dance * 0.2 + loudness * 0.1),
    emotion: clamp01(valence * 0.35 + valenceVar * 0.25 + (1 - acoustic) * 0.2 + (1 - energyVar) * 0.2),
    focus: clamp01(
      (1 - energyVar) * 0.25 +
      (1 - valenceVar) * 0.2 +
      dance * 0.2 +
      (1 - acoustic) * 0.15 +
      tempo * 0.2
    ),
    reflection: clamp01(acoustic * 0.45 + (1 - energy) * 0.25 + (1 - valence) * 0.2 + (1 - tempo) * 0.1),
    overload: clamp01(
      energy * 0.35 + loudness * 0.25 + energyVar * 0.2 + (1 - valence) * 0.1 + (1 - acoustic) * 0.1
    ),
  };
}

function blendTowardNeutral(value: number, confidence: number): number {
  const confidenceWeight = 0.35 + confidence * 0.65;
  return clamp01(0.5 + (value - 0.5) * confidenceWeight);
}

function dominantRegionIdForPlay(play: Play): string {
  const activations = computeRegionActivations({
    valence: play.valence ?? 0.5,
    energy: play.energy ?? 0.5,
    dance: play.danceability ?? 0.5,
    acoustic: play.acousticness ?? 0.5,
    loudness: clamp01(((play.loudness ?? -14) + 35) / 30),
    tempo: clamp01(((play.tempo ?? 110) - 60) / 120),
    valenceVar: 0.35,
    energyVar: 0.35,
  });
  return Object.entries(activations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "focus";
}

export function buildBrainSnapshot(plays: Play[]): BrainSnapshot {
  const valid = plays.filter(
    (p) =>
      p.valence !== null &&
      p.energy !== null &&
      p.danceability !== null &&
      p.acousticness !== null &&
      p.loudness !== null &&
      p.tempo !== null
  );

  const sample = valid.length > 0 ? valid : plays;
  const valence = avg(sample.map((p) => p.valence ?? 0.5));
  const energy = avg(sample.map((p) => p.energy ?? 0.5));
  const dance = avg(sample.map((p) => p.danceability ?? 0.5));
  const acoustic = avg(sample.map((p) => p.acousticness ?? 0.5));
  const loudness = normalizeLoudness(sample.map((p) => p.loudness ?? -14));
  const tempo = normalizeTempo(sample.map((p) => p.tempo ?? 110));
  const valenceVar = clamp01(stddev(sample.map((p) => p.valence ?? 0.5)) / 0.28);
  const energyVar = clamp01(stddev(sample.map((p) => p.energy ?? 0.5)) / 0.28);
  const confidence = clamp01(valid.length / Math.max(sample.length, 1));

  const activations = computeRegionActivations({
    valence,
    energy,
    dance,
    acoustic,
    loudness,
    tempo,
    valenceVar,
    energyVar,
  });
  const calm = blendTowardNeutral(activations.calm, confidence);
  const drive = blendTowardNeutral(activations.drive, confidence);
  const emotion = blendTowardNeutral(activations.emotion, confidence);
  const focus = blendTowardNeutral(activations.focus, confidence);
  const overload = blendTowardNeutral(activations.overload, confidence);
  const reflection = blendTowardNeutral(activations.reflection, confidence);

  const regions: BrainRegionSignal[] = [
    {
      id: "calm",
      label: "Calm",
      description: "Lower arousal and decompression state.",
      intensity: calm,
      color: "#38bdf8",
      position: [-1.3, 0.1, 0.2],
    },
    {
      id: "drive",
      label: "Drive",
      description: "Momentum, motivation, and action readiness.",
      intensity: drive,
      color: "#f97316",
      position: [1.1, 0.15, 0.25],
    },
    {
      id: "emotion",
      label: "Emotion",
      description: "Affective charge and emotional tone.",
      intensity: emotion,
      color: "#a855f7",
      position: [0.05, -0.35, 0.8],
    },
    {
      id: "focus",
      label: "Focus",
      description: "Task-lock and attentional stability.",
      intensity: focus,
      color: "#22c55e",
      position: [0.15, 0.75, 0.5],
    },
    {
      id: "reflection",
      label: "Reflection",
      description: "Introspective and contemplative processing.",
      intensity: reflection,
      color: "#60a5fa",
      position: [-0.15, -0.1, -0.75],
    },
    {
      id: "overload",
      label: "Overload",
      description: "Cognitive and sensory pressure buildup.",
      intensity: overload,
      color: "#ef4444",
      position: [0.9, -0.15, -0.45],
    },
  ];

  const sortedByTime = [...sample].sort(
    (a, b) => toDate(a.playedAt).getTime() - toDate(b.playedAt).getTime()
  );
  const transitionCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();
  for (let i = 1; i < sortedByTime.length; i++) {
    const from = dominantRegionIdForPlay(sortedByTime[i - 1]);
    const to = dominantRegionIdForPlay(sortedByTime[i]);
    const key = `${from}->${to}`;
    transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
    outgoingCounts.set(from, (outgoingCounts.get(from) ?? 0) + 1);
  }

  const flows: BrainFlowSignal[] = [
    {
      id: "calm-reflection",
      from: "calm",
      to: "reflection",
      strength: 0,
      color: "#38bdf8",
      speed: 0.18,
    },
    {
      id: "focus-drive",
      from: "focus",
      to: "drive",
      strength: 0,
      color: "#22c55e",
      speed: 0.34,
    },
    {
      id: "emotion-drive",
      from: "emotion",
      to: "drive",
      strength: 0,
      color: "#f97316",
      speed: 0.28,
    },
    {
      id: "overload-focus",
      from: "overload",
      to: "focus",
      strength: 0,
      color: "#ef4444",
      speed: 0.42,
    },
    {
      id: "emotion-calm",
      from: "emotion",
      to: "calm",
      strength: 0,
      color: "#a855f7",
      speed: 0.24,
    },
  ].map((flow) => {
    const relationStrength = {
      "calm-reflection": 0.86,
      "focus-drive": 0.79,
      "emotion-drive": 0.82,
      "overload-focus": 0.74,
      "emotion-calm": 0.68,
    }[flow.id] ?? 0.7;
    const fromIntensity = { calm, drive, emotion, focus, reflection, overload }[flow.from as keyof typeof activations] ?? 0.5;
    const toIntensity = { calm, drive, emotion, focus, reflection, overload }[flow.to as keyof typeof activations] ?? 0.5;
    const coupling = clamp01((fromIntensity + toIntensity) / 2);
    const tKey = `${flow.from}->${flow.to}`;
    const transitionProb =
      (transitionCounts.get(tKey) ?? 0) / Math.max(1, outgoingCounts.get(flow.from) ?? 0);
    const raw = clamp01(relationStrength * 0.3 + coupling * 0.25 + transitionProb * 0.45);
    return { ...flow, strength: blendTowardNeutral(raw, confidence) };
  });

  const dominant = [...regions].sort((a, b) => b.intensity - a.intensity)[0];
  const moodLabel =
    confidence < 0.35
      ? "Low-confidence listening signal"
      : dominant.id === "drive"
        ? "High-drive listening signal"
        : dominant.id === "calm"
          ? "Calm listening signal"
          : dominant.id === "focus"
            ? "Focused listening signal"
            : dominant.id === "emotion"
              ? "Emotion-forward listening signal"
              : dominant.id === "reflection"
                ? "Reflective listening signal"
                : "High-pressure listening signal";

  const recommendation =
    confidence < 0.35
      ? "Signal reliability is low; treat this as a rough listening-style estimate."
      : dominant.id === "overload"
        ? "High-pressure sonic profile detected; consider mixing in lower-intensity tracks."
        : dominant.id === "drive"
          ? "Momentum-heavy profile; this playlist mix trends toward energetic sessions."
          : dominant.id === "calm"
            ? "Recovery-leaning profile; this mix trends toward decompression."
            : dominant.id === "focus"
              ? "Steady-focus profile; this mix trends toward lower-distraction listening."
              : dominant.id === "reflection"
                ? "Reflective profile; this mix trends toward slower, introspective tracks."
                : "Emotion-forward profile; this mix trends toward affect-rich listening.";

  return {
    confidence,
    moodLabel,
    recommendation,
    regions,
    flows,
  };
}

export function buildDailyBrainSnapshots(plays: Play[]): DailyBrainSnapshot[] {
  const grouped = new Map<string, Play[]>();
  for (const play of plays) {
    const key = format(toDate(play.playedAt), "yyyy-MM-dd");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(play);
  }

  const sorted = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const history: Play[] = [];
  return sorted.map(([date, dayPlays]) => {
    const orderedDay = [...dayPlays].sort(
      (a, b) => toDate(a.playedAt).getTime() - toDate(b.playedAt).getTime()
    );
    const input =
      orderedDay.length < 5
        ? [...history.slice(-Math.max(8, 40 - orderedDay.length)), ...orderedDay]
        : orderedDay;
    const snapshot = buildBrainSnapshot(input);
    history.push(...orderedDay);
    return {
      date,
      playCount: dayPlays.length,
      snapshot,
    };
  });
}

function featureVector(play: Play): number[] {
  const tempo = play.tempo ?? 110;
  const loudness = play.loudness ?? -14;
  return [
    play.valence ?? 0.5,
    play.energy ?? 0.5,
    play.danceability ?? 0.5,
    play.acousticness ?? 0.5,
    clamp01((tempo - 60) / 120),
    clamp01((loudness + 35) / 30),
  ];
}

function distanceSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d * FEATURE_WEIGHTS[i];
  }
  return sum;
}

function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  const sums = new Array(vectors[0].length).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < v.length; i++) sums[i] += v[i];
  }
  return sums.map((s) => s / vectors.length);
}

export function buildBrainClusters(plays: Play[], requestedK = 4): BrainCluster[] {
  if (plays.length === 0) return [];
  const samples = plays.map((p) => ({ play: p, vector: featureVector(p) }));
  const k = Math.max(2, Math.min(requestedK, Math.min(6, samples.length)));

  const seed = plays.reduce((acc, p) => acc + p.trackId.charCodeAt(0), 17);
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const centers: number[][] = [];
  centers.push(samples[Math.floor(rand() * samples.length)].vector);
  while (centers.length < k) {
    const distances = samples.map((s) => {
      let min = Number.POSITIVE_INFINITY;
      for (const c of centers) min = Math.min(min, distanceSq(s.vector, c));
      return min;
    });
    const total = distances.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      centers.push(samples[Math.floor(rand() * samples.length)].vector);
      continue;
    }
    let pick = rand() * total;
    let picked = samples[0].vector;
    for (let i = 0; i < samples.length; i++) {
      pick -= distances[i];
      if (pick <= 0) {
        picked = samples[i].vector;
        break;
      }
    }
    centers.push(picked);
  }
  let assignments = new Array(samples.length).fill(0);

  let activeCenters = centers.map((c) => [...c]);
  for (let iter = 0; iter < 24; iter++) {
    assignments = samples.map((s) => {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < activeCenters.length; i++) {
        const dist = distanceSq(s.vector, activeCenters[i]);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    });

    const buckets: number[][][] = Array.from({ length: k }, () => []);
    for (let i = 0; i < samples.length; i++) buckets[assignments[i]].push(samples[i].vector);
    const nextCenters = activeCenters.map((c, i) => {
      if (buckets[i].length > 0) return centroid(buckets[i]);
      // Re-seed empty cluster to a far sample.
      const far = samples
        .map((s) => ({ v: s.vector, d: Math.min(...activeCenters.map((x) => distanceSq(s.vector, x))) }))
        .sort((a, b) => b.d - a.d)[0];
      return far?.v ?? c;
    });
    const shift = nextCenters.reduce(
      (sum, c, i) => sum + Math.sqrt(distanceSq(c, activeCenters[i])),
      0
    );
    activeCenters = nextCenters;
    if (shift < 1e-4) break;
  }

  // Recompute assignments against final centers so cluster counts are stable.
  assignments = samples.map((s) => {
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < activeCenters.length; i++) {
      const dist = distanceSq(s.vector, activeCenters[i]);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  });

  const clusters: BrainCluster[] = Array.from({ length: k }, (_, idx) => {
    const clusterSamples = samples.filter((_, i) => assignments[i] === idx);
    const clusterPlays = clusterSamples.map((s) => s.play);
    const clusterCentroid = centroid(clusterSamples.map((s) => s.vector));
    const snapshot = buildBrainSnapshot(clusterPlays);
    const topArtists = Array.from(
      clusterPlays.reduce((m, p) => {
        m.set(p.artistName, (m.get(p.artistName) ?? 0) + 1);
        return m;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([artist]) => artist);
    const shortArtistTag = topArtists.slice(0, 2).join(", ");

    return {
      id: `cluster-${idx + 1}`,
      label: shortArtistTag
        ? `${snapshot.moodLabel} - ${shortArtistTag}`
        : `Cluster ${idx + 1}`,
      moodLabel: snapshot.moodLabel,
      playCount: clusterPlays.length,
      centroid: clusterCentroid,
      topArtists,
      playIds: clusterPlays.map((p) => p.id),
    };
  }).filter((cluster) => cluster.playCount > 0);

  return clusters.sort((a, b) => b.playCount - a.playCount);
}

export function buildBrainNetwork(snapshot: BrainSnapshot): {
  nodes: BrainNetworkNode[];
  edges: BrainNetworkEdge[];
} {
  const nodes: BrainNetworkNode[] = snapshot.regions.map((region) => ({
    id: region.id,
    label: region.label,
    intensity: region.intensity,
    color: region.color,
  }));

  // Science-inspired high-level functional relation graph:
  // calm/reflection (regulation/default), emotion (salience/affect),
  // focus (executive control), drive (reward/motivation), overload (pressure/arousal).
  const relationPairs: Array<[string, string, number]> = [
    ["calm", "reflection", 0.86],
    ["emotion", "drive", 0.82],
    ["focus", "drive", 0.79],
    ["overload", "focus", 0.74],
    ["emotion", "calm", 0.68],
    ["overload", "emotion", 0.63],
    ["reflection", "focus", 0.58],
  ];

  const intensityById = new Map(nodes.map((n) => [n.id, n.intensity]));
  const edges: BrainNetworkEdge[] = relationPairs.map(([source, target, prior], i) => {
    const sourceI = intensityById.get(source) ?? 0.5;
    const targetI = intensityById.get(target) ?? 0.5;
    const directionalDelta = clamp01((targetI - sourceI + 1) / 2);
    const coupling = clamp01((sourceI + targetI) / 2 * 0.75 + directionalDelta * 0.25);
    return {
      id: `edge-${i + 1}`,
      source,
      target,
      weight: clamp01(prior * coupling),
    };
  });

  return { nodes, edges };
}
