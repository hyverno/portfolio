// The crowd (§S2, §S3): formations, the single-writer ownership protocol, steering parameters and
// the per-frame CPU side of the sim. GSAP and ScrollTrigger only ever move *targets* (blend, mats,
// attractors); the physics moves the bodies.
import * as THREE from 'three';
import { gsap } from '#lib/core/motion';
import { packColliders } from '#lib/core/colliders';
import type { Crowd as CrowdApi, CrowdParams, FormationSource, Glyph, Preset, Region } from '../types';
import { BakeQueue, bake, type BakeInput, type Baked, type InternalSource } from './bakers';
import { DEFAULT_PARAMS, GLYPH_CODE, NUMERIC_PARAMS, PRESETS, type NumericParam } from './presets';
import { Regions, type RectPx, type RegionRef } from './regions';
import { Sim, type CompileJob, type Uniforms } from './Sim';
import { NAMED_FRAG, NAMED_VERT } from './shaders/readback.glsl';

const MAX_NAMED = 8;
const PING_LIFE = 1.6;
const REBAKE_DEBOUNCE_MS = 250;
/** Time constant of the paint lag (≈ how long an entity takes to cross into its new slot). */
const PAINT_LAG_S = 0.8;

/** Uniform names per blend side (no string building in the frame loop). */
const SIDE_UNIFORMS = {
	A: { target: 'uTargetA', paint: 'uPaintA', paintAlt: 'uPaintAltA', flow: 'uFlowA', paths: 'uPathsA' },
	B: { target: 'uTargetB', paint: 'uPaintB', paintAlt: 'uPaintAltB', flow: 'uFlowB', paths: 'uPathsB' }
} as const;

export interface CrowdOptions {
	renderer: THREE.WebGLRenderer;
	simSize: number;
	floatType: THREE.TextureDataType;
	densitySize: number;
	/** HalfFloat density with mipmaps; false = RGBA8 fallback (values × 0.25). */
	densityHalf: boolean;
	regions: Regions;
	/** Live canvas size (CSS px) and DPR; mutated by the renderer. */
	viewport: { w: number; h: number; dpr: number; aspect: number };
	reduced: boolean;
}

interface FormationTextures {
	targets: THREE.DataTexture;
	paint: THREE.DataTexture | null;
	paintAlt: THREE.DataTexture | null;
	flow: THREE.DataTexture | null;
	paths: THREE.DataTexture | null;
	pathRows: number;
}

interface Formation {
	id: string;
	src: InternalSource;
	region: Region;
	ref: RegionRef;
	preset?: Preset;
	glyph?: Glyph;
	ready: boolean;
	promise: Promise<void>;
	resolve: () => void;
	job: { cancel(): void } | null;
	baked: Baked | null;
	tex: FormationTextures | null;
	rotation: THREE.Quaternion | null;
	offResize: () => void;
	timer: number;
}

interface Attractor {
	mode: number;
	strength: number;
	/** Page-space rect, CSS px. */
	left: number;
	top: number;
	w: number;
	h: number;
	tween: gsap.core.Tween | null;
}

const PARAM_UNIFORM: Partial<Record<NumericParam, string>> = {
	seek: 'uSeek',
	maxSpeed: 'uMaxSpeed',
	maxForce: 'uMaxForce',
	arrive: 'uArrive',
	sep: 'uSep',
	wander: 'uWander',
	noiseScale: 'uNoiseScale',
	mouseR: 'uMouseR',
	mouseF: 'uMouseF',
	panic: 'uPanic',
	paintMix: 'uPaintMix',
	size: 'uSize',
	mixSpread: 'uMixSpread'
};

function sameSource(a: InternalSource, b: InternalSource): boolean {
	if (a === b) return true;
	if (a.kind !== b.kind) return false;
	if (a.kind === 'points') return a.build === (b as typeof a).build;
	return JSON.stringify(a) === JSON.stringify(b);
}

function dataTexture(data: Float32Array | Uint8Array, w: number, h: number): THREE.DataTexture {
	const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, data instanceof Float32Array ? THREE.FloatType : THREE.UnsignedByteType);
	tex.minFilter = THREE.NearestFilter;
	tex.magFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	return tex;
}

/** Replaces `old` when sizes differ, otherwise refreshes it in place (no GPU realloc). */
function refresh(old: THREE.DataTexture | null, data: Float32Array | Uint8Array | undefined, w: number, h: number): THREE.DataTexture | null {
	if (!data) {
		old?.dispose();
		return null;
	}
	const img = old?.image as { data: Float32Array | Uint8Array; width: number; height: number } | undefined;
	if (old && img && img.width === w && img.height === h && img.data.constructor === data.constructor) {
		img.data.set(data);
		old.needsUpdate = true;
		return old;
	}
	old?.dispose();
	return dataTexture(data, w, h);
}

export class Crowd implements CrowdApi {
	readonly U: Uniforms;
	readonly params: CrowdParams = { ...DEFAULT_PARAMS };
	/** Spawn wave pace (fraction of N per second) while following the boot progress. */
	spawnRate = 0.9;
	readonly regions: Regions;
	readonly colors = {
		paper: new THREE.Vector3(0.83, 0.81, 0.75),
		ink: new THREE.Vector3(0.006, 0.006, 0.005),
		graphite: new THREE.Vector3(0.11, 0.11, 0.1),
		hairline: new THREE.Vector3(0.64, 0.62, 0.55),
		signal: new THREE.Vector3(1, 0.068, 0.012)
	};

	sim: Sim | null = null;
	density!: THREE.WebGLRenderTarget;
	densitySize: number;
	readonly densityHalf: boolean;

