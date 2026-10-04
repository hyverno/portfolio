// Follows an element's viewport rect without measuring every frame (§7: no getBoundingClientRect
// in the loop). The rect is measured once, shifted by the scroll delta while scrolling, then
// re-measured when the scroll settles, on resize and when the element itself resizes.
import { scroll } from '#lib/core/scroll.svelte';
import { PRIORITY, onFrame } from '#lib/core/ticker';

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Tracker {
	/** Re-measures now (e.g. after an inner scroll container moved the element). */
	measure(): void;
	stop(): void;
}

const SETTLE_MS = 140;

/** True when the element (or an ancestor) is fixed or sticky, so it does not move with the page. */
function pinned(el: HTMLElement): boolean {
	for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
		const p = getComputedStyle(n).position;
		if (p === 'fixed' || p === 'sticky') return true;
	}
	return false;
}

export function expand(b: Box, pad: number): Box {
	return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

export function trackRect(el: HTMLElement, cb: (box: Box) => void): Tracker {
	let base: Box = { x: 0, y: 0, w: 0, h: 0 };
	let baseY = 0;
	let fixed = false;
	let lastY = Number.NaN;
	let settle: ReturnType<typeof setTimeout> | undefined;

	const emit = () => {
		const shift = fixed ? 0 : scroll.y - baseY;
		cb({ x: base.x, y: base.y - shift, w: base.w, h: base.h });
	};

	const measure = () => {
		if (!el.isConnected) return;
		const r = el.getBoundingClientRect();
		base = { x: r.left, y: r.top, w: r.width, h: r.height };
		baseY = scroll.y;
		fixed = pinned(el);
		lastY = scroll.y;
		emit();
	};

	const offFrame = onFrame(() => {
		if (scroll.y === lastY) return;
		lastY = scroll.y;
		emit();
		clearTimeout(settle);
		settle = setTimeout(measure, SETTLE_MS);
	}, PRIORITY.ui);

	const ro = new ResizeObserver(measure);
	ro.observe(el);
	window.addEventListener('resize', measure);
	measure();

	return {
		measure,
		stop() {
			offFrame();
			clearTimeout(settle);
			ro.disconnect();
			window.removeEventListener('resize', measure);
		}
	};
}
