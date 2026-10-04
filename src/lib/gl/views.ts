// Scissored sub-views (§7 "Lifecycle", Lab / planet): one shared renderer draws each GLView inside
// its element's rect. Rects come from the region cache (pin-aware, no layout reads per frame);
// an IntersectionObserver skips views that are off screen; rate 2 renders every other frame.
import * as THREE from 'three';
import type { GLView } from './types';
import type { RectPx, RegionRef, Regions } from './crowd/regions';

interface Entry {
	v: GLView;
	ref: RegionRef;
	visible: boolean;
	w: number;
	h: number;
	/** dt accumulated over skipped frames (rate 2). */
	pending: number;
}

export interface Views {
	add(v: GLView): () => void;
	/** Draws every visible view; returns how many were drawn. */
	render(time: number, dt: number, frame: number, scrollY: number): number;
	readonly count: number;
	dispose(): void;
}

export function createViews(renderer: THREE.WebGLRenderer, regions: Regions, viewport: { w: number; h: number }): Views {
	const entries: Entry[] = [];
	const rect: RectPx = { x: 0, y: 0, w: 0, h: 0 };
	const clearColor = new THREE.Color();
	const io = new IntersectionObserver(
		(records) => {
			for (const r of records) {
				const e = entries.find((x) => x.v.el === r.target);
				if (e) e.visible = r.isIntersecting;
			}
		},
		{ rootMargin: '15% 0px' }
	);

	return {
		add(v) {
			const e: Entry = { v, ref: regions.acquire(v.el, 'page'), visible: false, w: 0, h: 0, pending: 0 };
			entries.push(e);
			io.observe(v.el);
			return () => {
				const i = entries.indexOf(e);
				if (i < 0) return;
				entries.splice(i, 1);
				if (!entries.some((x) => x.v.el === v.el)) io.unobserve(v.el);
				regions.release(e.ref);
			};
		},
		get count() {
			return entries.length;
		},
		render(time, dt, frame, scrollY) {
			let drawn = 0;
			const vw = viewport.w;
			const vh = viewport.h;
			for (const e of entries) {
				const v = e.v;
				e.pending += dt;
				if (!e.visible || v.active === false) continue;
				if (v.rate === 2 && frame % 2 === 1) continue;
				regions.rect(e.ref, scrollY, rect);
				if (rect.w < 1 || rect.h < 1 || rect.y + rect.h < 0 || rect.y > vh || rect.x + rect.w < 0 || rect.x > vw) continue;
				if (rect.w !== e.w || rect.h !== e.h) {
					e.w = rect.w;
					e.h = rect.h;
					v.onResize?.(rect.w, rect.h);
				}
				v.update?.(time, e.pending);
				e.pending = 0;
				const y = vh - rect.y - rect.h;
				renderer.setViewport(rect.x, y, rect.w, rect.h);
				renderer.setScissor(rect.x, y, rect.w, rect.h);
				renderer.setScissorTest(true);
				if (v.clearAlpha !== undefined) {
					// Clears the rect to transparent black at `clearAlpha` (0 = punch the crowd out).
					renderer.getClearColor(clearColor);
					const a = renderer.getClearAlpha();
					renderer.setClearColor(0x000000, v.clearAlpha);
					renderer.clear(true, true, false);
					renderer.setClearColor(clearColor, a);
				} else {
					renderer.clearDepth();
				}
				renderer.render(v.scene as THREE.Scene, v.camera as THREE.Camera);
				drawn++;
			}
			if (drawn) {
				renderer.setScissorTest(false);
				renderer.setViewport(0, 0, vw, vh);
			}
			return drawn;
		},
		dispose() {
			io.disconnect();
			for (const e of entries) regions.release(e.ref);
			entries.length = 0;
		}
	};
}