	private renderer: THREE.WebGLRenderer;
	private floatType: THREE.TextureDataType;
	private viewport: CrowdOptions['viewport'];
	private queue = new BakeQueue();
	private formations = new Map<string, Formation>();
	private owners: string[] = [];
	private releaseListeners = new Set<() => void>();
	private bakeListeners = new Set<(id: string, ms: number) => void>();
	private a = 'spawn';
	private b = 'spawn';
	private mix = 0;
	private dominant = 'spawn';
	private reduced: boolean;
	private state = { alpha: 1, spawn: 0, spawnTarget: 0 };
	private alphaTween: gsap.core.Tween | null = null;
	private presetTween: gsap.core.Tween | null = null;
	private pointsVisible = true;
	private drawFraction = 1;
	private rebuildToken = 0;
	private disposed = false;
	private frame = 0;

	// Pointer (viewport px) and its world-space twin.
	private pointer = { x: 0, y: 0, active: false, wx: 1e4, wy: 1e4, vx: 0, vy: 0, fresh: true };
	private attractors: Attractor[] = [0, 1, 2, 3].map(() => ({ mode: 0, strength: 0, left: 0, top: 0, w: 0, h: 0, tween: null }));
	private cmd = { active: false, left: 0, top: 0, radiusPx: 0 };
	private wave = { x: 0, amp: 0.03, active: false, tween: null as gsap.core.Tween | null };
	private snapNext = false;
	private paintLag = { from: '', to: '', value: 0 };
	private scrollY = 0;
	private lastCount = 0;

	// Readbacks.
	private namedRT = new THREE.WebGLRenderTarget(MAX_NAMED, 1, { depthBuffer: false, type: THREE.UnsignedByteType });
	private namedBuf = new Uint8Array(MAX_NAMED * 4);
	private namedGeo = new THREE.BufferGeometry();
	private namedAttr = new Float32Array(MAX_NAMED * 3);
	private namedPoints: THREE.Points;
	private namedNames: string[] = [];
	private namedIds = new Float32Array(MAX_NAMED).fill(-1);
	private namedCache = new Map<string, { x: number; y: number; visible: boolean }>();
	private namedBusy = false;
	private countRT = new THREE.WebGLRenderTarget(256, 1, { depthBuffer: false, type: THREE.UnsignedByteType });
	private countBuf = new Uint8Array(256 * 4);
	private countWaiters: ((n: number) => void)[] = [];
	private countArmed = false;

	private scene = new THREE.Scene();
	private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	private tmpRect: RectPx = { x: 0, y: 0, w: 0, h: 0 };
	private tmpScale = new THREE.Matrix4();
	private panicCenter = new THREE.Vector2();

	constructor(o: CrowdOptions) {
		this.renderer = o.renderer;
		this.floatType = o.floatType;
		this.viewport = o.viewport;
		this.regions = o.regions;
		this.densitySize = o.densitySize;
		this.densityHalf = o.densityHalf;
		this.reduced = o.reduced;

		const blank8 = this.blank8();
		const blankF = this.blankF();
		const v2 = (x = 0, y = 0) => ({ value: new THREE.Vector2(x, y) });
		const v4 = (x = 0, y = 0, z = 0, w = 0) => ({ value: new THREE.Vector4(x, y, z, w) });
		this.U = {
			uSimSize: { value: o.simSize },
			uCount: { value: o.simSize * o.simSize },
			uMix: { value: 0 },
			uMixSpread: { value: this.params.mixSpread },
			tPos: { value: null },
			tVel: { value: null },
			tTarget: { value: null },
			uTargetA: { value: blankF },
			uTargetB: { value: blankF },
			uFlowA: { value: blankF },
			uFlowB: { value: blankF },
			uPathsA: { value: blankF },
			uPathsB: { value: blankF },
			uFlowOn: v2(),
			uPathRows: v2(1, 1),
			uMatA: { value: new THREE.Matrix4() },
			uMatB: { value: new THREE.Matrix4() },
			uPaintA: { value: blank8 },
			uPaintB: { value: blank8 },
			uPaintAltA: { value: blank8 },
			uPaintAltB: { value: blank8 },
			uTime: { value: 0 },
			uDt: { value: 1 / 60 },
			uAttract: { value: new Float32Array(16) },
			uAttractMode: v4(),
			uAttractStrength: v4(),
			uAttractRange: { value: 0.45 },
			uCommand: v4(),
			uWave: v4(0, 0.03, 0.14, 0),
			uDensity: { value: null },
			uDensityTexel: v2(1 / o.densitySize, 1 / o.densitySize),
			uDensityScale: { value: o.densityHalf ? 1 : 0.25 },
			uPointSize: { value: 4 },
			uAspect: { value: o.viewport.aspect },
			uSeek: { value: 6 },
			uMaxSpeed: { value: 0.9 },
			uMaxForce: { value: 4 },
			uArrive: { value: 0.18 },
			uSep: { value: 0.6 },
			uWander: { value: 0.25 },
			uNoiseScale: { value: 1.8 },
			uPanic: { value: 0 },
			uPanicCenter: { value: this.panicCenter },
			uMouse: v2(1e4, 1e4),
			uMouseVel: v2(),
			uMouseR: { value: 0.22 },
			uMouseF: { value: 8 },
			uObstacles: { value: new Float32Array(64) },
			uObstacleCount: { value: 0 },
			uObstacleF: { value: 7 },
			uPings: { value: new Float32Array(16) },
			uPingF: { value: 26 },
			uSpawn: { value: 0 },
			uSpawner: v2(0, 0),
			uSnap: { value: 0 },
			uScrollShift: { value: 0 },
			uCarry: v2(),
			uSelectRect: v4(1, 1, -1, -1),
			uSelectPass: { value: 0 },
			uDpr: { value: o.viewport.dpr },
			uSize: { value: 7 },
			uAlpha: { value: 1 },
			uIds: { value: 0 },
			uPaintMix: { value: 1 },
			uPaintLag: { value: 0 },
			uInk: { value: this.colors.ink },
			uSignal: { value: this.colors.signal },
			uPaper: { value: this.colors.paper },
			uNamed: { value: this.namedIds },
			uScan: { value: new THREE.Vector3(1, 0, -1e9) },
			uGlyph: { value: GLYPH_CODE.dart },
			uGlyphAlt: { value: GLYPH_CODE.dart },
			uCanvasH: { value: 1 },
			uViewport: v2(1, 1)
		};

		this.createDensity(o.densitySize);

		this.namedGeo.setAttribute('position', new THREE.BufferAttribute(this.namedAttr, 3));
		this.namedGeo.setDrawRange(0, 0);
		this.namedPoints = new THREE.Points(
			this.namedGeo,
			new THREE.ShaderMaterial({ name: 'crowd.named', vertexShader: NAMED_VERT, fragmentShader: NAMED_FRAG, uniforms: this.U, depthTest: false, depthWrite: false })
		);
		this.namedPoints.frustumCulled = false;
		if (this.reduced) Object.assign(this.params, PRESETS.still);
	}

