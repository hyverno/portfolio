// Lab cell 02 · ADVANCED DRAW NUMBER: the Damage Number Hose (WebGL cousin of the UE plugin).
// A dedicated pool from engine.createNumbers({ capacity, view }): one instanced draw call, every
// number written once and then moved by the GPU on a ballistic arc (p = o + v·age + ½·g·age²,
// g = 900 px/s²). Holding the pointer (or [E] / Space) opens the hose at 40 numbers a frame and it
// keeps opening (×2 every .45 s) until the pool is full, because it does not care. ON SCREEN,
// DRAW CALLS and JS MS are measured, not quoted. 20,000 on screen unlocks BULLET HELL.
import * as THREE from 'three';
import type { DamageNumbers, Engine, GLView } from '#lib/gl/types';
import { unlock } from '#lib/stores/achievements.svelte';
import { PRIORITY, onFrame } from '#lib/core/ticker';
import { createGate } from './loop';
import { approach, themeUniforms } from './glkit';
import { HOSE_NOZZLE_Y as NOZZLE_Y, type LabSceneImpl, type PointerInfo } from './types';

export const GRAVITY = 900;
/** Numbers per frame (at 60 fps) the moment the hose opens. */
export const BASE_PER_FRAME = 40;
/** While held, the rate doubles every RAMP seconds, up to what the pool can keep alive. */
const RAMP = 0.45;
const LIFE = 0.9;
const BULLET_HELL = 20000;
const IDLE_PER_SECOND = 66;
const SIZE = 15;
const MAX_PER_STEP = 2500;

export interface HoseOptions {
	capacity: number;
	reducedMotion: () => boolean;
}

type Pool = DamageNumbers & { size?: number; update?: () => void; dispose(): void };

