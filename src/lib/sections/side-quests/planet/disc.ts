// `planet-disc` (§S5 "Disc"): the flat crowd wraps itself into a world. Its targets are the screen
// projections of the planet entities' home positions, through the exact camera the planet renders
// with at the handoff (rotation 0, dolly z0), in the stage's own NDC (= the region's [-1, 1] space).
//
// Pure math, no `three`: the crowd can bake this before the planet scene is even loaded, and
// PlanetScene.discTargets() calls the very same builder, so both sides of the seam always agree.
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';
import { TIER, device } from '#lib/core/device.svelte';

/** Planet camera: vertical fov (deg) and the dolly range (handoff → deepest World). */
export const CAM = { fov: 50, z0: 3.6, z1: 2.9, near: 0.1, far: 20 } as const;
/** The cap of the unit sphere visible from z0 is z ≥ 1/z0; homes stay a hair inside it. */
export const CAP_Z = 1 / CAM.z0 + 0.012;
/** Share of the crowd that draws the silhouette (the back hemisphere, folded onto the rim). */
const RIM_SHARE = 0.12;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SIGNAL: [number, number, number] = [255, 74, 28];

/** The dashed orbit gizmo (world space, shared with the GL ring). */
export const ORBIT = { radius: 1.4, tiltX: 0.34, tiltZ: 0.16, dashes: 56, duty: 0.56 } as const;

let override: number | null = null;

/** The planet scene announces its real entity count (it may differ from the tier after a governor step). */
export function setPlanetCount(n: number | null): void {
	override = n;
}

export function planetCount(): number {
	if (override) return override;
	const [w, h] = TIER[device.tier].planet;
	return w * h;
}

/**
 * `n` points on the spherical cap z ≥ CAP_Z, spread evenly by area (z uniform) along a golden
 * spiral. `phase` turns the spiral so two sets interleave instead of stacking.
 */
function capSpiral(n: number, phase: number, out: Float32Array, offset = 0): void {
	const span = 1 - CAP_Z;
	for (let k = 0; k < n; k++) {
		const z = 1 - span * ((k + 0.5) / n);
		const s = Math.sqrt(Math.max(0, 1 - z * z));
		const a = k * GOLDEN + phase;
		const o = (offset + k) * 4;
		out[o] = s * Math.cos(a);
		out[o + 1] = s * Math.sin(a);
		out[o + 2] = z;
		out[o + 3] = 0;
	}
}

const homeCache = new Map<number, Float32Array>();

/** Planet entity homes (xyz unit vectors, w = 0 hop), facing the camera at rotation 0. Cached. */
export function homePositions(n: number): Float32Array {
	let h = homeCache.get(n);
	if (!h) {
		h = new Float32Array(n * 4);
		capSpiral(n, 0, h);
		homeCache.set(n, h);
	}
	return h;
}

/** Perspective projection of a planet-space point at the handoff pose → stage NDC (+ view depth). */
export function projectHome(x: number, y: number, z: number, aspect: number, camZ: number = CAM.z0): [number, number] {
	const t = Math.tan(((CAM.fov * Math.PI) / 180) * 0.5);
	const d = Math.max(1e-3, camZ - z);
	return [x / (d * t * aspect), y / (d * t)];
}

/** Silhouette radius of the unit sphere in NDC y units (tangent cone from the camera). */
export function silhouetteNdc(camZ: number = CAM.z0): number {
	const t = Math.tan(((CAM.fov * Math.PI) / 180) * 0.5);
	return 1 / Math.sqrt(camZ * camZ - 1) / t;
}

/** The `planet-disc` builder: exactly N slots in the stage's NDC. Slot 0 is the player (signal). */
export function buildDisc({ N, w, h, rand }: BakeCtx): BakeResult {
	const aspect = Math.max(1e-3, w / Math.max(1, h));
	const np = Math.min(N, planetCount());
	const rim = Math.min(N - np, Math.round(N * RIM_SHARE));
	const extra = N - np - rim;
	const targets = new Float32Array(N * 4);
	const paint = new Uint8Array(N * 4);

	// 1 · Exactly the planet's homes (these dots hand over 1:1 to the cones), then an interleaved
	//     second spiral so the disc keeps the crowd's density.
	const pts = new Float32Array((np + extra) * 4);
	pts.set(homePositions(np));
	capSpiral(extra, Math.PI * GOLDEN, pts, np);
	const span = 1 - CAP_Z;
	for (let i = 0; i < np + extra; i++) {
		const o = i * 4;
		const [x, y] = projectHome(pts[o], pts[o + 1], pts[o + 2], aspect);
		targets[o] = x;
		targets[o + 1] = y;
		// Depth cue through the crowd's point size: centre dots read nearer (larger) than the limb.
		targets[o + 2] = ((pts[o + 2] - CAP_Z) / span) * 2 - 1;
		targets[o + 3] = 1;
	}

	// 2 · The back hemisphere, folded onto the rim: a crisp ink outline that thins inward.
	const R = silhouetteNdc();
	for (let j = 0; j < rim; j++) {
		const o = (np + extra + j) * 4;
		const a = j * GOLDEN * 21 + rand() * 0.02;
		const r = R * (1 - 0.03 * rand() * rand());
		targets[o] = (Math.cos(a) * r) / aspect;
		targets[o + 1] = Math.sin(a) * r;
		targets[o + 2] = -1;
		targets[o + 3] = 1;
	}

	// The player spawns where the camera looks: its dot is already hot.
	paint[0] = SIGNAL[0];
	paint[1] = SIGNAL[1];
	paint[2] = SIGNAL[2];
	paint[3] = 255;
	return { targets, paint, named: { player: 0 } };
}

/** Module-level source (identity is what the crowd compares). */
export const PLANET_DISC: FormationSource = { kind: 'points', build: buildDisc };