	// ── public API (types.ts) ─────────────────────────────────────────────────────────────────

	get N(): number {
		return (this.U.uCount.value as number) | 0;
	}

	get owner(): string | null {
		return this.owners.length ? this.owners[this.owners.length - 1] : null;
	}

	/** The dominant formation id (Ink Swarm blends from it). */
	get current(): string {
		return this.dominant;
	}

	get alpha(): number {
		return this.state.alpha;
	}

	has(id: string): boolean {
		return this.formations.has(id);
	}

	define(id: string, src: FormationSource, region: Region, o: { preset?: Preset; glyph?: Glyph } = {}): Promise<void> {
		return this.defineInternal(id, src, region, o);
	}

	defineInternal(id: string, src: InternalSource, region: Region, o: { preset?: Preset; glyph?: Glyph } = {}): Promise<void> {
		const prev = this.formations.get(id);
		if (prev) {
			if (o.preset) prev.preset = o.preset;
			if (o.glyph) prev.glyph = o.glyph;
			if (sameSource(prev.src, src) && prev.region.el === region.el && prev.region.space === region.space) return prev.promise;
			prev.src = src;
			if (prev.region.el !== region.el || prev.region.space !== region.space) {
				prev.offResize();
				this.regions.release(prev.ref);
				prev.region = region;
				prev.ref = this.regions.acquire(region.el, region.space);
				prev.offResize = this.regions.onResize(prev.ref, () => this.scheduleRebake(prev));
			}
			if (prev.ready) prev.promise = new Promise((r) => (prev.resolve = r));
			this.bakeFormation(prev);
			return prev.promise;
		}
		let resolve!: () => void;
		const promise = new Promise<void>((r) => (resolve = r));
		const ref = this.regions.acquire(region.el, region.space);
		const f: Formation = {
			id,
			src,
			region,
			ref,
			preset: o.preset,
			glyph: o.glyph,
			ready: false,
			promise,
			resolve,
			job: null,
			baked: null,
			tex: null,
			rotation: null,
			offResize: () => {},
			timer: 0
		};
		f.offResize = this.regions.onResize(ref, () => this.scheduleRebake(f));
		this.formations.set(id, f);
		this.bakeFormation(f);
		return promise;
	}

	setPaint(id: string, paint?: Uint8Array, paintAlt?: Uint8Array): void {
		const f = this.formations.get(id);
		if (!f?.baked || !f.tex) return;
		const N = this.N;
		const S = this.U.uSimSize.value as number;
		// Builders speak in their own slot order; the GPU wants entity (Hilbert) order.
		const reorder = (src?: Uint8Array) => {
			if (!src) return undefined;
			const out = new Uint8Array(N * 4);
			const order = f.baked!.order;
			for (let i = 0; i < N; i++) {
				const s = order[i] * 4;
				if (s + 3 < src.length) out.set(src.subarray(s, s + 4), i * 4);
			}
			return out;
		};
		if (paint) {
			f.baked.paint = reorder(paint);
			f.tex.paint = refresh(f.tex.paint, f.baked.paint, S, S);
		}
		if (paintAlt) {
			f.baked.paintAlt = reorder(paintAlt);
			f.tex.paintAlt = refresh(f.tex.paintAlt, f.baked.paintAlt, S, S);
		}
	}

	blend(from: string, to: string, mix: number, o: { owner?: string } = {}): void {
		const owner = this.owner;
		if (owner !== null && o.owner !== owner) return;
		const m = Math.min(1, Math.max(0, mix));
		const changed = from !== this.a || to !== this.b || Math.abs(m - this.mix) > 1e-4;
		this.a = from;
		this.b = to;
		this.mix = m;
		const dom = m >= 0.5 ? to : from;
		if (dom !== this.dominant) {
			this.dominant = dom;
			this.applyFormationStyle(dom);
		}
		// Reduced motion: formations jump to their final state.
		if (this.reduced && changed) this.snapNext = true;
	}

	claim(owner: string): void {
		this.owners = this.owners.filter((x) => x !== owner);
		this.owners.push(owner);
	}

	release(owner: string): void {
		const before = this.owners.length;
		this.owners = this.owners.filter((x) => x !== owner);
		if (before && !this.owners.length) for (const fn of this.releaseListeners) fn();
	}

	set(p: Partial<CrowdParams>): void {
		for (const k of Object.keys(p) as (keyof CrowdParams)[]) {
			const v = p[k];
			if (v === undefined) continue;
			if (k === 'glyph' || k === 'glyphAlt') this.params[k] = v as Glyph;
			else {
				if (this.presetTween) gsap.killTweensOf(this.params, k);
				this.params[k] = v as number;
			}
		}
	}

