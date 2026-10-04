// View modes (§S4): [1] LIT (nothing to add), [2] DENSITY heatmap, [3] DEBUG (shader quadtree,
// velocity vectors, DOM overlay), [4] IDS (drawn by the crowd shader). A switch sweeps the new
// mode in from the top over 240ms: 'snap' eased, quantised to 8 steps, led by a signal scanline.
import * as THREE from 'three';
import type { CrowdGPU, CreateViewModes, Effect } from './internal';
import type { ViewMode } from './types';
import { FULLSCREEN_VERT, OVERLAY_MATERIAL, ditherPx, drawOverlay, fullscreenMesh } from './effects/overlay';
import { DENSITY_FRAG, QUADTREE_FRAG, SCANLINE_FRAG, VELOCITY_FRAG, VELOCITY_VERT } from './effects/viewmodes.glsl';
import { createDebugOverlay } from './debugOverlay';
import { gsap, registerMotion } from '#lib/core/motion';
import { device } from '#lib/core/device.svelte';
import { hexToLinear } from '#lib/core/theme.svelte';

const SWEEP_MS = 240;
const SWEEP_STEPS = 8;
/** Density ramp's second stop (§2.1 chapter palettes): Le Rongeur apricot. */
const APRICOT = '#F2894B';

export interface ViewModeParams {
	/** Density → ramp gain for [2] (soft knee: t = 1 − e^(−d·gain)). */
	densityGain: number;
	/** Mean cell density above which a quadtree cell subdivides ([3]). */
	quadThreshold: number;
	/** Velocity vector length: pos → pos + vel × scale (world units, [3]). */
	vectorScale: number;
	/** Mode-switch sweep duration, ms (§S4: 240). */
	sweepMs: number;
}

export type ViewModes = Effect & {
	readonly mode: ViewMode;
	set(m: ViewMode): void;
	/** Live-tunable shader parameters (dev pages). */
	readonly params: ViewModeParams;
};

