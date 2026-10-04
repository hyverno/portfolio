// Engine-internal contracts between the crowd core (engine.ts, crowd/**) and the GL effects
// (numbers/**, viewmodes.ts, inkswarm.ts, debugOverlay.ts). Only files under src/lib/gl/** import this.
import type * as THREE from 'three';
import type { Crowd, DamageNumbers, GLView, ViewMode } from './types';

/** Read-only view of the crowd's GPU state, handed to effects by engine.ts. */
export interface CrowdGPU {
	readonly N: number;
	/** Side of the square sim textures (N = simSize²). */
	readonly simSize: number;
	/** Current position texture: xy = world units (y in [-1, 1] = viewport height, x in [-aspect, aspect]), z = seed, w = selected. */
	posTexture(): THREE.Texture;
	/** Current velocity texture: xy = velocity (world units / s), z = speed, w = age. */
	velTexture(): THREE.Texture;
	/** Density render target texture (additive gaussian splats, mipmapped when supported). */
	densityTexture(): THREE.Texture;
	readonly densitySize: number;
	readonly densityMipmaps: boolean;
	/** Theme colours in linear RGB, updated by the theme engine. */
	readonly colors: {
		paper: THREE.Vector3;
		ink: THREE.Vector3;
		graphite: THREE.Vector3;
		hairline: THREE.Vector3;
		signal: THREE.Vector3;
	};
	/** Viewport in CSS px plus device pixel ratio in use. */
	readonly viewport: { w: number; h: number; dpr: number; aspect: number };
	/** Mode 4 (IDS) is drawn by the crowd's own render shader. */
	setIdsMode(on: boolean): void;
	/** Hide the crowd's points (used by the density view, which replaces them). */
	setPointsVisible(on: boolean): void;
}

/** Anything the engine loop updates and draws after the crowd. */
export interface Effect {
	update?(t: number, dt: number): void;
	/** Draw into the current framebuffer (the default one); must not clear it. */
	render(renderer: THREE.WebGLRenderer): void;
	resize?(w: number, h: number, dpr: number): void;
	dispose(): void;
}

// ── Factories owned by the effects agent (signatures the engine codes against) ──

/** src/lib/gl/numbers/DamageNumbers.ts */
export type CreateDamageNumbers = (
	renderer: THREE.WebGLRenderer,
	o: { capacity: number; view?: GLView }
) => DamageNumbers & Effect;

/** src/lib/gl/viewmodes.ts — modes 2 (density), 3 (debug: quadtree, velocity vectors, DOM labels, stats panel), 4 (ids). */
export type CreateViewModes = (
	renderer: THREE.WebGLRenderer,
	gpu: CrowdGPU
) => Effect & { readonly mode: ViewMode; set(m: ViewMode): void };

/** src/lib/gl/inkswarm.ts — page transition cover/reveal driven by the crowd density. */
export type CreateInkSwarm = (
	renderer: THREE.WebGLRenderer,
	gpu: CrowdGPU,
	crowd: Crowd
) => Effect & { cover(): Promise<void>; reveal(): Promise<void>; readonly active: boolean };