	preset(p: Preset, o: { duration?: number } = {}): void {
		this.tweenPreset(p, o.duration);
	}

	ping(xPx: number, yPx: number, strength = 1): void {
		if (this.reduced) return;
		const pings = this.U.uPings.value as Float32Array;
		// Reuse the oldest slot.
		let slot = 0;
		for (let i = 0; i < 4; i++) {
			if (pings[i * 4 + 3] <= 0) {
				slot = i;
				break;
			}
			if (pings[i * 4 + 2] > pings[slot * 4 + 2]) slot = i;
		}
		const [wx, wy] = this.toWorld(xPx, yPx);
		pings[slot * 4] = wx;
		pings[slot * 4 + 1] = wy;
		pings[slot * 4 + 2] = 0;
		pings[slot * 4 + 3] = strength;
	}

	attract(i: 0 | 1 | 2 | 3, rectPx: DOMRectReadOnly | null, o: { mode?: 'fill' | 'perimeter'; strength?: number } = {}): void {
		const a = this.attractors[i];
		a.tween?.kill();
		if (!rectPx) {
			a.tween = gsap.to(a, { strength: 0, duration: 0.48, ease: 'steer', onComplete: () => void (a.mode = 0) });
			return;
		}
		a.mode = o.mode === 'perimeter' ? 2 : 1;
		a.left = rectPx.left;
		a.top = rectPx.top + this.scrollY;
		a.w = rectPx.width;
		a.h = rectPx.height;
		a.tween = gsap.to(a, { strength: o.strength ?? 1, duration: this.reduced ? 0 : 0.48, ease: 'steer' });
	}

	setScan(s: { angleDeg: number; offsetPx: number } | null): void {
		const v = this.U.uScan.value as THREE.Vector3;
		if (!s) v.set(1, 0, -1e9);
		else {
			const a = (s.angleDeg * Math.PI) / 180;
			v.set(Math.cos(a), Math.sin(a), s.offsetPx);
		}
	}

	setAlpha(a: number, o: { duration?: number } = {}): void {
		this.alphaTween?.kill();
		const d = o.duration ?? 0;
		if (d <= 0) this.state.alpha = a;
		else this.alphaTween = gsap.to(this.state, { alpha: a, duration: d, ease: 'none' });
	}

	named(name: string): { x: number; y: number; visible: boolean } | null {
		return this.namedCache.get(name) ?? null;
	}

	select(rectPx: DOMRectReadOnly | null): Promise<number> {
		if (!this.sim) return Promise.resolve(0);
		const sel = this.U.uSelectRect.value as THREE.Vector4;
		this.U.uSelectPass.value = 1;
		if (!rectPx || rectPx.width <= 0 || rectPx.height <= 0) {
			sel.set(1, 1, -1, -1);
			this.cmd.active = false;
			this.lastCount = 0;
			return Promise.resolve(0);
		}
		const [x0, y0] = this.toWorld(rectPx.left, rectPx.bottom);
		const [x1, y1] = this.toWorld(rectPx.right, rectPx.top);
		sel.set(x0, y0, x1, y1);
		this.cmd.active = false;
		this.countArmed = true;
		return new Promise((resolve) => this.countWaiters.push(resolve));
	}

	command(xPx: number, yPx: number): void {
		if (this.lastCount <= 0) return;
		this.cmd.active = true;
		this.cmd.left = xPx;
		this.cmd.top = yPx + this.scrollY;
		// About 30 px² per unit: they stand shoulder to shoulder.
		this.cmd.radiusPx = Math.sqrt((this.lastCount * 30) / Math.PI);
	}

	// ── engine-side extensions (not in types.ts) ───────────────────────────────────────────────

	/** Rotates a 3D formation (e.g. the d20) through its region matrix. Angles in radians. */
	setRotation(id: string, x: number, y: number, z: number): void {
		const f = this.formations.get(id);
		if (!f) return;
		f.rotation ??= new THREE.Quaternion();
		f.rotation.setFromEuler(EULER.set(x, y, z));
	}

	/** Idle stadium wave: a band lifting held entities sweeps left → right (amplitude in world units). */
	sendWave(o: { duration?: number; amplitude?: number } = {}): void {
		if (this.reduced) return;
		const aspect = this.viewport.aspect;
		this.wave.tween?.kill();
		this.wave.amp = o.amplitude ?? 0.03;
		this.wave.x = -aspect - 0.3;
		this.wave.active = true;
		this.wave.tween = gsap.to(this.wave, {
			x: aspect + 0.3,
			duration: o.duration ?? 1.2,
			ease: 'none',
			onComplete: () => void (this.wave.active = false)
		});
	}

	/** Fires when the last owner releases the crowd (anchors re-apply then). */
	onRelease(fn: () => void): () => void {
		this.releaseListeners.add(fn);
		return () => this.releaseListeners.delete(fn);
	}

	onBake(fn: (id: string, ms: number) => void): () => void {
		this.bakeListeners.add(fn);
		return () => this.bakeListeners.delete(fn);
	}

	/** Current blend pair (anchors, dev overlay). */
	get blendState(): { from: string; to: string; mix: number } {
		return { from: this.a, to: this.b, mix: this.mix };
	}

	/** Fraction of entities drawn (governor). */
	get drawn(): number {
		return this.drawFraction;
	}

	get pendingBakes(): number {
		return this.queue.pending;
	}

	get selectedCount(): number {
		return this.lastCount;
	}

	setPointerPx(x: number, y: number, active: boolean): void {
		const p = this.pointer;
		if (active && !p.active) p.fresh = true;
		p.x = x;
		p.y = y;
		p.active = active;
	}

