// The one WebGLRenderer (§7 "Renderer"): fixed full-viewport canvas, transparent over the paper,
// no MSAA (the SDF glyphs anti-alias themselves), DPR capped by tier and by the governor.
import * as THREE from 'three';
import { device } from '#lib/core/device.svelte';

export interface RendererHandle {
	renderer: THREE.WebGLRenderer;
	/** Canvas size in CSS px and the pixel ratio in use. Mutated in place on resize. */
	readonly size: { w: number; h: number; dpr: number; aspect: number };
	/** Re-reads the canvas size and DPR cap; returns true when anything changed. Cheap: no layout read unless flagged. */
	sync(): boolean;
	/** Governor / tier cap on top of the device cap (e.g. 1 for "DPR 1.0"). */
	setDprCap(cap: number): void;
	onResize(fn: (w: number, h: number, dpr: number) => void): () => void;
	dispose(): void;
}

/** Desktop 1.5, mobile 1 (§7), then whatever the tier allows (device.dpr already folds both in). */
function targetDpr(cap: number): number {
	const base = device.dpr || Math.min(window.devicePixelRatio || 1, device.mobile ? 1 : 1.5);
	return Math.max(0.5, Math.min(base, cap, device.mobile ? 1 : 1.5));
}

export function createRenderer(canvas: HTMLCanvasElement, context: WebGL2RenderingContext): RendererHandle {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		context,
		alpha: true,
		antialias: false,
		premultipliedAlpha: true,
		powerPreference: 'high-performance'
	});
	renderer.setClearColor(0x000000, 0);
	renderer.autoClear = false;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	// Draw calls are summed over every pass of a frame; the engine resets the counters itself.
	renderer.info.autoReset = false;

	const size = { w: 1, h: 1, dpr: 1, aspect: 1 };
	const listeners = new Set<(w: number, h: number, dpr: number) => void>();
	let cap = Infinity;
	// Layout is only read when the window says it changed, never in the frame loop by default.
	let dirty = true;

	const markDirty = () => (dirty = true);
	window.addEventListener('resize', markDirty);
	const ro = new ResizeObserver(markDirty);
	ro.observe(canvas);

	function sync(): boolean {
		const dpr = targetDpr(cap);
		if (!dirty && dpr === size.dpr) return false;
		dirty = false;
		const w = Math.max(1, canvas.clientWidth || window.innerWidth);
		const h = Math.max(1, canvas.clientHeight || window.innerHeight);
		if (w === size.w && h === size.h && dpr === size.dpr) return false;
		size.w = w;
		size.h = h;
		size.dpr = dpr;
		size.aspect = w / h;
		renderer.setPixelRatio(dpr);
		renderer.setSize(w, h, false);
		for (const fn of listeners) fn(w, h, dpr);
		return true;
	}

	sync();

	return {
		renderer,
		size,
		sync,
		setDprCap(c: number) {
			cap = c;
			dirty = true;
		},
		onResize(fn) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		dispose() {
			window.removeEventListener('resize', markDirty);
			ro.disconnect();
			listeners.clear();
			renderer.dispose();
		}
	};
}
