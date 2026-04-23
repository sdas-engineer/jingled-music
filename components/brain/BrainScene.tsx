"use client";

import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { BrainRegionSignal } from "@/lib/brain";

interface BrainSceneProps {
  regions: BrainRegionSignal[];
  layoutMode?: "card" | "full";
  resetSignal?: number;
}

function getRegionGuidance(regionId: string): string {
  if (regionId === "calm") return "Good recovery state. Keep this with lower-friction tracks and steady listening blocks.";
  if (regionId === "focus") return "High concentration profile. Use this window for deep work and focused tasks.";
  if (regionId === "drive") return "Momentum is high. Great for workouts, fast execution, and high-energy sessions.";
  if (regionId === "emotion") return "Emotion circuits are active. Use expressive tracks or lighter reflective routines.";
  if (regionId === "reflection") return "Reflective mode is active. Best for planning, writing, and slower cognitive work.";
  return "Load is elevated. Consider a reset mix: calmer tracks, lower tempo, and short listening breaks.";
}

function RegionNode({
  region,
  active,
  onSelect,
}: {
  region: BrainRegionSignal;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const baseColor = useMemo(() => new THREE.Color(region.color), [region.color]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const baseScale = 0.13 + region.intensity * 0.07;

  useFrame(() => {
    if (!materialRef.current) return;
    const t = performance.now() * 0.001;
    let profile = 0;

    // Region-specific micro-animation profiles.
    if (region.id === "calm") {
      // Slow breathing-like wave.
      profile = Math.sin(t * 0.9 + region.intensity * 2.1) * 0.18;
    } else if (region.id === "overload") {
      // Irregular jitter pulse for overload spikes.
      profile =
        Math.sin(t * 8.5 + region.intensity * 7) * 0.14 +
        Math.sin(t * 14.2 + region.intensity * 3.2) * 0.06;
    } else if (region.id === "focus") {
      // Tight, precise rhythm.
      profile = Math.sin(t * 3.4 + 0.6) * 0.12;
    } else if (region.id === "drive") {
      // Higher cadence momentum pulse.
      profile = Math.sin(t * 4.8 + region.intensity * 5) * 0.16;
    } else if (region.id === "emotion") {
      // Warm oscillation with subtle secondary wave.
      profile = Math.sin(t * 2.4) * 0.14 + Math.sin(t * 1.2 + 1.4) * 0.08;
    } else {
      // Reflection: slower, deeper wave.
      profile = Math.sin(t * 1.1 + 0.8) * 0.16;
    }

    const pulse = 1 + profile;
    const target = active
      ? region.intensity * (2.15 + Math.abs(profile) * 0.45)
      : region.intensity * (1.2 + profile * 0.8);
    materialRef.current.emissiveIntensity = target;

    if (meshRef.current) {
      const scaleBoost = active ? 1.06 : 1;
      const microScale = baseScale * (scaleBoost + profile * 0.14);
      meshRef.current.scale.setScalar(Math.max(0.12, microScale / baseScale));
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        position={region.position}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(region.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[baseScale, 28, 28]} />
        <meshStandardMaterial
          ref={materialRef}
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={region.intensity * 1.4}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <Html
        // Render labels only for the active region to avoid heavy per-frame HTML occlusion work.
        style={{ pointerEvents: "none", display: active ? "block" : "none" }}
        position={[region.position[0], region.position[1] + 0.34, region.position[2]]}
        center
        distanceFactor={8}
        transform
        occlude
      >
        <div className={`rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap backdrop-blur-sm ${
          active
            ? "bg-cyan-400/20 border-cyan-300/60 text-cyan-100"
            : "bg-black/55 border-white/10 text-replay-text-muted"
        }`}>
          {region.label}
        </div>
      </Html>
    </>
  );
}

function AnatomicalBrainModel({ onReady }: { onReady: (ready: boolean) => void }) {
  const geometry = useLoader(STLLoader, "/models/brain-hires.stl");
  const normalizedGeometry = useMemo(() => {
    const g = geometry.clone();
    g.computeVertexNormals();
    g.computeBoundingBox();
    const box = g.boundingBox;
    if (!box) return g;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z, 1e-6);
    const targetSize = 4.6;
    const scale = targetSize / maxAxis;

    g.translate(-center.x, -center.y, -center.z);
    g.scale(scale, scale, scale);
    g.computeVertexNormals();
    return g;
  }, [geometry]);

  useEffect(() => {
    onReady(true);
    return () => onReady(false);
  }, [onReady]);

  return (
    <group rotation={[0.03, Math.PI, 0]} position={[0, -0.05, 0]}>
      <mesh geometry={normalizedGeometry} castShadow={false} receiveShadow>
        <meshStandardMaterial
          color="#93e8ff"
          emissive="#0b4f63"
          emissiveIntensity={0.22}
          metalness={0.04}
          roughness={0.62}
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function BrainLoadingOverlay() {
  return (
    <Html center>
      <div className="rounded-md border border-cyan-400/20 bg-black/60 px-3 py-1.5 text-xs text-cyan-100">
        Loading anatomical brain model...
      </div>
    </Html>
  );
}

function CameraDirector({
  focusPosition,
  controlsRef,
  baseZ,
  enabled,
}: {
  focusPosition: [number, number, number] | null;
  controlsRef: React.RefObject<OrbitControlsImpl>;
  baseZ: number;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const transitionRef = useRef<{
    active: boolean;
    progress: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  }>({
    active: false,
    progress: 0,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });
  const lastFocusKeyRef = useRef<string>("__init__");

  useEffect(() => {
    if (!controlsRef.current) return;
    const focusKey = focusPosition
      ? `${focusPosition[0].toFixed(3)}:${focusPosition[1].toFixed(3)}:${focusPosition[2].toFixed(3)}`
      : `reset:${baseZ.toFixed(3)}`;
    if (focusKey === lastFocusKeyRef.current) return;
    lastFocusKeyRef.current = focusKey;
    if (!enabled) return;
    const controls = controlsRef.current;
    transitionRef.current.fromPos.copy(camera.position);
    transitionRef.current.fromTarget.copy(controls.target);

    if (focusPosition) {
      const [x, y, z] = focusPosition;
      transitionRef.current.toTarget.set(x, y, z);
      transitionRef.current.toPos.set(x * 0.55, y * 0.55, z + 3.1);
    } else {
      transitionRef.current.toTarget.set(0, 0, 0);
      transitionRef.current.toPos.set(0, 0, baseZ);
    }

    transitionRef.current.progress = 0;
    transitionRef.current.active = true;
  }, [focusPosition, baseZ, enabled, camera, controlsRef]);

  useFrame((_, delta) => {
    const t = transitionRef.current;
    if (!t.active || !controlsRef.current) return;
    if (!enabled) {
      t.active = false;
      return;
    }

    t.progress = Math.min(1, t.progress + delta * 2.8);
    const eased = 1 - Math.pow(1 - t.progress, 3);
    camera.position.lerpVectors(t.fromPos, t.toPos, eased);
    controlsRef.current.target.lerpVectors(t.fromTarget, t.toTarget, eased);
    controlsRef.current.update();

    if (t.progress >= 1) {
      t.active = false;
    }
  });

  return null;
}

export default function BrainScene({
  regions,
  layoutMode = "card",
  resetSignal = 0,
}: BrainSceneProps) {
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const regionMap = useMemo(
    () => new Map(regions.map((r) => [r.id, r])),
    [regions]
  );
  const activeRegion = activeRegionId ? regionMap.get(activeRegionId) ?? null : null;
  const activeRegionIntensity = activeRegion ? Math.round(activeRegion.intensity * 100) : 0;

  const handleSelectRegion = (id: string) => {
    setActiveRegionId(id);
    setShowRegionModal(true);
  };

  useEffect(() => {
    if (resetSignal === 0) return;
    setActiveRegionId(null);
    setShowRegionModal(false);
  }, [resetSignal]);

  useEffect(() => {
    const applyResponsiveViewport = () => {
      setIsCompactViewport(window.innerWidth < 1400);
    };
    applyResponsiveViewport();
    window.addEventListener("resize", applyResponsiveViewport);
    return () => window.removeEventListener("resize", applyResponsiveViewport);
  }, []);

  const isCompact = isCompactViewport;
  const canvasHeight = isCompact ? "h-[390px] sm:h-[420px]" : "h-[500px]";
  const cameraZ = isCompact ? 5.7 : 5.2;
  const minDistance = isCompact ? 3.8 : 3.3;
  const maxDistance = isCompact ? 7.8 : 7.2;
  const wrapperClass =
    layoutMode === "full"
      ? "h-full flex flex-col bg-gradient-to-br from-[#050b12] to-[#0b1220]"
      : "rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#050b12] to-[#0b1220] overflow-hidden";
  const sceneHeightClass = layoutMode === "full" ? "flex-1 min-h-[420px]" : canvasHeight;

  return (
    <div className={wrapperClass}>
      <div className={sceneHeightClass}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
          camera={{ position: [0, 0, cameraZ], fov: isCompact ? 52 : 48 }}
        >
          <color attach="background" args={["#02070b"]} />
          <ambientLight intensity={1.15} />
          <hemisphereLight intensity={0.95} color="#c6f3ff" groundColor="#04121b" />
          <directionalLight position={[2.8, 2.4, 3.8]} intensity={1.45} color="#8ee9ff" />
          <pointLight position={[-2.8, -1.8, -2.2]} intensity={1.2} color="#38d8ff" />

          <Suspense fallback={<BrainLoadingOverlay />}>
            <AnatomicalBrainModel onReady={setModelReady} />
          </Suspense>

          {regions.map((region) => (
            <RegionNode
              key={region.id}
              region={region}
              active={activeRegionId === region.id}
              onSelect={handleSelectRegion}
            />
          ))}

          <CameraDirector
            focusPosition={activeRegion?.position ?? null}
            controlsRef={controlsRef}
            baseZ={cameraZ}
            enabled={!isInteracting}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableDamping
            dampingFactor={0.12}
            rotateSpeed={0.75}
            zoomSpeed={0.9}
            minDistance={minDistance}
            maxDistance={maxDistance}
            maxPolarAngle={Math.PI * 0.8}
            minPolarAngle={Math.PI * 0.2}
            onStart={() => setIsInteracting(true)}
            onEnd={() => setIsInteracting(false)}
          />
        </Canvas>
      </div>
      {layoutMode === "full" && !modelReady && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-cyan-400/20 bg-black/60 px-3 py-1.5 text-xs text-cyan-100">
          Anatomical model is loading...
        </div>
      )}
      {layoutMode === "full" && activeRegion && showRegionModal && (
        <div className="absolute inset-0 z-30 flex items-end justify-center p-3 pointer-events-none sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-cyan-400/30 bg-[#020913]/95 backdrop-blur-md p-3 shadow-[0_16px_50px_rgba(0,0,0,0.55)] pointer-events-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-replay-text-muted">Inferred region insight</p>
                <h3 className="text-sm font-semibold text-cyan-100 mt-1">{activeRegion.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegionModal(false)}
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-replay-text-secondary hover:text-replay-text-primary"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-replay-text-secondary mt-2">{activeRegion.description}</p>
            <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2">
              <p className="text-[11px] text-cyan-100">
                Current inferred signal: <span className="font-semibold">{activeRegionIntensity}%</span>
              </p>
              <p className="text-[11px] text-cyan-200/90 mt-1">{getRegionGuidance(activeRegion.id)}</p>
            </div>
          </div>
        </div>
      )}
      {layoutMode === "full" ? (
        <div className="absolute top-2 right-3 z-20">
          {activeRegion && (
            <p className="text-[11px] text-replay-text-secondary rounded-md border border-cyan-500/15 bg-black/50 px-2 py-1 max-w-[260px] truncate">
              <span className="text-replay-text-primary font-semibold">{activeRegion.label}:</span>{" "}
              {activeRegion.description}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-cyan-500/15 bg-black/25">
          <div className="flex items-center justify-between gap-3">
            {activeRegion ? (
              <p className="text-xs text-replay-text-secondary">
                <span className="text-replay-text-primary font-semibold">{activeRegion.label}:</span>{" "}
                {activeRegion.description}
              </p>
            ) : (
              <p className="text-xs text-replay-text-muted">
                Tap a lit region to inspect its signal.
              </p>
            )}
            <button
              type="button"
              onClick={() => setActiveRegionId(null)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-cyan-400/20 text-cyan-200/80 hover:text-cyan-100 hover:border-cyan-300/40 whitespace-nowrap"
            >
              Reset view
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

