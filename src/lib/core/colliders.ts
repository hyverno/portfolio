// DOM colliders (§S2 "The DOM is level geometry"). Rects are cached in page space by a
// ResizeObserver (+ window resize and ScrollTrigger refresh), so the per-frame pack is pure math.
import { ScrollTrigger, registerMotion } from './motion';

interface Collider {
	el: HTMLElement;
	pad: number;
	/** Page-space rect, CSS px. */
	left: number;
	top: number;
	width: number;
	height: number;
	/** Scratch: distance to the viewport for the current pack. */
	d: number;
}

export const MAX_COLLIDERS = 16;

const colliders = new Map<HTMLElement, Collider>();
let scratch: Collider[] = [];
let ro: ResizeObserver | null = null;
let raf = 0;

function measure(c: Collider) {
	const r = c.el.getBoundingClientRect();
	c.left = r.left + window.scrollX;
	c.top = r.top + window.scrollY;
	c.width = r.width;
	c.height = r.height;
}

/** Re-measures every collider (layout above may have shifted without resizing them). */
export function refreshColliders(): void {
	for (const c of colliders.values()) measure(c);
}

function scheduleRefresh() {
	cancelAnimationFrame(raf);
	raf = requestAnimationFrame(refreshColliders);
}

function ensureObservers() {
	if (ro) return;
	registerMotion();
	ro = new ResizeObserver((records) => {
		for (const r of records) {
			const c = colliders.get(r.target as HTMLElement);
			if (c) measure(c);
		}
	});
	window.addEventListener('resize', scheduleRefresh);
	ScrollTrigger.addEventListener('refresh', refreshColliders);
	document.fonts?.ready.then(scheduleRefresh);
}

/** Registers `el` as an obstacle for the crowd. `pad` grows the box, in CSS px. */
export function registerCollider(el: HTMLElement, pad = 0): () => void {
	if (typeof window === 'undefined') return () => {};
	ensureObservers();
	const c: Collider = { el, pad, left: 0, top: 0, width: 0, height: 0, d: 0 };
	measure(c);
	colliders.set(el, c);
	scratch = [...colliders.values()];
	ro!.observe(el);
	return () => {
		if (colliders.get(el) !== c) return;
		colliders.delete(el);
		scratch = [...colliders.values()];
		ro?.unobserve(el);
	};
}

/**
 * Writes the 16 colliders nearest the viewport into `out` (16 × vec4: cx, cy, hw, hh) in world
 * units (x = (px − vw/2)/(vh/2), y = −(py − vh/2)/(vh/2)). Unused slots are zeroed. Returns the count.
 */
export function packColliders(out: Float32Array, vw: number, vh: number, scrollY: number): number {
	const list = scratch;
	for (let i = 0; i < list.length; i++) {
		const c = list[i];
		if (c.width === 0 && c.height === 0) {
			c.d = Infinity;
			continue;
		}
		const top = c.top - scrollY;
		const bottom = top + c.height;
		// 0 while intersecting; otherwise the vertical gap to the viewport.
		c.d = bottom < 0 ? -bottom : top > vh ? top - vh : 0;
	}
	if (list.length > MAX_COLLIDERS) list.sort((a, b) => a.d - b.d);

	const half = vh / 2;
	const max = Math.min(MAX_COLLIDERS, (out.length / 4) | 0);
	let n = 0;
	for (let i = 0; i < list.length && n < max; i++) {
		const c = list[i];
		if (c.d === Infinity) continue;
		const cx = c.left + c.width / 2;
		const cy = c.top - scrollY + c.height / 2;
		const o = n * 4;
		out[o] = (cx - vw / 2) / half;
		out[o + 1] = -(cy - half) / half;
		out[o + 2] = (c.width / 2 + c.pad) / half;
		out[o + 3] = (c.height / 2 + c.pad) / half;
		n++;
	}
	out.fill(0, n * 4);
	return n;
}