export function create(el: HTMLElement, engine: Engine, o: HoseOptions): LabSceneImpl {
	const renderer = engine.renderer as THREE.WebGLRenderer;
	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	const theme = themeUniforms();
	const u = theme.uniforms;

	let W = el.clientWidth || 400;
	let H = el.clientHeight || 250;
	// A spawner must not lose output on a slow frame: up to a quarter second per step.
	const gate = createGate(0.25);
	let running = false;
	let opacity = 0;
	let opacityTarget = 0;
	let pointerHold = false;
	let keyHold = false;
	let heldFor = 0;
	let carry = 0;
	let idleCarry = 0;
	const ptr = { x: W / 2, y: H * 0.7, inside: false };

	// ── measurement: draw calls and JS time of this view, from the renderer itself ───────────
	let callsBefore = 0;
	let calls = 1;
	let renderT0 = 0;
	let jsAcc = 0;
	let jsFrames = 0;
	let jsMs = 0;
	let jsT = 0;
	scene.onBeforeRender = () => {
		callsBefore = renderer.info.render.calls;
		renderT0 = performance.now();
	};
	scene.onAfterRender = () => {
		calls = renderer.info.render.calls - callsBefore;
		jsAcc += performance.now() - renderT0;
	};

	let lastUpdate = 0;
	const view: GLView = {
		el,
		scene,
		camera,
		rate: 1,
		clearAlpha: 0,
		update(time, dt) {
			lastUpdate = performance.now();
			opacity = approach(opacity, opacityTarget, dt);
			u.uOpacity.value = opacity;
			fadeNumbers();
			const t0 = performance.now();
			const d = running ? gate.pass(dt) : 0;
			if (d > 0) spawn(d);
			jsAcc += performance.now() - t0;
			jsFrames++;
			if (time - jsT > 0.25) {
				jsT = time;
				jsMs = jsFrames ? jsAcc / jsFrames : 0;
				jsAcc = 0;
				jsFrames = 0;
			}
		},
		onResize(w, h) {
			W = w;
			H = h;
		}
	};

	const pool = engine.createNumbers({ capacity: o.capacity, view }) as Pool;
	// Dim / reveal without a second draw call: the pool's own ink and signal, pulled toward the
	// paper. Written every frame after the theme engine, so a theme tween still lands.
	const numbersMat = (pool.object as THREE.Mesh | null)?.material as THREE.ShaderMaterial | undefined;
	function fadeNumbers() {
		const nu = numbersMat?.uniforms;
		if (!nu?.uInk || !nu.uSignal) return;
		const k = 1 - opacity;
		(nu.uInk.value as THREE.Vector3).copy(u.uInk.value).lerp(u.uPaper.value, k);
		(nu.uSignal.value as THREE.Vector3).copy(u.uSignal.value).lerp(u.uPaper.value, k);
	}
	pool.size = SIZE;
	const capacity = Math.max(1, pool.capacity || o.capacity);
	const maxRate = capacity / LIFE;
	const offView = engine.addView(view);

	// Off screen the view is not rendered, so its pool would never retire its numbers from the
	// HUD's ON SCREEN total: tick it here until it is empty.
	const offTick = onFrame(() => {
		if (pool.live > 0 && performance.now() - lastUpdate > 120) pool.update?.();
	}, PRIORITY.ui);

	/** Where the hose points: the pointer, or (keyboard) a fixed nozzle low in the viewport. */
	function spawnOrigin(): [number, number] {
		if (ptr.inside) return [ptr.x, ptr.y];
		return [W / 2, H * NOZZLE_Y];
	}

	function spawn(d: number) {
		const hold = pointerHold || keyHold;
		if (hold) {
			heldFor += d;
			const rate = Math.min(maxRate, BASE_PER_FRAME * 60 * 2 ** (heldFor / RAMP));
			carry += rate * d;
			// A hitch must not snowball: one step never writes more than ~2 frames' worth at full rate.
			const n = Math.min(Math.floor(carry), MAX_PER_STEP);
			carry = Math.min(carry - n, MAX_PER_STEP);
			const [ox, oy] = spawnOrigin();
			for (let i = 0; i < n; i++) {
				const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
				const sp = 260 + Math.random() * 400;
				pool.spawn(ox + (Math.random() - 0.5) * 6, oy + (Math.random() - 0.5) * 6, {
					crit: Math.random() < 0.1,
					vx: Math.cos(a) * sp,
					vy: Math.sin(a) * sp,
					gravity: GRAVITY
				});
			}
			if (pool.live >= BULLET_HELL) unlock('bullet-hell');
			return;
		}
		heldFor = 0;
		carry = 0;
		if (o.reducedMotion()) return;
		// Idle: a quiet fountain from the bottom edge, so the viewport is never empty.
		idleCarry += IDLE_PER_SECOND * d;
		const n = Math.floor(idleCarry);
		idleCarry -= n;
		for (let i = 0; i < n; i++) {
			const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
			const sp = Math.sqrt(2 * GRAVITY * H * (0.3 + Math.random() * 0.55));
			pool.spawn(W / 2 + (Math.random() - 0.5) * 24, H + 8, {
				crit: Math.random() < 0.1,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp,
				gravity: GRAVITY
			});
		}
	}

	const stats = { live: 0, calls: 1, jsMs: 0, capacity, rate: 0 };

	return {
		view,
		get stats() {
			stats.live = pool.live;
			stats.calls = calls;
			stats.jsMs = jsMs;
			stats.rate = pointerHold || keyHold ? Math.min(maxRate, BASE_PER_FRAME * 60 * 2 ** (heldFor / RAMP)) : 0;
			return stats;
		},
		start() {
			running = true;
		},
		stop() {
			running = false;
			pointerHold = false;
			keyHold = false;
		},
		setRate(r) {
			gate.setRate(r);
		},
		resize(w, h) {
			W = w;
			H = h;
		},
		setOpacity(a) {
			opacityTarget = a;
		},
		key(k, down) {
			if (k !== 'hold') return false;
			keyHold = down;
			return true;
		},
		pointer(p: PointerInfo) {
			ptr.x = p.x;
			ptr.y = p.y;
			ptr.inside = p.inside;
			pointerHold = p.down && p.inside;
		},
		dispose() {
			offTick();
			offView();
			pool.dispose();
			theme.dispose();
		}
	};
}
