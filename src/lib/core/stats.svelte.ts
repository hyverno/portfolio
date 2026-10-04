// Measured frame stats for the HUD, published at 4 Hz, plus the governor trigger (§7).
import { boot } from './boot.svelte';

export const stats = $state({
	fps: 60,
	/** Main-thread work per frame (all ticker callbacks), ms. */
	frameMs: 0,
	simMs: 0,
	renderMs: 0,
	entities: 0,
	drawCalls: 0,
	numbersDrawn: 0,
	onScreen: 0,
	selected: 0,
	quality: 'AUTO' as 'AUTO' | 'LOW' | 'MED' | 'HIGH',
	governorNote: ''
});

/** Section context line for the HUD (written by `use:hudLine`). */
export const hud = $state({ section: '', label: '', line: '' });

const WINDOW = 60;
const PUBLISH_MS = 250;
const GOVERNOR_MS = 20;
/** Frames are ignored until boot has settled for this long (shader compiles, bakes). */
const WARMUP_MS = 2500;
const COOLDOWN_MS = 2000;

const intervals = new Float32Array(WINDOW);
const work = new Float32Array(WINDOW);
let head = 0;
let count = 0;
let sumInterval = 0;
let sumWork = 0;
let lastPublish = 0;
let armedAt = 0;
let lastGovernor = 0;
const governors = new Set<(avgMs: number) => void>();

/** Clears the window, e.g. after the tab was hidden. */
export function resetSamples(): void {
	head = count = 0;
	sumInterval = sumWork = 0;
	intervals.fill(0);
	work.fill(0);
}

/**
 * Feeds one frame. `ms` is the frame interval (drives FPS and the governor); `workMs` is the
 * main-thread time spent in the frame. The ticker calls this every frame: other modules should
 * only write the counters (`simMs`, `renderMs`, `entities`, `drawCalls`, ...), not sample frames.
 */
export function sampleFrame(ms: number, workMs = 0): void {
	sumInterval += ms - intervals[head];
	sumWork += workMs - work[head];
	intervals[head] = ms;
	work[head] = workMs;
	head = (head + 1) % WINDOW;
	if (count < WINDOW) count++;

	const now = performance.now();
	const avg = sumInterval / count;
	if (now - lastPublish >= PUBLISH_MS) {
		lastPublish = now;
		stats.fps = avg > 0 ? Math.min(240, Math.round(1000 / avg)) : 0;
		stats.frameMs = Math.round((sumWork / count) * 10) / 10;
	}

	if (!boot.done) return;
	if (!armedAt) armedAt = now;
	if (
		count === WINDOW &&
		avg > GOVERNOR_MS &&
		now - armedAt > WARMUP_MS &&
		now - lastGovernor > COOLDOWN_MS &&
		governors.size
	) {
		lastGovernor = now;
		for (const fn of governors) fn(avg);
		// The next step needs a fresh window of evidence.
		resetSamples();
	}
}

/** Called (at most every 2s, with a full fresh 60-frame window) while the average frame exceeds 20ms. */
export function onGovernor(fn: (avgMs: number) => void): () => void {
	governors.add(fn);
	return () => governors.delete(fn);
}
