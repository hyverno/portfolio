// README stats row (§5): five counters tick up on enter, `steps(8)` over 1.2s, stagger .09.
// The server renders the final values (no JS, SEO, screen readers); on the client a counter
// waits at 0 until the row enters, then ticks. Counters re-created after the row has played
// (language switch) simply show their value.
import type { ActionReturn } from 'svelte/action';
import { tickTo } from '#lib/core/motion';
import type { HeroStat } from '#lib/content/types';

const STEPS = 8;
const DURATION = 1.2;
const STAGGER = 0.09;

/**
 * A multiplier is a ratio, not a quantity: `6000×` is never grouped. Everything else follows
 * the language (`2,000` / `2 000`).
 */
export function formatStat(s: HeroStat, v: number, group: (n: number) => string): string {
	const n = Math.round(v);
	return s.suffix === '×' ? String(n) : group(n);
}

interface Counter {
	el: HTMLElement;
	index: number;
	to: number;
	format: (v: number) => string;
	tween: gsap.core.Tween | null;
}

export class Counters {
	private items = new Set<Counter>();
	private played = false;

	/** `use:counters.counter={{ index, to, format }}` on the element holding the number. */
	counter = (
		el: HTMLElement,
		o: { index: number; to: number; format: (v: number) => string }
	): ActionReturn => {
		const c: Counter = { el, ...o, tween: null };
		this.items.add(c);
		if (!this.played) el.textContent = o.format(0);
		return {
			destroy: () => {
				c.tween?.kill();
				this.items.delete(c);
			}
		};
	};

	play(): void {
		if (this.played) return;
		this.played = true;
		for (const c of this.items) {
			c.tween = tickTo(c.el, c.to, {
				from: 0,
				steps: STEPS,
				duration: DURATION,
				format: c.format
			}).delay(c.index * STAGGER);
		}
	}

	dispose(): void {
		for (const c of this.items) c.tween?.kill();
	}
}