	setPointsVisible(on: boolean): void {
		this.pointsVisible = on;
	}

	setIdsMode(on: boolean): void {
		this.U.uIds.value = on ? 1 : 0;
	}

	setDrawFraction(f: number): void {
		this.drawFraction = f;
		this.sim?.setDrawFraction(f);
	}

	setReduced(r: boolean): void {
		if (r === this.reduced) return;
		this.reduced = r;
		if (r) {
			this.tweenPreset('still', 0);
			this.state.spawnTarget = 1;
			this.state.spawn = 1;
			this.snapNext = true;
		} else {
			this.tweenPreset(this.formations.get(this.dominant)?.preset ?? 'calm', 0.6);
		}
	}

	/** Spawn wave target in [0, 1] (the boot progress). The visible count follows at a steady pace. */
	setSpawnTarget(p: number, immediate = false): void {
		this.state.spawnTarget = Math.max(this.state.spawnTarget, Math.min(1, p));
		if (immediate || this.reduced) this.state.spawn = this.state.spawnTarget;
	}

	/** The formation layout is ready: builds the sim with every entity parked on the spawner. */
	start(): void {
		const spawn = this.formations.get('spawn');
		const N = this.N;
		const pos = new Float32Array(N * 4);
		const vel = new Float32Array(N * 4);
		const rank = spawn?.baked?.rank;
		for (let i = 0; i < N; i++) {
			pos[i * 4 + 2] = rank ? rank[i] : i / N;
			vel[i * 4 + 3] = -1;
		}
		if (this.reduced) {
			this.state.spawn = this.state.spawnTarget = 1;
			this.snapNext = true;
		}
		this.sim = new Sim(this.renderer, this.U.uSimSize.value as number, this.floatType, this.U, { pos, vel });
		this.sim.setDrawFraction(this.drawFraction);
		this.scene.add(this.sim.points);
	}

	programs(): CompileJob[] {
		const list = this.sim ? this.sim.programs() : [];
		list.push({
			name: 'crowd.named',
			material: this.namedPoints.material as THREE.Material,
			kind: 'points',
			offscreen: true
		});
		return list;
	}

	// ── frame ──────────────────────────────────────────────────────────────────────────────────

	/** CPU side of a frame: uniforms, region matrices, colliders. No allocations. */
	update(time: number, dt: number, scrollY: number, scrollDelta: number): void {
		const U = this.U;
		const vp = this.viewport;
		const vh = vp.h;
		const half = vh / 2;
		this.scrollY = scrollY;
		this.frame++;

		U.uTime.value = time;
		U.uAspect.value = vp.aspect;
		U.uDpr.value = vp.dpr;
		U.uCanvasH.value = Math.floor(vh * vp.dpr);
		(U.uViewport.value as THREE.Vector2).set(vp.w, vh);
		U.uMix.value = this.mix;
		// Paint trails the blend by roughly a travel time; a new pair starts from where it stands.
		const lag = this.paintLag;
		if (lag.from !== this.a || lag.to !== this.b || this.reduced) {
			lag.from = this.a;
			lag.to = this.b;
			lag.value = this.mix;
		} else {
			lag.value += (this.mix - lag.value) * (1 - Math.exp(-dt / PAINT_LAG_S));
			if (Math.abs(this.mix - lag.value) < 1e-3) lag.value = this.mix;
		}
		U.uPaintLag.value = lag.value;

		const p = this.params;
		for (const k of NUMERIC_PARAMS) {
			const name = PARAM_UNIFORM[k];
			if (name) U[name].value = p[k];
		}
		U.uMixSpread.value = Math.min(0.95, Math.max(0, p.mixSpread));
		U.uGlyph.value = GLYPH_CODE[p.glyph];
		U.uGlyphAlt.value = GLYPH_CODE[p.glyphAlt];
		U.uAlpha.value = this.state.alpha;

		// Formations A / B: textures and region matrices.
		const fa = this.usable(this.a);
		const fb = this.usable(this.b);
		const carry = U.uCarry.value as THREE.Vector2;
		carry.x = this.bindSide(fa, 'A', scrollY, U.uMatA.value as THREE.Matrix4);
		carry.y = this.bindSide(fb, 'B', scrollY, U.uMatB.value as THREE.Matrix4);
		// Panic flees the dominant formation's centre.
		const md = (this.mix >= 0.5 ? U.uMatB.value : U.uMatA.value) as THREE.Matrix4;
		this.panicCenter.set(md.elements[12], md.elements[13]);

		// Scroll carry; a jump (anchor link, immediate scrollTo) is not inertia.
		const jump = Math.abs(scrollDelta) > vh * 0.8;
		U.uScrollShift.value = (scrollDelta / half) * (jump ? 1 : p.scrollCarry);

		U.uObstacleCount.value = packColliders(U.uObstacles.value as Float32Array, vp.w, vh, scrollY);

		// Pings age out.
		const pings = U.uPings.value as Float32Array;
		for (let i = 0; i < 4; i++) {
			if (pings[i * 4 + 3] <= 0) continue;
			pings[i * 4 + 2] += dt;
			if (pings[i * 4 + 2] > PING_LIFE) pings[i * 4 + 3] = 0;
		}

		// Pointer → world, with a smoothed velocity for the flow-around term.
		const ptr = this.pointer;
		const mouse = U.uMouse.value as THREE.Vector2;
		const mvel = U.uMouseVel.value as THREE.Vector2;
		if (ptr.active) {
			const wx = (ptr.x - vp.w / 2) / half;
			const wy = -(ptr.y - half) / half;
			if (ptr.fresh) {
				ptr.fresh = false;
				ptr.vx = ptr.vy = 0;
			} else if (dt > 0) {
				ptr.vx += ((wx - ptr.wx) / dt - ptr.vx) * 0.3;
				ptr.vy += ((wy - ptr.wy) / dt - ptr.vy) * 0.3;
			}
			ptr.wx = wx;
			ptr.wy = wy;
			mouse.set(wx, wy);
			mvel.set(ptr.vx, ptr.vy);
		} else {
			mouse.set(1e4, 1e4);
			mvel.set(0, 0);
		}

		// Attractors (page-space rects → world).
		const ar = U.uAttract.value as Float32Array;
		const am = U.uAttractMode.value as THREE.Vector4;
		const as = U.uAttractStrength.value as THREE.Vector4;
		for (let i = 0; i < 4; i++) {
			const a = this.attractors[i];
			ar[i * 4] = (a.left + a.w / 2 - vp.w / 2) / half;
			ar[i * 4 + 1] = -(a.top - scrollY + a.h / 2 - half) / half;
			ar[i * 4 + 2] = a.w / vh;
			ar[i * 4 + 3] = a.h / vh;
			am.setComponent(i, a.mode);
			as.setComponent(i, a.strength);
		}

		const cmd = U.uCommand.value as THREE.Vector4;
		const c = this.cmd;
		if (c.active) cmd.set((c.left - vp.w / 2) / half, -(c.top - scrollY - half) / half, 1, c.radiusPx / half);
		else cmd.z = 0;

		const wave = U.uWave.value as THREE.Vector4;
		wave.x = this.wave.x;
		wave.y = this.wave.amp;
		wave.w = this.wave.active ? 1 : 0;

		// Spawn wave follows the boot progress at a steady pace (a burst of 30% at once reads as a pop).
		const s = this.state;
		if (s.spawn < s.spawnTarget) s.spawn = Math.min(s.spawnTarget, s.spawn + this.spawnRate * dt);
		U.uSpawn.value = s.spawn >= 1 ? 2 : s.spawn;

		if (this.snapNext) {
			U.uSnap.value = 1;
			this.snapNext = false;
		}

		this.updateNamedSlots(fa, fb);
	}