function velocityGeometry(simSize: number): THREE.BufferGeometry {
	const n = simSize * simSize;
	const segments = Math.ceil(n / 4);
	const data = new Float32Array(segments * 6);
	for (let s = 0; s < segments; s++) {
		const i = s * 4;
		const u = ((i % simSize) + 0.5) / simSize;
		const v = (Math.floor(i / simSize) + 0.5) / simSize;
		data.set([u, v, 0, u, v, 1], s * 6);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
	return g;
}

export function createViewModesImpl(renderer: THREE.WebGLRenderer, gpu: CrowdGPU): ViewModes {
	registerMotion();
	const snap = gsap.parseEase('snap') ?? ((p: number) => p);
	const params: ViewModeParams = { densityGain: 2.5, quadThreshold: 0.02, vectorScale: 0.08, sweepMs: SWEEP_MS };

	// Shared uniform values: every pass reads the same objects.
	const resolution = new THREE.Vector2(1, 1);
	const dpr = { value: 1 };
	const mask = (): { value: THREE.Vector2 } => ({ value: new THREE.Vector2(0, 1) });

	const density = new THREE.ShaderMaterial({
		vertexShader: FULLSCREEN_VERT,
		fragmentShader: DENSITY_FRAG,
		uniforms: {
			uDensity: { value: gpu.densityTexture() },
			uGain: { value: params.densityGain },
			uDitherPx: { value: 2 },
			uApricot: { value: new THREE.Vector3(...hexToLinear(APRICOT)) },
			uSignal: { value: gpu.colors.signal },
			uInk: { value: gpu.colors.ink },
			uResolution: { value: resolution },
			uMask: mask()
		},
		...OVERLAY_MATERIAL
	});

	const quadtree = new THREE.ShaderMaterial({
		vertexShader: FULLSCREEN_VERT,
		fragmentShader: QUADTREE_FRAG,
		uniforms: {
			uDensity: { value: gpu.densityTexture() },
			uDensitySize: { value: gpu.densitySize },
			uThreshold: { value: params.quadThreshold },
			uMipmaps: { value: gpu.densityMipmaps ? 1 : 0 },
			uDpr: dpr,
			uPaper: { value: gpu.colors.paper },
			uResolution: { value: resolution },
			uMask: mask()
		},
		...OVERLAY_MATERIAL
	});

	const velocity = new THREE.ShaderMaterial({
		vertexShader: VELOCITY_VERT,
		fragmentShader: VELOCITY_FRAG,
		uniforms: {
			uPos: { value: gpu.posTexture() },
			uVel: { value: gpu.velTexture() },
			uAspect: { value: gpu.viewport.aspect },
			uScale: { value: params.vectorScale },
			uPaper: { value: gpu.colors.paper },
			uResolution: { value: resolution },
			uMask: mask()
		},
		...OVERLAY_MATERIAL
	});

	const scanline = new THREE.ShaderMaterial({
		vertexShader: FULLSCREEN_VERT,
		fragmentShader: SCANLINE_FRAG,
		uniforms: {
			uResolution: { value: resolution },
			uY: { value: 0 },
			uDpr: dpr,
			uSignal: { value: gpu.colors.signal }
		},
		...OVERLAY_MATERIAL
	});

	const scene = new THREE.Scene();
	const densityMesh = fullscreenMesh(density, 0);
	const quadMesh = fullscreenMesh(quadtree, 1);
	let simSize = gpu.simSize;
	const vectors = new THREE.LineSegments(velocityGeometry(simSize), velocity);
	vectors.frustumCulled = false;
	vectors.renderOrder = 2;
	const scanMesh = fullscreenMesh(scanline, 3);
	scene.add(densityMesh, quadMesh, vectors, scanMesh);

	const overlay = createDebugOverlay(renderer);

	let mode: ViewMode = 1;
	let prev: ViewMode = 1;
	/** performance.now() at the start of the running sweep, or -1. */
	let sweepStart = -1;
	let sweep = 1;

	function bandFor(m: ViewMode): [number, number] {
		if (sweepStart < 0) return m === mode ? [0, 1] : [0, 0];
		if (m === mode) return [0, sweep];
		if (m === prev) return [sweep, 1];
		return [0, 0];
	}

	function applyBands() {
		const [d0, d1] = bandFor(2);
		const [q0, q1] = bandFor(3);
		(density.uniforms.uMask.value as THREE.Vector2).set(d0, d1);
		(quadtree.uniforms.uMask.value as THREE.Vector2).set(q0, q1);
		(velocity.uniforms.uMask.value as THREE.Vector2).set(q0, q1);
		densityMesh.visible = d1 > d0;
		quadMesh.visible = vectors.visible = q1 > q0;
		scanMesh.visible = sweepStart >= 0 && sweep < 1;
		scanline.uniforms.uY.value = sweep;
		if (overlay.visible) overlay.setBand(q0, q1);
	}

	/** End-of-sweep side effects: hide what the old mode left behind. */
	function commit() {
		sweepStart = -1;
		sweep = 1;
		if (mode === 2) gpu.setPointsVisible(false);
		if (mode !== 3) overlay.hide();
		applyBands();
	}

	function set(m: ViewMode) {
		if (m === mode) return;
		if (sweepStart >= 0) commit();
		prev = mode;
		mode = m;
		// Side effects that cannot be swept per pixel happen immediately.
		if (prev === 4) gpu.setIdsMode(false);
		if (m === 4) gpu.setIdsMode(true);
		if (prev === 2) gpu.setPointsVisible(true);
		if (m === 3) overlay.show();
		if (device.reducedMotion) {
			commit();
			return;
		}
		sweepStart = performance.now();
		sweep = 1 / SWEEP_STEPS;
		applyBands();
	}

	applyBands();
	const bufferSize = new THREE.Vector2();

	return {
		get mode() {
			return mode;
		},
		set,
		params,
		update(_t: number, dt: number) {
			if (sweepStart >= 0) {
				const p = Math.min(1, (performance.now() - sweepStart) / params.sweepMs);
				// steps(8), jump-start: the first band lands on the very next frame (§3.1.6).
				sweep = Math.min(1, Math.ceil(snap(p) * SWEEP_STEPS + 1e-6) / SWEEP_STEPS);
				if (p >= 1) commit();
				else applyBands();
			}
			overlay.update(dt);
		},
		render(r: THREE.WebGLRenderer) {
			if (!densityMesh.visible && !quadMesh.visible && !scanMesh.visible) return;
			if (gpu.simSize !== simSize) {
				simSize = gpu.simSize;
				vectors.geometry.dispose();
				vectors.geometry = velocityGeometry(simSize);
			}
			r.getDrawingBufferSize(bufferSize);
			resolution.copy(bufferSize);
			dpr.value = r.getPixelRatio();

			const tex = gpu.densityTexture();
			const du = density.uniforms;
			du.uDensity.value = tex;
			du.uGain.value = params.densityGain;
			du.uDitherPx.value = ditherPx(r);
			du.uSignal.value = gpu.colors.signal;
			du.uInk.value = gpu.colors.ink;

			const qu = quadtree.uniforms;
			qu.uDensity.value = tex;
			qu.uDensitySize.value = gpu.densitySize;
			qu.uThreshold.value = params.quadThreshold;
			qu.uMipmaps.value = gpu.densityMipmaps ? 1 : 0;
			qu.uPaper.value = gpu.colors.paper;

			const vu = velocity.uniforms;
			vu.uPos.value = gpu.posTexture();
			vu.uVel.value = gpu.velTexture();
			vu.uAspect.value = gpu.viewport.aspect;
			vu.uScale.value = params.vectorScale;
			vu.uPaper.value = gpu.colors.paper;

			scanline.uniforms.uSignal.value = gpu.colors.signal;
			drawOverlay(r, scene);
		},
		dispose() {
			if (mode === 4) gpu.setIdsMode(false);
			if (mode === 2) gpu.setPointsVisible(true);
			overlay.dispose();
			for (const m of [density, quadtree, velocity, scanline]) m.dispose();
			vectors.geometry.dispose();
		}
	};
}

export const createViewModes: CreateViewModes = createViewModesImpl;
