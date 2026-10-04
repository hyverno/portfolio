// Frame driver for the Lab cells: one subscription to the shared ticker per running cell (never
// an own rAF). Rate 2 cells step on alternate frames, staggered by `phase` so two half-rate cells
// never land on the same frame; the skipped frame's dt is carried, so motion speed is unchanged.
import { PRIORITY, onFrame } from '#lib/core/ticker';
import type { Rate } from './types';

/** After the WebGL render, before the HUD. */
const PRIORITY_CELLS = PRIORITY.render + 1;
/** A long stall (tab switch, GC) must not explode a simulation. */
const MAX_STEP = 1 / 20;

let frame = 0;
let offCounter: (() => void) | null = null;
let users = 0;

function retainCounter() {
	if (users++ === 0) offCounter = onFrame(() => void frame++, PRIORITY.input);
}

function releaseCounter() {
	if (--users > 0) return;
	offCounter?.();
	offCounter = null;
}

export interface Loop {
	start(): void;
	stop(): void;
	setRate(r: Rate): void;
	readonly running: boolean;
	readonly rate: Rate;
}

let nextPhase = 0;

/** `step(time, dt)` runs while started: every frame at rate 1, every other frame at rate 2. */
export function createLoop(step: (time: number, dt: number) => void): Loop {
	const phase = nextPhase++ & 1;
	let off: (() => void) | null = null;
	let rate: Rate = 2;
	let carry = 0;

	return {
		start() {
			if (off) return;
			carry = 0;
			retainCounter();
			off = onFrame((time, dt) => {
				carry += dt;
				if (rate === 2 && (frame & 1) !== phase) return;
				const d = Math.min(carry, MAX_STEP);
				carry = 0;
				step(time, d);
			}, PRIORITY_CELLS);
		},
		stop() {
			if (!off) return;
			off();
			off = null;
			releaseCounter();
		},
		setRate(r) {
			rate = r;
		},
		get running() {
			return off !== null;
		},
		get rate() {
			return rate;
		}
	};
}

/**
 * Same gating for GL views, whose `update` the engine calls (the view itself renders every frame).
 * `maxStep` caps one step (spawners pass a larger cap so a slow frame does not drop output).
 */
export function createGate(maxStep = MAX_STEP): { pass(dt: number): number; setRate(r: Rate): void } {
	const phase = nextPhase++ & 1;
	let rate: Rate = 2;
	let carry = 0;
	let n = 0;
	return {
		/** Returns the dt to advance by this frame (0 = skip). */
		pass(dt) {
			carry += dt;
			n++;
			if (rate === 2 && (n & 1) !== phase) return 0;
			const d = Math.min(carry, maxStep);
			carry = 0;
			return d;
		},
		setRate(r) {
			rate = r;
		}
	};
}
