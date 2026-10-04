// GPU damage numbers (§S3): a ring buffer of instanced quads. Spawning writes one slot and marks
// it dirty; dirty slots are uploaded once per task with addUpdateRange (never a full re-upload).
import * as THREE from 'three';
import type { CreateDamageNumbers, Effect } from '../internal';
import type { DamageNumbers, GLView } from '../types';
import { OVERLAY_MATERIAL, drawOverlay } from '../effects/overlay';
import { acquireAtlas, releaseAtlas } from './atlas';
import { NUMBERS_FRAG, NUMBERS_VERT } from './numbers.glsl';
import { stats } from '#lib/core/stats.svelte';
import { device } from '#lib/core/device.svelte';
import { onThemeColors } from '#lib/core/theme.svelte';

type SpawnOptions = Parameters<DamageNumbers['spawn']>[2];
type BurstOptions = Parameters<DamageNumbers['burst']>[2];

/** Seconds a number lives (fade starts at 78%, i.e. .7s). */
export const LIFE = 0.9;
/** Default font size of a number in CSS px (crits ×1.6). */
export const DEFAULT_SIZE = 22;
/** Lab hose gravity, px/s² (y down). */
export const HOSE_GRAVITY = 900;
const MAX_VALUE = 9_999_999;

// Every instance contributes to the HUD's NUMBERS ON SCREEN.
const instances = new Set<{ live: number }>();
let pendingDrawn = 0;
let drawnQueued = false;

function flushDrawn() {
	drawnQueued = false;
	stats.numbersDrawn += pendingDrawn;
	pendingDrawn = 0;
}

function publishOnScreen() {
	let n = 0;
	for (const i of instances) n += i.live;
	if (stats.onScreen !== n) stats.onScreen = n;
}

/** Linear RGB 0..1 → packed sRGB8 + 1 (0 is reserved for "theme colour"). */
function packColor(c: [number, number, number] | undefined): number {
	if (!c) return 0;
	const s = (v: number) => {
		const x = Math.min(1, Math.max(0, v));
		return Math.round((x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055) * 255);
	};
	return s(c[0]) * 65536 + s(c[1]) * 256 + s(c[2]) + 1;
}

function digitCount(v: number): number {
	return v < 10 ? 1 : Math.floor(Math.log10(v)) + 1;
}

/** A plausible damage roll when no value is given: mostly two and three digits. */
function rollValue(): number {
	return Math.round(8 + Math.random() ** 2 * 480);
}

/** DamageNumbers plus the engine Effect hooks, and a tunable glyph size. */
export type DamageNumbersFx = DamageNumbers &
	Effect & {
		/** Font size of a number in CSS px (default 22; crits draw at ×1.6). */
		size: number;
	};

