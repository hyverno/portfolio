// Ink Swarm page transition (§3.7). cover(): the crowd claims 'transition' and floods into the
// engine's 'fill' formation while the density, thresholded through a Bayer edge, swells into solid
// ink. reveal(): the ink thins back into the crowd and the crowd is released to the new page.
// The canvas is promoted to z 70 for the duration. Reduced motion: a 200ms flat ink crossfade.
import * as THREE from 'three';
import type { Crowd } from './types';
import type { CreateInkSwarm } from './internal';
import {
	FULLSCREEN_VERT,
	OVERLAY_MATERIAL,
	densityNorm,
	ditherPx,
	drawOverlay,
	fullscreenMesh
} from './effects/overlay';
import { INK_FRAG } from './effects/ink.glsl';
import { EASE, gsap, registerMotion } from '#lib/core/motion';
import { device } from '#lib/core/device.svelte';

const OWNER = 'transition';
const FILL = 'fill';
const COVER_S = 0.5;
const REVEAL_S = 0.5;
const FADE_S = 0.2;
const MAX_GAIN = 6;
/** z of the Ink Swarm layer (§2.7). */
const Z_INK = '70';

type Phase = 'idle' | 'covering' | 'covered' | 'revealing';

/** The crowd may expose the formation it currently shows; otherwise the swarm leaves from 'ambient'. */
function currentFormation(crowd: Crowd): string {
	const current = (crowd as Crowd & { current?: string | null }).current;
	return typeof current === 'string' && current ? current : 'ambient';
}

export const createInkSwarm: CreateInkSwarm = (renderer, gpu, crowd) => {
	registerMotion();

	const uniforms = {
		uDensity: { value: gpu.densityTexture() },
		uNorm: { value: densityNorm(gpu) },
		uResolution: { value: new THREE.Vector2(1, 1) },
		uInkGain: { value: 0 },
		uFloor: { value: 0 },
		uFade: { value: 0 },
		uDitherPx: { value: 2 },
		uInk: { value: gpu.colors.ink }
	};
	const material = new THREE.ShaderMaterial({
		vertexShader: FULLSCREEN_VERT,
		fragmentShader: INK_FRAG,
		uniforms,
		...OVERLAY_MATERIAL
	});
	const scene = new THREE.Scene();
	scene.add(fullscreenMesh(material));

	/** Tweened state; uniforms are copied from it at render time. */
	const state = { gain: 0, floor: 0, fade: 0, mix: 0 };
	let phase: Phase = 'idle';
	let reduced = false;
	let claimed = false;
	let timeline: gsap.core.Timeline | null = null;
	let pendingCover: (() => void) | null = null;
	let coverPromise: Promise<void> | null = null;
	let savedZ: string | null = null;

	const canvas = renderer.domElement;

	function promote() {
		if (savedZ === null) savedZ = canvas.style.zIndex;
		canvas.style.zIndex = Z_INK;
	}

	function demote() {
		if (savedZ === null) return;
		canvas.style.zIndex = savedZ;
		savedZ = null;
	}

	function claim() {
		if (claimed) return;
		crowd.claim(OWNER);
		claimed = true;
	}

	function release() {
		if (!claimed) return;
		crowd.release(OWNER);
		claimed = false;
	}

	/** Stops the running timeline; a cover still in flight resolves so nobody waits forever. */
	function stop() {
		timeline?.kill();
		timeline = null;
		pendingCover?.();
		pendingCover = null;
		coverPromise = null;
	}

	function cover(): Promise<void> {
		if (phase === 'covered') return Promise.resolve();
		if (phase === 'covering' && coverPromise) return coverPromise;
		stop();
		phase = 'covering';
		reduced = device.reducedMotion;
		promote();

		coverPromise = new Promise<void>((resolve) => {
			pendingCover = resolve;
			const done = () => {
				phase = 'covered';
				pendingCover = null;
				coverPromise = null;
				resolve();
			};
			const tl = gsap.timeline({ onComplete: done });
			timeline = tl;
			if (reduced) {
				state.gain = state.floor = 0;
				tl.to(state, { fade: 1, duration: FADE_S, ease: 'none' });
				return;
			}
			state.fade = 0;
			claim();
			if (crowd.has(FILL)) {
				const from = currentFormation(crowd);
				state.mix = 0;
				tl.to(
					state,
					{
						mix: 1,
						duration: COVER_S,
						ease: EASE.arrive,
						onUpdate: () => crowd.blend(from, FILL, state.mix, { owner: OWNER })
					},
					0
				);
			}
			tl.to(state, { gain: MAX_GAIN, duration: COVER_S, ease: EASE.arrive }, 0);
			// The floor closes whatever gaps the swarm leaves, through the dither, in the back half.
			tl.to(state, { floor: 1, duration: COVER_S * 0.55, ease: 'power2.in' }, COVER_S * 0.45);
		});
		return coverPromise;
	}

	function reveal(): Promise<void> {
		if (phase === 'idle') return Promise.resolve();
		stop();
		phase = 'revealing';
		// The new page's anchor formation takes over while the ink thins.
		release();
		return new Promise<void>((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => {
					phase = 'idle';
					timeline = null;
					demote();
					resolve();
				}
			});
			timeline = tl;
			if (reduced || state.fade > 0) {
				tl.to(state, { fade: 0, duration: FADE_S, ease: 'none' });
				return;
			}
			tl.to(state, { floor: 0, duration: REVEAL_S * 0.4, ease: 'power2.out' }, 0);
			tl.to(state, { gain: 0, duration: REVEAL_S, ease: EASE.steer }, 0);
		});
	}

	const bufferSize = new THREE.Vector2();

	return {
		cover,
		reveal,
		get active() {
			return phase !== 'idle';
		},
		render(r: THREE.WebGLRenderer) {
			if (phase === 'idle') return;
			r.getDrawingBufferSize(bufferSize);
			uniforms.uResolution.value.copy(bufferSize);
			uniforms.uDensity.value = gpu.densityTexture();
			uniforms.uNorm.value = densityNorm(gpu);
			uniforms.uInk.value = gpu.colors.ink;
			uniforms.uInkGain.value = state.gain;
			uniforms.uFloor.value = state.floor;
			uniforms.uFade.value = state.fade;
			uniforms.uDitherPx.value = ditherPx(r);
			drawOverlay(r, scene);
		},
		dispose() {
			stop();
			release();
			demote();
			phase = 'idle';
			material.dispose();
		}
	};
};
