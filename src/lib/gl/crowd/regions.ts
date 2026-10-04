// Region rects (§S2 "Region mapping"): measured by ResizeObserver, window resize and ScrollTrigger
// refresh, cached in page space, and turned into viewport rects per frame with pure arithmetic.
// Never calls getBoundingClientRect in the frame loop.
//
// Pins: an element inside a pinned section stops moving while its pin is active. The cache stores
// the un-pinned page position and adds the pin's progress in px back per frame, so regions and
// GL views inside pinned sections stay glued to the DOM.
import { ScrollTrigger, registerMotion } from '#lib/core/motion';

export interface RectPx {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface RegionRef {
	readonly el: HTMLElement;
	readonly space: 'page' | 'fixed';
	/** Size in CSS px (as last measured). */
	readonly w: number;
	readonly h: number;
	/** Left edge in CSS px (pages never scroll horizontally, so this is also the viewport x). */
	readonly left: number;
	/** body / html: the region is the canvas viewport itself (never scrolls). */
	readonly viewport: boolean;
}

interface Entry extends RegionRef {
	w: number;
	h: number;
	/** Page-space (space 'page') or client-space (space 'fixed') top-left, CSS px. */
	left: number;
	top: number;
	pin: ScrollTrigger | null;
	refs: number;
	listeners: Set<() => void>;
}

function pinShift(e: Entry, scrollY: number): number {
	const st = e.pin;
	if (!st) return 0;
	return Math.min(Math.max(scrollY - st.start, 0), Math.max(0, st.end - st.start));
}

export class Regions {
	private entries: Entry[] = [];
	private ro: ResizeObserver;
	private raf = 0;
	private disposed = false;

	/** `viewport()` returns the canvas size in CSS px (the world's reference frame). */
	constructor(private viewport: () => { w: number; h: number }) {
		registerMotion();
		this.ro = new ResizeObserver((records) => {
			for (const r of records) {
				for (const e of this.entries) if (e.el === r.target) this.measure(e, true);
			}
		});
		window.addEventListener('resize', this.scheduleAll);
		ScrollTrigger.addEventListener('refresh', this.measureAll);
		document.fonts?.ready.then(() => !this.disposed && this.scheduleAll());
	}

	acquire(el: HTMLElement, space: 'page' | 'fixed'): RegionRef {
		let e = this.entries.find((x) => x.el === el && x.space === space);
		if (!e) {
			const viewport = el === document.body || el === document.documentElement;
			e = {
				el,
				space,
				w: 0,
				h: 0,
				left: 0,
				top: 0,
				viewport,
				pin: null,
				refs: 0,
				listeners: new Set()
			};
			this.entries.push(e);
			this.measure(e, false);
			if (!viewport) this.ro.observe(el);
		}
		e.refs++;
		return e;
	}

	release(ref: RegionRef): void {
		const e = ref as Entry;
		if (--e.refs > 0) return;
		this.entries = this.entries.filter((x) => x !== e);
		if (!this.entries.some((x) => x.el === e.el)) this.ro.unobserve(e.el);
		e.listeners.clear();
	}

	/** Fires (after measuring) when the region's size changes. */
	onResize(ref: RegionRef, fn: () => void): () => void {
		const e = ref as Entry;
		e.listeners.add(fn);
		return () => e.listeners.delete(fn);
	}

	/** Viewport rect of the region for the current frame, CSS px. Allocation-free. */
	rect(ref: RegionRef, scrollY: number, out: RectPx): RectPx {
		const e = ref as Entry;
		if (e.viewport) {
			const v = this.viewport();
			out.x = 0;
			out.y = 0;
			out.w = v.w;
			out.h = v.h;
		} else if (e.space === 'fixed') {
			out.x = e.left;
			out.y = e.top;
			out.w = e.w;
			out.h = e.h;
		} else {
			out.x = e.left;
			out.y = e.top - scrollY + pinShift(e, scrollY);
			out.w = e.w;
			out.h = e.h;
		}
		return out;
	}

	/** Re-measures everything (ScrollTrigger refresh: pins and layout above may have moved). */
	measureAll = (): void => {
		for (const e of this.entries) this.measure(e, true);
	};

	private scheduleAll = (): void => {
		cancelAnimationFrame(this.raf);
		this.raf = requestAnimationFrame(this.measureAll);
	};

	private measure(e: Entry, notify: boolean): void {
		let w: number;
		let h: number;
		if (e.viewport) {
			const v = this.viewport();
			w = v.w;
			h = v.h;
		} else {
			const r = e.el.getBoundingClientRect();
			w = r.width;
			h = r.height;
			if (e.space === 'fixed') {
				e.left = r.left;
				e.top = r.top;
			} else {
				const sy = window.scrollY;
				e.pin = ScrollTrigger.getAll().find((st) => !!st.pin && st.pin.contains(e.el)) ?? null;
				e.left = r.left + window.scrollX;
				e.top = r.top + sy - pinShift(e, sy);
			}
		}
		const changed = Math.abs(w - e.w) > 0.5 || Math.abs(h - e.h) > 0.5;
		e.w = w;
		e.h = h;
		if (changed && notify) for (const fn of e.listeners) fn();
	}

	dispose(): void {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		window.removeEventListener('resize', this.scheduleAll);
		ScrollTrigger.removeEventListener('refresh', this.measureAll);
		this.entries = [];
	}
}
