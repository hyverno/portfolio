// The one frame loop (§3.4): every per-frame callback in the site runs here, in priority order,
// driven by gsap.ticker so tweens, scroll and the sim share a single rAF.
import { gsap } from 'gsap';
import { getEngine } from '#lib/gl/handle';
import { resetSamples, sampleFrame } from './stats.svelte';

/** `time` and `dt` in seconds. */
export type FrameFn = (time: number, dt: number) => void;

export const PRIORITY = { scroll: 0, input: 5, sim: 10, render: 20, ui: 30 } as const;

interface Entry {
	fn: FrameFn;
	priority: number;
	seq: number;
}

/** A hidden tab or a long stall must not explode the simulation. */
const MAX_DT = 0.1;

let entries: Entry[] = [];
let seq = 0;
let started = false;
let paused = false;
let lastTime = -1;
const failed = new WeakSet<FrameFn>();

/** Registers a per-frame callback. Lower priority runs first; equal priorities run in insertion order. */
export function onFrame(fn: FrameFn, priority: number = PRIORITY.ui): () => void {
	const entry: Entry = { fn, priority, seq: seq++ };
	// Copy-on-write: a callback may (un)subscribe while the frame is iterating.
	entries = [...entries, entry].sort((a, b) => a.priority - b.priority || a.seq - b.seq);
	return () => {
		entries = entries.filter((e) => e !== entry);
	};
}

function runFrame(time: number, deltaMs: number) {
	const dt = lastTime < 0 ? 1 / 60 : Math.min(MAX_DT, Math.max(0, time - lastTime));
	lastTime = time;
	const t0 = performance.now();
	const list = entries;
	for (let i = 0; i < list.length; i++) {
		const { fn, priority } = list[i];
		// While paused only the scroll bucket runs, so smooth scrolling never freezes.
		if (paused && priority > PRIORITY.scroll) break;
		try {
			fn(time, dt);
		} catch (err) {
			// Report once per callback instead of 60 times a second.
			if (!failed.has(fn)) {
				failed.add(fn);
				console.error('[ticker] frame callback failed', err);
			}
		}
	}
	if (!paused && deltaMs < 250) sampleFrame(deltaMs, performance.now() - t0);
}

function onVisibility() {
	setPaused(document.hidden);
}

/** Starts the loop. Idempotent; client only. */
export function startTicker(): void {
	if (started || typeof window === 'undefined') return;
	started = true;
	gsap.ticker.lagSmoothing(0);
	gsap.ticker.add(runFrame);
	document.addEventListener('visibilitychange', onVisibility);
}

/** Pauses every frame callback above the scroll bucket, and the engine. GSAP tweens keep running. */
export function setPaused(p: boolean): void {
	if (p === paused) return;
	paused = p;
	if (!p) {
		lastTime = -1;
		resetSamples();
	}
	getEngine()?.pause(p);
}
