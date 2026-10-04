// Viewport rects of the Ludogram stages without measuring in the frame loop (§7). Rects are
// measured on resize and ScrollTrigger refresh, cached in un-pinned page space, and turned into
// viewport rects per frame with arithmetic: the same pin-aware model as the crowd's regions, so
// labels, scanlines and pings land exactly on the formations.
import { ScrollTrigger } from '#lib/core/motion';

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Entry {
	left: number;
	top: number;
	w: number;
	h: number;
}

export class RectCache {
	/** The pin that holds every tracked element while it is active (null when unpinned). */
	pin: ScrollTrigger | null = null;
	private entries = new Map<HTMLElement, Entry>();
	private ro: ResizeObserver;
	private raf = 0;

	constructor() {
		this.ro = new ResizeObserver(() => this.schedule());
		ScrollTrigger.addEventListener('refresh', this.measureAll);
		window.addEventListener('resize', this.schedule);
	}

	track(el: HTMLElement): void {
		if (this.entries.has(el)) return;
		const e: Entry = { left: 0, top: 0, w: 0, h: 0 };
		this.entries.set(el, e);
		this.measure(el, e);
		this.ro.observe(el);
	}

	private shift(y: number): number {
		const st = this.pin;
		if (!st) return 0;
		return Math.min(Math.max(y - st.start, 0), Math.max(0, st.end - st.start));
	}

	private measure(el: HTMLElement, e: Entry): void {
		const r = el.getBoundingClientRect();
		const sy = window.scrollY;
		e.left = r.left;
		e.top = r.top + sy - this.shift(sy);
		e.w = r.width;
		e.h = r.height;
	}

	measureAll = (): void => {
		for (const [el, e] of this.entries) this.measure(el, e);
	};

	private schedule = (): void => {
		cancelAnimationFrame(this.raf);
		this.raf = requestAnimationFrame(this.measureAll);
	};

	/** Viewport rect of `el` at scroll position `y` (CSS px). Allocation-free with `out`. */
	get(el: HTMLElement, y: number, out: Box): Box {
		const e = this.entries.get(el);
		if (!e) {
			out.x = out.y = out.w = out.h = 0;
			return out;
		}
		out.x = e.left;
		out.y = e.top - y + this.shift(y);
		out.w = e.w;
		out.h = e.h;
		return out;
	}

	dispose(): void {
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		ScrollTrigger.removeEventListener('refresh', this.measureAll);
		window.removeEventListener('resize', this.schedule);
		this.entries.clear();
	}
}
