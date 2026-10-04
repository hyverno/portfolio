// Scroll (§3.4): Lenis on fine pointers without reduced motion, native scroll otherwise.
// The position is read exactly once per frame, in the scroll bucket, before anything else runs.
import Lenis from 'lenis';
import { ScrollTrigger, registerMotion } from './motion';
import { PRIORITY, onFrame } from './ticker';
import { device, onReducedMotionChange } from './device.svelte';

export const scroll = $state({
	/** Document scroll position in px. */
	y: 0,
	/** Change since the previous frame, px. */
	delta: 0,
	/** px / s. */
	velocity: 0,
	/** Maximum scroll, px. */
	limit: 0,
	/** True while Lenis drives the scroll. */
	smooth: false
});

let lenis: Lenis | null = null;
let nativeLimit = 0;
let stopped = false;

function measureNativeLimit() {
	nativeLimit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function wantsSmooth() {
	return device.finePointer && !device.reducedMotion;
}

function createLenis() {
	if (lenis) return;
	lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.9, autoRaf: false });
	lenis.on('scroll', ScrollTrigger.update);
	if (stopped) lenis.stop();
	scroll.smooth = true;
}

function destroyLenis() {
	if (!lenis) return;
	lenis.destroy();
	lenis = null;
	scroll.smooth = false;
}

function frame(time: number, dt: number) {
	lenis?.raf(time * 1000);
	const y = lenis ? lenis.scroll : window.scrollY;
	const delta = y - scroll.y;
	// Skip no-op writes so idle frames do not wake every reader of `scroll`.
	if (delta !== 0 || scroll.delta !== 0) {
		scroll.delta = delta;
		scroll.y = y;
		scroll.velocity = dt > 0 ? delta / dt : 0;
	}
	const limit = lenis ? lenis.limit : nativeLimit;
	if (limit !== scroll.limit) scroll.limit = limit;
}

/** Starts scroll handling. Idempotent per call pair; returns a cleanup. Client only. */
export function initScroll(): () => void {
	if (typeof window === 'undefined') return () => {};
	registerMotion();

	scroll.y = window.scrollY;
	measureNativeLimit();
	if (wantsSmooth()) createLenis();

	const offFrame = onFrame(frame, PRIORITY.scroll);
	const offMotion = onReducedMotionChange(() => (wantsSmooth() ? createLenis() : destroyLenis()));
	const ro = new ResizeObserver(measureNativeLimit);
	ro.observe(document.body);
	ScrollTrigger.addEventListener('refresh', measureNativeLimit);

	let alive = true;
	document.fonts?.ready.then(() => alive && ScrollTrigger.refresh());

	return () => {
		alive = false;
		offFrame();
		offMotion();
		ro.disconnect();
		ScrollTrigger.removeEventListener('refresh', measureNativeLimit);
		destroyLenis();
	};
}

function resolveTarget(target: number | string | HTMLElement): number | HTMLElement | null {
	if (typeof target === 'number' || target instanceof HTMLElement) return target;
	const byId = document.getElementById(target.replace(/^#/, ''));
	if (byId) return byId;
	try {
		return document.querySelector<HTMLElement>(target);
	} catch {
		return null;
	}
}

/** Scrolls to a y position, an element, an id (with or without '#') or a selector. */
export function scrollTo(
	target: number | string | HTMLElement,
	o: { duration?: number; offset?: number; immediate?: boolean } = {}
): void {
	if (typeof window === 'undefined') return;
	const resolved = resolveTarget(target);
	if (resolved == null) return;
	const immediate = o.immediate || device.reducedMotion;
	if (lenis) {
		lenis.scrollTo(resolved, { offset: o.offset ?? 0, duration: o.duration, immediate, force: true });
		return;
	}
	const y =
		typeof resolved === 'number'
			? resolved
			: resolved.getBoundingClientRect().top + window.scrollY;
	window.scrollTo({ top: y + (o.offset ?? 0), behavior: immediate ? 'instant' : 'smooth' });
}

/** Locks scrolling (modal, preloader). */
export function stopScroll(): void {
	stopped = true;
	if (lenis) lenis.stop();
	else if (typeof document !== 'undefined') document.documentElement.style.overflow = 'hidden';
}

export function startScroll(): void {
	stopped = false;
	if (lenis) lenis.start();
	if (typeof document !== 'undefined') document.documentElement.style.removeProperty('overflow');
}

/** Id of the section crossing the middle of the viewport ('' if none). Not for per-frame use. */
export function currentSectionId(): string {
	if (typeof document === 'undefined') return '';
	const mid = window.innerHeight / 2;
	let fallback = '';
	for (const el of document.querySelectorAll<HTMLElement>('[data-section]')) {
		const r = el.getBoundingClientRect();
		const id = el.id || el.dataset.section || '';
		if (r.top <= mid && r.bottom > mid) return id;
		if (r.top <= mid) fallback = id;
	}
	return fallback;
}