	/** GPU side of a frame: sim passes, density splats, readbacks. */
	step(dt: number): void {
		const sim = this.sim;
		if (!sim || this.disposed) return;
		const substeps = dt > 1 / 30 ? 2 : 1;
		sim.step(Math.min(dt / substeps, 1 / 30), substeps);

		const r = this.renderer;
		const prev = r.getRenderTarget();
		r.setRenderTarget(this.density);
		r.clear(true, false, false);
		r.render(sim.densityPoints, this.camera);
		this.U.uDensity.value = this.density.texture;

		if (this.countArmed) this.readCount(sim);
		if (this.namedNames.length) this.readNamed();
		r.setRenderTarget(prev);
	}

	render(): void {
		if (!this.sim || !this.pointsVisible || this.state.alpha <= 0) return;
		this.renderer.render(this.scene, this.camera);
	}

	/** Swaps the simulation to `simSize` (tier change): re-bakes every formation, then rebuilds in place. */
	async resize(simSize: number): Promise<void> {
		const N2 = simSize * simSize;
		if (N2 === this.N || !this.sim) return;
		const token = ++this.rebuildToken;
		const list = [...this.formations.values()];
		const baked = await Promise.all(list.map((f) => this.queue.run(bake(this.bakeInput(f, N2))).promise.catch(() => null)));
		if (token !== this.rebuildToken || this.disposed) return;

		this.U.uSimSize.value = simSize;
		this.U.uCount.value = N2;
		list.forEach((f, i) => {
			const b = baked[i];
			if (b) this.upload(f, b);
			else {
				f.ready = false;
				this.bakeFormation(f);
			}
		});
		for (const f of this.formations.values()) if (!list.includes(f)) this.bakeFormation(f);

		const old = this.sim;
		this.scene.remove(old.points);
		old.dispose();
		this.sim = new Sim(this.renderer, simSize, this.floatType, this.U, this.homeState());
		this.sim.setDrawFraction(this.drawFraction);
		this.scene.add(this.sim.points);
	}

	/** Re-uploads the sim state after a GPU context restore (render targets come back empty). */
	reinit(): void {
		this.sim?.load(this.homeState());
	}

	/** Everyone exactly where the dominant formation wants them: no respawn on a quality change. */
	private homeState(): { pos: Float32Array; vel: Float32Array } {
		const N = this.N;
		const pos = new Float32Array(N * 4);
		const vel = new Float32Array(N * 4);
		const f = this.usable(this.dominant);
		const M = new THREE.Matrix4();
		this.bindSide(f, 'B', this.scrollY, M);
		const t = f?.baked && f.baked.targets.length === N * 4 ? f.baked.targets : null;
		const v = new THREE.Vector3();
		for (let i = 0; i < N; i++) {
			if (t) v.set(t[i * 4], t[i * 4 + 1], t[i * 4 + 2]).applyMatrix4(M);
			pos[i * 4] = v.x;
			pos[i * 4 + 1] = v.y;
			vel[i * 4 + 3] = 1;
		}
		return { pos, vel };
	}

	/** Recreates the density RT (governor step 2 halves it). */
	createDensity(size: number): void {
		this.density?.dispose();
		this.densitySize = size;
		this.density = new THREE.WebGLRenderTarget(size, size, {
			type: this.densityHalf ? THREE.HalfFloatType : THREE.UnsignedByteType,
			depthBuffer: false,
			generateMipmaps: true,
			minFilter: THREE.LinearMipmapLinearFilter,
			magFilter: THREE.LinearFilter
		});
		(this.U.uDensityTexel.value as THREE.Vector2).set(1 / size, 1 / size);
		this.U.uPointSize.value = (4 * size) / 256;
		this.U.uDensity.value = this.density.texture;
	}

