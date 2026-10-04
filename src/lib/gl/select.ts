// RTS selection (§S3 "Drag"): drag selects (count read back from the GPU), the next click is a
// move order, the click after that (or Esc) deselects. Selecting 500+ unlocks Crowd Control.
import type { Crowd } from './types';
import { stats } from '#lib/core/stats.svelte';
import { unlock } from '#lib/stores/achievements.svelte';

export const CROWD_CONTROL_MIN = 500;

export interface Selection {
	readonly count: number;
	/** Selects every entity inside `rectPx` (viewport px). Resolves with the measured count. */
	select(rectPx: DOMRectReadOnly): Promise<number>;
	clear(): void;
	/** A click on empty space: returns true when it was consumed as a move order. */
	click(xPx: number, yPx: number): boolean;
}

export function createSelection(crowd: Crowd): Selection {
	let count = 0;
	let ordered = false;
	let token = 0;

	const publish = (n: number) => {
		count = n;
		if (stats.selected !== n) stats.selected = n;
	};

	return {
		get count() {
			return count;
		},
		async select(rectPx) {
			const mine = ++token;
			ordered = false;
			const n = await crowd.select(rectPx);
			if (mine !== token) return n;
			publish(n);
			if (n >= CROWD_CONTROL_MIN) unlock('crowd-control');
			return n;
		},
		clear() {
			token++;
			ordered = false;
			if (count === 0) return;
			void crowd.select(null);
			publish(0);
		},
		click(x, y) {
			if (count === 0) return false;
			if (!ordered) {
				crowd.command(x, y);
				ordered = true;
				return true;
			}
			this.clear();
			return false;
		}
	};
}
