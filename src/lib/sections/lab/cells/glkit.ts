// Shared three.js plumbing for the Lab's WebGL cells (dynamic-import only: it imports three).
// - themeUniforms(): uInk / uGraphite / uSignal / uPaper / uCobalt in linear RGB, kept in step
//   with the theme engine, so the cells retint with the page.
// - opacity: every Lab material multiplies its output by `uOpacity` (hover dim + reveal); the hose
//   pulls its pool's colours toward the paper instead (same look, still one draw call).
// - punch(): an empty GLView with clearAlpha 0 over a whole cell (toolbar to status bar), so the
//   crowd's dots pass *under* every viewport instead of over its canvas and chrome.
import * as THREE from 'three';
import { onThemeColors } from '#lib/core/theme.svelte';
import type { Engine, GLView } from '#lib/gl/types';

export interface ThemeUniforms {
	uInk: { value: THREE.Vector3 };
	uGraphite: { value: THREE.Vector3 };
	uHairline: { value: THREE.Vector3 };
	uSignal: { value: THREE.Vector3 };
	uPaper: { value: THREE.Vector3 };
	uCobalt: { value: THREE.Vector3 };
	uOpacity: { value: number };
}

const COBALT_DARK = new THREE.Color('#5b73ff');
const COBALT_LIGHT = new THREE.Color('#2440ff');

export function themeUniforms(): { uniforms: ThemeUniforms; dispose(): void } {
	const uniforms: ThemeUniforms = {
		uInk: { value: new THREE.Vector3(0.83, 0.81, 0.75) },
		uGraphite: { value: new THREE.Vector3(0.26, 0.25, 0.23) },
		uHairline: { value: new THREE.Vector3(0.02, 0.02, 0.02) },
		uSignal: { value: new THREE.Vector3(1, 0.1, 0.03) },
		uPaper: { value: new THREE.Vector3(0.005, 0.006, 0.005) },
		uCobalt: { value: new THREE.Vector3(0.1, 0.17, 1) },
		uOpacity: { value: 1 }
	};
	const off = onThemeColors((c) => {
		uniforms.uInk.value.fromArray(c.ink);
		uniforms.uGraphite.value.fromArray(c.graphite);
		uniforms.uHairline.value.fromArray(c.hairline);
		uniforms.uSignal.value.fromArray(c.signal);
		uniforms.uPaper.value.fromArray(c.paper);
		const lum = 0.2126 * c.paper[0] + 0.7152 * c.paper[1] + 0.0722 * c.paper[2];
		const cob = lum < 0.2 ? COBALT_DARK : COBALT_LIGHT;
		uniforms.uCobalt.value.set(cob.r, cob.g, cob.b);
	});
	return { uniforms, dispose: off };
}

/** Empty scissored view that clears its rect to transparent (the crowd passes under the cell). */
export function punch(engine: Engine, el: HTMLElement): () => void {
	const scene = new THREE.Scene();
	const camera = new THREE.Camera();
	const view: GLView = { el, scene, camera, rate: 1, clearAlpha: 0 };
	return engine.addView(view);
}

/** Smoothly approaches `target` (exponential, ~`ms` to settle). */
export function approach(current: number, target: number, dt: number, ms = 240): number {
	const k = 1 - Math.exp(-dt / (ms / 1000 / 4));
	return current + (target - current) * k;
}