	dispose(): void {
		this.disposed = true;
		this.queue.dispose();
		for (const f of this.formations.values()) {
			f.job?.cancel();
			clearTimeout(f.timer);
			f.offResize();
			this.disposeTextures(f);
		}
		this.formations.clear();
		this.sim?.dispose();
		this.density.dispose();
		this.namedRT.dispose();
		this.countRT.dispose();
		this.namedGeo.dispose();
		(this.namedPoints.material as THREE.Material).dispose();
		this.releaseListeners.clear();
		this.bakeListeners.clear();
		gsap.killTweensOf([this.params, this.state, this.wave, ...this.attractors]);
	}

	// ── internals ──────────────────────────────────────────────────────────────────────────────

	private toWorld(xPx: number, yPx: number): [number, number] {
		const half = this.viewport.h / 2;
		return [(xPx - this.viewport.w / 2) / half, -(yPx - half) / half];
	}

	/** A formation usable this frame: the requested one when baked, else the ambient crowd. */
	private usable(id: string): Formation | undefined {
		const f = this.formations.get(id);
		if (f?.ready) return f;
		return this.formations.get('ambient');
	}

	/** Binds one side's textures and writes its region matrix. Returns the scroll-carry flag. */
	private bindSide(f: Formation | undefined, side: 'A' | 'B', scrollY: number, out: THREE.Matrix4): number {
		const U = this.U;
		const tex = f?.tex;
		if (tex) {
			const k = SIDE_UNIFORMS[side];
			U[k.target].value = tex.targets;
			U[k.paint].value = tex.paint ?? this.blank8();
			U[k.paintAlt].value = tex.paintAlt ?? this.blank8();
			U[k.flow].value = tex.flow ?? this.blankF();
			U[k.paths].value = tex.paths ?? this.blankF();
			const on = U.uFlowOn.value as THREE.Vector2;
			const rows = U.uPathRows.value as THREE.Vector2;
			if (side === 'A') {
				on.x = tex.flow ? 1 : 0;
				rows.x = tex.pathRows;
			} else {
				on.y = tex.flow ? 1 : 0;
				rows.y = tex.pathRows;
			}
		}
		if (!f) {
			out.identity();
			return 0;
		}
		const vp = this.viewport;
		const R = this.regions.rect(f.ref, scrollY, this.tmpRect);
		const vh = vp.h;
		const sx = R.w / vh;
		const sy = R.h / vh;
		const cx = (R.x + R.w / 2 - vp.w / 2) / (vh / 2);
		const cy = -(R.y + R.h / 2 - vh / 2) / (vh / 2);
		if (f.rotation) {
			out.makeRotationFromQuaternion(f.rotation);
			out.premultiply(this.tmpScale.makeScale(sx, sy, 1));
			out.setPosition(cx, cy, 0);
		} else {
			out.set(sx, 0, 0, cx, 0, sy, 0, cy, 0, 0, 1, 0, 0, 0, 0, 1);
		}
		return f.region.space === 'page' && !f.ref.viewport ? 1 : 0;
	}

	private blank8Tex: THREE.DataTexture | null = null;
	private blankFTex: THREE.DataTexture | null = null;
	private blank8(): THREE.DataTexture {
		return (this.blank8Tex ??= dataTexture(new Uint8Array(4), 1, 1));
	}
	private blankF(): THREE.DataTexture {
		return (this.blankFTex ??= dataTexture(new Float32Array(4), 1, 1));
	}

	private applyFormationStyle(id: string): void {
		const f = this.formations.get(id);
		this.params.glyph = f?.glyph ?? 'dart';
		// The dominant formation's preset replaces any manual preset when the dominant one changes.
		this.tweenPreset(f?.preset ?? 'calm', 0.8);
	}

	private tweenPreset(p: Preset, duration = 0.8): void {
		const name: Preset = this.reduced ? 'still' : p;
		this.presetTween?.kill();
		const values = PRESETS[name];
		if (duration <= 0 || this.reduced) {
			Object.assign(this.params, values);
			this.presetTween = null;
			return;
		}
		this.presetTween = gsap.to(this.params, { ...values, duration, ease: 'steer', overwrite: 'auto' });
	}

	private bakeInput(f: Formation, N: number): BakeInput {
		const { w: vw, h: vh } = this.viewport;
		const r = f.ref;
		const w = Math.max(1, r.w);
		const cx = r.viewport ? 0 : (vw / 2 - (r.left + w / 2)) / (w / 2);
		return { id: f.id, src: f.src, N, w, h: Math.max(1, r.h), vw, vh, cx, el: f.region.el };
	}

	private bakeFormation(f: Formation): void {
		f.job?.cancel();
		const N = this.N;
		const job = this.queue.run(bake(this.bakeInput(f, N)));
		f.job = job;
		job.promise.then(
			(baked) => {
				if (f.job !== job || this.disposed || N !== this.N) return;
				f.job = null;
				this.upload(f, baked);
				for (const fn of this.bakeListeners) fn(f.id, baked.ms);
			},
			(err) => {
				if (f.job !== job) return;
				f.job = null;
				console.warn(`[crowd] bake "${f.id}" failed`, err);
			}
		);
	}

	private scheduleRebake(f: Formation): void {
		clearTimeout(f.timer);
		f.timer = window.setTimeout(() => {
			if (!this.disposed && this.formations.get(f.id) === f) this.bakeFormation(f);
		}, REBAKE_DEBOUNCE_MS);
	}