export function createDamageNumbersImpl(
	_renderer: THREE.WebGLRenderer,
	o: { capacity: number; view?: GLView }
): DamageNumbersFx {
	const capacity = Math.max(1, Math.floor(o.capacity));
	const view: GLView | undefined = o.view;
	const epoch = performance.now();
	const now = () => (performance.now() - epoch) / 1000;

	const atlas = acquireAtlas();

	// ── Geometry: one quad, per-instance attributes in a ring ────────────────────────────────
	const geometry = new THREE.InstancedBufferGeometry();
	geometry.setAttribute(
		'position',
		new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)
	);
	geometry.setIndex([0, 1, 2, 0, 2, 3]);

	const attr = (name: string, size: number) => {
		const a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size);
		a.setUsage(THREE.DynamicDrawUsage);
		geometry.setAttribute(name, a);
		return a;
	};
	const aSpawn = attr('aSpawn', 3);
	const aValue = attr('aValue', 1);
	const aFlags = attr('aFlags', 3);
	const aVel = attr('aVel', 4);
	const ring = [aSpawn, aValue, aFlags, aVel];
	const spawnArr = aSpawn.array as Float32Array;
	const valueArr = aValue.array as Float32Array;
	const flagArr = aFlags.array as Float32Array;
	const velArr = aVel.array as Float32Array;
	geometry.instanceCount = 0;

	// ── Material ─────────────────────────────────────────────────────────────────────────────
	const uniforms = {
		uTime: { value: 0 },
		uLife: { value: LIFE },
		uViewport: { value: new THREE.Vector2(1, 1) },
		uSize: { value: DEFAULT_SIZE },
		uAdvance: { value: atlas.advance },
		uAtlas: { value: atlas.texture },
		uInk: { value: new THREE.Vector3(0.006, 0.006, 0.005) },
		uSignal: { value: new THREE.Vector3(1, 0.068, 0.012) }
	};
	const material = new THREE.ShaderMaterial({
		vertexShader: NUMBERS_VERT,
		fragmentShader: NUMBERS_FRAG,
		uniforms,
		...OVERLAY_MATERIAL
	});
	const offAtlas = atlas.onChange(() => (uniforms.uAdvance.value = atlas.advance));
	const offTheme = onThemeColors((c) => {
		uniforms.uInk.value.fromArray(c.ink);
		uniforms.uSignal.value.fromArray(c.signal);
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.frustumCulled = false;
	mesh.renderOrder = 10;
	mesh.name = 'damage-numbers';

	// Overlay: own scene. View: lives in the view's scene, projected into the view's rect.
	const scene = new THREE.Scene();
	let ro: ResizeObserver | null = null;
	if (view) {
		(view.scene as THREE.Scene).add(mesh);
		const measure = () => uniforms.uViewport.value.set(Math.max(1, view.el.clientWidth), Math.max(1, view.el.clientHeight));
		measure();
		ro = new ResizeObserver(measure);
		ro.observe(view.el);
		mesh.onBeforeRender = () => tick();
	} else {
		scene.add(mesh);
	}

	// ── Ring bookkeeping ─────────────────────────────────────────────────────────────────────
	const deaths = new Float32Array(capacity);
	let head = 0;
	/** Oldest slot that may still be alive. */
	let tail = 0;
	let liveCount = 0;
	let total = 0;
	let filled = 0;
	let dirtyFrom = 0;
	let dirtyN = 0;
	let flushQueued = false;
	const self = { live: 0 };
	instances.add(self);

	function flush() {
		flushQueued = false;
		if (dirtyN === 0) return;
		const first = dirtyN >= capacity ? 0 : dirtyFrom;
		const n = Math.min(dirtyN, capacity);
		const end = first + n;
		for (const a of ring) {
			const s = a.itemSize;
			if (end <= capacity) a.addUpdateRange(first * s, n * s);
			else {
				a.addUpdateRange(first * s, (capacity - first) * s);
				a.addUpdateRange(0, (end - capacity) * s);
			}
			a.needsUpdate = true;
		}
		geometry.instanceCount = filled;
		dirtyN = 0;
	}

	function tick() {
		const t = now();
		uniforms.uTime.value = t;
		while (liveCount > 0 && deaths[tail] <= t) {
			tail = (tail + 1) % capacity;
			liveCount--;
		}
		if (self.live !== liveCount) {
			self.live = liveCount;
			publishOnScreen();
		}
	}

	function write(x: number, y: number, delay: number, opt: SpawnOptions = {}) {
		const glyph = opt.glyph === 'dot' ? 1 : 0;
		const crit = glyph === 0 && !!opt.crit;
		let value = Math.max(0, Math.round(opt.value ?? rollValue()));
		if (crit) value = Math.round(value * 2.5);
		value = Math.min(MAX_VALUE, value);
		const chars = glyph ? 1 : digitCount(value) + (crit ? 1 : 0);
		const t0 = now() + delay;

		const i = head;
		if (liveCount === capacity) {
			// Overwriting the oldest live number.
			tail = (tail + 1) % capacity;
			liveCount--;
		}
		spawnArr[i * 3] = x;
		spawnArr[i * 3 + 1] = y;
		spawnArr[i * 3 + 2] = t0;
		valueArr[i] = value;
		flagArr[i * 3] = crit ? 1 : 0;
		flagArr[i * 3 + 1] = chars;
		flagArr[i * 3 + 2] = glyph;
		velArr[i * 4] = opt.vx ?? 0;
		velArr[i * 4 + 1] = opt.vy ?? 0;
		velArr[i * 4 + 2] = opt.gravity ?? 0;
		velArr[i * 4 + 3] = packColor(opt.color);
		deaths[i] = t0 + LIFE;

		if (dirtyN === 0) dirtyFrom = i;
		dirtyN++;
		head = (head + 1) % capacity;
		filled = Math.min(filled + 1, capacity);
		liveCount++;
		total++;

		if (!flushQueued) {
			flushQueued = true;
			queueMicrotask(flush);
		}
		pendingDrawn++;
		if (!drawnQueued) {
			drawnQueued = true;
			queueMicrotask(flushDrawn);
		}
	}

	// Reduced motion: no damage numbers on the global overlay (§7). Views decide for themselves.
	const muted = () => !view && device.reducedMotion;

	function spawn(xPx: number, yPx: number, opt?: SpawnOptions) {
		if (muted()) return;
		write(xPx, yPx, 0, opt);
	}

	function burst(xPx: number, yPx: number, opt: BurstOptions) {
		if (muted()) return;
		const count = Math.min(Math.max(0, Math.floor(opt.count)), capacity);
		const critRate = opt.critRate ?? 0.1;
		const dots = opt.glyph === 'dot';
		const phase = Math.random() * Math.PI * 2;
		for (let k = 0; k < count; k++) {
			// Even spacing with jitter, popping around the ring like a wave instead of all at once.
			const turn = (k + Math.random() * 0.6) / count;
			const a = phase + turn * Math.PI * 2;
			const r = opt.radius * (0.85 + Math.random() * 0.3);
			const cx = Math.cos(a);
			const cy = Math.sin(a);
			if (dots) {
				// Crumbs: thrown outward and up, then they fall.
				const speed = 120 + Math.random() * 220;
				write(xPx + cx * r * 0.3, yPx + cy * r * 0.3, turn * 0.06, {
					glyph: 'dot',
					color: opt.color,
					vx: cx * speed,
					vy: cy * speed - 260,
					gravity: HOSE_GRAVITY
				});
			} else {
				write(xPx + cx * r, yPx + cy * r, turn * 0.12, {
					crit: Math.random() < critRate,
					color: opt.color
				});
			}
		}
	}

	const viewport = new THREE.Vector2();

	return {
		spawn,
		burst,
		get live() {
			return liveCount;
		},
		get total() {
			return total;
		},
		capacity,
		object: mesh,
		/** Font size of a number in CSS px (default 22; crits draw at ×1.6). */
		get size() {
			return uniforms.uSize.value;
		},
		set size(px: number) {
			uniforms.uSize.value = px;
		},
		update() {
			tick();
		},
		render(r: THREE.WebGLRenderer) {
			// Inside a view the engine draws the mesh with the view's scene.
			if (view) return;
			tick();
			if (liveCount === 0) return;
			r.getSize(viewport);
			uniforms.uViewport.value.copy(viewport);
			drawOverlay(r, scene);
		},
		resize(w: number, h: number) {
			if (!view) uniforms.uViewport.value.set(w, h);
		},
		dispose() {
			instances.delete(self);
			publishOnScreen();
			ro?.disconnect();
			offAtlas();
			offTheme();
			mesh.removeFromParent();
			geometry.dispose();
			material.dispose();
			releaseAtlas();
		}
	};
}

export const createDamageNumbers: CreateDamageNumbers = createDamageNumbersImpl;
