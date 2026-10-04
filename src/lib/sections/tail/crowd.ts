// Engine access for S-tail. The public `Crowd` contract (gl/types.ts) lacks `sendWave` and
// `onRelease`; the engine hands out the concrete class, so its *type* is imported here (type-only:
// erased at build time, no three.js in the section chunk).
import type { Crowd } from '#lib/gl/crowd/Crowd';
import type { Engine } from '#lib/gl/types';
import { whenEngine } from '#lib/gl/handle';
import { refreshColliders } from '#lib/core/colliders';
import { scroll } from '#lib/core/scroll.svelte';
import { PRIORITY, onFrame } from '#lib/core/ticker';

export type TailCrowd = Crowd;

export interface TailEngine {
	engine: Engine;
	crowd: TailCrowd;
}

/** Resolves with the engine and its concrete crowd, or `null` for the static build. */
export async function tailEngine(): Promise<TailEngine | null> {
	const engine = await whenEngine();
	return engine ? { engine, crowd: engine.crowd as TailCrowd } : null;
}

let heightWatchers = 0;
let offHeight: (() => void) | null = null;

/**
 * Safety net for the bottom of the page: engine regions and DOM colliders are cached in page
 * space and re-measured on resize / ScrollTrigger refresh only. If content above changes height
 * without a refresh, these sections' formations would draw offset. When the scroll limit (page
 * height) changes, re-measure both once things settle. Refcounted; returns a cleanup.
 */
export function trackPageHeight(crowd: TailCrowd): () => void {
	heightWatchers++;
	if (!offHeight) {
		let last = scroll.limit;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const stopFrame = onFrame(() => {
			if (scroll.limit === last) return;
			last = scroll.limit;
			clearTimeout(timer);
			timer = setTimeout(() => {
				crowd.regions.measureAll();
				refreshColliders();
			}, 160);
		}, PRIORITY.ui);
		offHeight = () => {
			stopFrame();
			clearTimeout(timer);
		};
	}
	let done = false;
	return () => {
		if (done) return;
		done = true;
		if (--heightWatchers === 0) {
			offHeight?.();
			offHeight = null;
		}
	};
}

/**
 * Calls `fn` (debounced) when any of `els` resizes, when the window resizes and once fonts have
 * loaded: for geometry measured relative to a region (page shifts above do not change it).
 */
export function watchLayout(els: Element[], fn: () => void, delay = 180): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let alive = true;
	const schedule = () => {
		clearTimeout(timer);
		timer = setTimeout(() => alive && fn(), delay);
	};
	const ro = new ResizeObserver(schedule);
	for (const el of els) ro.observe(el);
	document.fonts?.ready.then(() => alive && schedule());
	window.addEventListener('resize', schedule);
	return () => {
		alive = false;
		clearTimeout(timer);
		ro.disconnect();
		window.removeEventListener('resize', schedule);
	};
}
