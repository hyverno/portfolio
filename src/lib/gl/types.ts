// Public WebGL contracts (DESIGN.md §9.1). Types only: no `three` import, safe anywhere.
// Changing this file changes the contract for every section, so keep it additive.

export type Preset = 'calm' | 'march' | 'panic' | 'still';
export type Glyph = 'dot' | 'dart' | 'xstitch';
export type ViewMode = 1 | 2 | 3 | 4;

/** A DOM element whose rect (cached by ResizeObserver + ScrollTrigger refresh) maps a formation onto the page. */
export interface Region {
	el: HTMLElement;
	/** 'page' = scrolls with the document, 'fixed' = pinned to the viewport. */
	space: 'page' | 'fixed';
}

export interface BakeCtx {
	/** Entity count of the current tier (sim * sim). */
	N: number;
	/** Region size in CSS px. */
	w: number;
	h: number;
	/** Seeded PRNG in [0, 1). */
	rand: () => number;
	el: HTMLElement;
}

export interface BakeResult {
	/** N*4: x, y in [-1, 1] of the region (y up), z in [-1, 1] for 3D formations, w = weight (0 = free roam). */
	targets: Float32Array;
	/** N*4 RGBA8 per-slot colour. */
	paint?: Uint8Array;
	/** N*4 RGBA8 colour used past the scanline (see Crowd.setScan). */
	paintAlt?: Uint8Array;
	/** Named slots tracked on the CPU, e.g. { peon: 1234 }. */
	named?: Record<string, number>;
}

export type FormationSource =
	| { kind: 'glyphs'; key: 'HYVERNO_W125' | 'HYVERNO_W62' | '1445'; fill?: number }
	| {
			kind: 'svg';
			viewBox: [number, number];
			paths: string[];
			mode: 'stroke' | 'fill';
			share?: number;
			weight?: number;
	  }
	| { kind: 'points'; build: (ctx: BakeCtx) => BakeResult }
	| {
			kind: 'paths';
			viewBox: [number, number];
			paths: string[];
			speed: number;
			share?: number;
			weight?: number;
			color?: string;
	  }
	| { kind: 'ambient' };

export interface CrowdParams {
	seek: number;
	maxSpeed: number;
	maxForce: number;
	arrive: number;
	sep: number;
	wander: number;
	noiseScale: number;
	mouseR: number;
	mouseF: number;
	scrollCarry: number;
	panic: number;
	paintMix: number;
	size: number;
	mixSpread: number;
	glyph: Glyph;
	glyphAlt: Glyph;
}

export interface Crowd {
	readonly N: number;
	readonly owner: string | null;
	/** Idempotent; re-bakes when the region resizes. Resolves once the formation texture is ready. */
	define(
		id: string,
		src: FormationSource,
		region: Region,
		o?: { preset?: Preset; glyph?: Glyph }
	): Promise<void>;
	has(id: string): boolean;
	setPaint(id: string, paint?: Uint8Array, paintAlt?: Uint8Array): void;
	/** Ignored while the crowd is claimed by a different owner. */
	blend(from: string, to: string, mix: number, o?: { owner?: string }): void;
	claim(owner: string): void;
	release(owner: string): void;
	set(p: Partial<CrowdParams>): void;
	preset(p: Preset, o?: { duration?: number }): void;
	ping(xPx: number, yPx: number, strength?: number): void;
	attract(
		i: 0 | 1 | 2 | 3,
		rectPx: DOMRectReadOnly | null,
		o?: { mode?: 'fill' | 'perimeter'; strength?: number }
	): void;
	setScan(s: { angleDeg: number; offsetPx: number } | null): void;
	setAlpha(a: number, o?: { duration?: number }): void;
	/** Viewport px, refreshed every 3 frames. */
	named(name: string): { x: number; y: number; visible: boolean } | null;
	select(rectPx: DOMRectReadOnly | null): Promise<number>;
	command(xPx: number, yPx: number): void;
}

export interface DamageNumbers {
	spawn(
		xPx: number,
		yPx: number,
		o?: {
			value?: number;
			crit?: boolean;
			glyph?: 'digits' | 'dot';
			color?: [number, number, number];
			vx?: number;
			vy?: number;
			gravity?: number;
		}
	): void;
	burst(
		xPx: number,
		yPx: number,
		o: {
			count: number;
			radius: number;
			critRate?: number;
			glyph?: 'digits' | 'dot';
			color?: [number, number, number];
		}
	): void;
	readonly live: number;
	readonly total: number;
	readonly capacity: number;
	/** THREE.Mesh */
	readonly object: unknown;
}

/** A scissored sub-view rendered by the shared renderer inside `el`'s viewport rect. */
export interface GLView {
	el: HTMLElement;
	/** THREE.Scene */
	scene: unknown;
	/** THREE.Camera */
	camera: unknown;
	update?(t: number, dt: number): void;
	onResize?(w: number, h: number): void;
	/** 1 = every frame, 2 = every other frame. */
	rate?: 1 | 2;
	clearAlpha?: number;
	/** Optional: when false the view is skipped even if on screen. */
	active?: boolean;
}

export interface Engine {
	/** THREE.WebGLRenderer */
	renderer: unknown;
	crowd: Crowd;
	numbers: DamageNumbers;
	addView(v: GLView): () => void;
	createNumbers(o: { capacity: number; view?: GLView }): DamageNumbers;
	viewMode: ViewMode;
	setViewMode(m: ViewMode): void;
	inkCover(): Promise<void>;
	inkReveal(): Promise<void>;
	setTier(t: 'high' | 'med' | 'low'): void;
	pause(p: boolean): void;
	dispose(): void;
}