	private upload(f: Formation, b: Baked): void {
		const S = Math.round(Math.sqrt(b.targets.length / 4));
		const prev = f.tex;
		f.tex = {
			targets: refresh(prev?.targets ?? null, b.targets, S, S)!,
			paint: refresh(prev?.paint ?? null, b.paint, S, S),
			paintAlt: refresh(prev?.paintAlt ?? null, b.paintAlt, S, S),
			flow: refresh(prev?.flow ?? null, b.flow, S, S),
			paths: b.paths ? refresh(prev?.paths ?? null, b.paths.data, 64, b.paths.rows) : (prev?.paths?.dispose(), null),
			pathRows: b.paths?.rows ?? 1
		};
		f.baked = b;
		f.ready = true;
		f.resolve();
	}

	private disposeTextures(f: Formation): void {
		const t = f.tex;
		if (!t) return;
		t.targets.dispose();
		t.paint?.dispose();
		t.paintAlt?.dispose();
		t.flow?.dispose();
		t.paths?.dispose();
		f.tex = null;
	}

	/** Tracks up to 8 named slots of the formations on screen (dominant side first). */
	private updateNamedSlots(fa: Formation | undefined, fb: Formation | undefined): void {
		// A side with no influence on any entity (mix 0 or 1) names nobody.
		const a = this.mix < 1 ? fa : undefined;
		const b = this.mix > 0 ? fb : undefined;
		const first = this.mix >= 0.5 ? b : a;
		const second = this.mix >= 0.5 ? a : b;
		const n0 = this.namedNames.length;
		let n = this.collectNamed(first, 0);
		if (second !== first) n = this.collectNamed(second, n);
		if (n !== n0 || this.namedDirty) {
			this.namedNames.length = n;
			for (const name of this.namedCache.keys()) {
				if (!this.namedNames.includes(name)) this.namedCache.delete(name);
			}
			this.namedIds.fill(-1, n);
			(this.namedGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
			this.namedGeo.setDrawRange(0, n);
			this.namedDirty = false;
		}
	}

	private namedDirty = false;

	private collectNamed(f: Formation | undefined, n: number): number {
		const named = f?.baked?.named;
		if (!named) return n;
		const names = this.namedNames;
		const S = this.U.uSimSize.value as number;
		for (const name in named) {
			if (n >= MAX_NAMED) break;
			const seen = names.indexOf(name);
			if (seen >= 0 && seen < n) continue;
			const id = named[name];
			if (names[n] !== name || this.namedIds[n] !== id) {
				this.namedDirty = true;
				names[n] = name;
				this.namedIds[n] = id;
				this.namedAttr[n * 3] = ((id % S) + 0.5) / S;
				this.namedAttr[n * 3 + 1] = (Math.floor(id / S) + 0.5) / S;
				this.namedAttr[n * 3 + 2] = n;
			}
			n++;
		}
		return n;
	}

	/** Renders the 8×1 named RT and reads it back: async every 3 frames, else sync every 6th (§8 risk 7). */
	private readNamed(): void {
		if (this.namedBusy) return;
		const r = this.renderer;
		const canAsync = typeof (r as { readRenderTargetPixelsAsync?: unknown }).readRenderTargetPixelsAsync === 'function';
		if (this.frame % (canAsync ? 3 : 6) !== 0) return;
		r.setRenderTarget(this.namedRT);
		r.clear(true, false, false);
		r.render(this.namedPoints, this.camera);
		const snap = this.namedSnapshot;
		snap.length = 0;
		for (const name of this.namedNames) snap.push(name);
		if (canAsync) {
			this.namedBusy = true;
			r.readRenderTargetPixelsAsync(this.namedRT, 0, 0, MAX_NAMED, 1, this.namedBuf).then(this.decodeNamed, this.namedDone);
		} else {
			r.readRenderTargetPixels(this.namedRT, 0, 0, MAX_NAMED, 1, this.namedBuf);
			this.decodeNamed();
		}
	}

	private namedSnapshot: string[] = [];
	private namedDone = (): void => {
		this.namedBusy = false;
	};

	private decodeNamed = (): void => {
		this.namedBusy = false;
		const b = this.namedBuf;
		const vp = this.viewport;
		const names = this.namedSnapshot;
		const visibleCrowd = this.state.alpha > 0;
		for (let i = 0; i < names.length; i++) {
			// Dropped while the read was in flight.
			if (this.namedNames[i] !== names[i]) continue;
			const hx = b[i * 4];
			const lx = b[i * 4 + 1];
			const hy = b[i * 4 + 2];
			const ly = b[i * 4 + 3];
			const spawned = hx + lx + hy + ly > 0;
			const x = (hx * 256 + lx) / 4 - 8192;
			const y = (hy * 256 + ly) / 4 - 8192;
			let entry = this.namedCache.get(names[i]);
			if (!entry) this.namedCache.set(names[i], (entry = { x: 0, y: 0, visible: false }));
			entry.x = x;
			entry.y = y;
			entry.visible = spawned && visibleCrowd && x >= 0 && y >= 0 && x <= vp.w && y <= vp.h;
		}
	};

	private readCount(sim: Sim): void {
		this.countArmed = false;
		const r = this.renderer;
		r.setRenderTarget(this.countRT);
		r.clear(true, false, false);
		r.render(sim.countPoints, this.camera);
		const waiters = this.countWaiters;
		this.countWaiters = [];
		const done = () => {
			let n = 0;
			for (let i = 0; i < 256; i++) n += this.countBuf[i * 4];
			this.lastCount = n;
			for (const w of waiters) w(n);
		};
		r.readRenderTargetPixelsAsync(this.countRT, 0, 0, 256, 1, this.countBuf).then(done, () => {
			r.readRenderTargetPixels(this.countRT, 0, 0, 256, 1, this.countBuf);
			done();
		});
	}
}

const EULER = new THREE.Euler();
