// README statement (§5 "02 · README"): SplitText lines rise out of their masks as the statement
// scrolls through (scrub 1, `top 75%` → `bottom 45%`), and each line, as it surfaces, borrows a
// cluster of the flock: attractor k % 4 fills that line's box for 900ms, then lets go. The dots
// swarm in, the line materialises under them, the cluster drifts back to the flock.
//
// Desktop scrubs; touch / narrow screens play on enter and reverse on the way back up; reduced
// motion is a 200ms fade with no swarm. Line boxes are measured on split and on ScrollTrigger
// refresh (page space), never per frame.
import type { ActionReturn } from 'svelte/action';
import { device } from '#lib/core/device.svelte';
import { DUR, EASE, STAGGER, ScrollTrigger, SplitText, gsap, mm } from '#lib/core/motion';
import { scroll } from '#lib/core/scroll.svelte';
import { getEngine } from '#lib/gl/handle';

type Slot = 0 | 1 | 2 | 3;

const START = 'top 75%';
const END = 'bottom 45%';
/** Scrub: each line rises over 1 unit, the next one starts .55 later (they overlap). */
const STEP = 0.55;
const HOLD_S = 0.9;

interface LineBox {
	x: number;
	/** Page space. */
	y: number;
	w: number;
	h: number;
}

/** Text extent of one split line (the mask is full width; the swarm should hug the words). */
function lineBox(line: Element, mask: Element): LineBox {
	const m = mask.getBoundingClientRect();
	const range = document.createRange();
	range.selectNodeContents(line);
	const r = range.getBoundingClientRect();
	const x = r.width > 0 ? r.left : m.left;
	const w = r.width > 0 ? r.width : m.width;
	return { x, y: m.top + window.scrollY, w, h: m.height };
}

function run(el: HTMLElement, mode: 'scrub' | 'play' | 'fade'): () => void {
	if (mode === 'fade') {
		const tween = gsap.fromTo(
			el,
			{ autoAlpha: 0 },
			{
				autoAlpha: 1,
				duration: 0.2,
				ease: 'none',
				scrollTrigger: { trigger: el, start: START, toggleActions: 'play none none reverse' }
			}
		);
		return () => {
			tween.scrollTrigger?.kill();
			tween.revert();
		};
	}

	let boxes: LineBox[] = [];
	let lines: Element[] = [];
	let masks: Element[] = [];
	const timers: (gsap.core.Tween | null)[] = [null, null, null, null];
	const used = new Set<Slot>();

	const measure = () => {
		boxes = lines.map((l, k) => lineBox(l, masks[k] ?? l));
	};

	const swarm = (k: number) => {
		const crowd = getEngine()?.crowd;
		const b = boxes[k];
		if (!crowd || !b || device.reducedMotion) return;
		const slot = (k % 4) as Slot;
		used.add(slot);
		crowd.attract(slot, new DOMRect(b.x, b.y - scroll.y, b.w, b.h), { mode: 'fill' });
		timers[slot]?.kill();
		timers[slot] = gsap.delayedCall(HOLD_S, () => {
			timers[slot] = null;
			crowd.attract(slot, null);
		});
	};

	const split = SplitText.create(el, {
		type: 'lines',
		mask: 'lines',
		autoSplit: true,
		onSplit: (s: SplitText) => {
			lines = s.lines;
			masks = s.masks;
			measure();
			if (mode === 'scrub') {
				const tl = gsap.timeline({
					scrollTrigger: { trigger: el, start: START, end: END, scrub: 1 }
				});
				lines.forEach((line, k) => {
					tl.fromTo(line, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: EASE.steer }, k * STEP);
					// Fires as the playhead crosses it; only a line surfacing (scrolling down) swarms.
					tl.call(() => (tl.scrollTrigger?.direction ?? 1) > 0 && swarm(k), undefined, k * STEP + 0.3);
				});
				return tl;
			}
			const tl = gsap.timeline({
				scrollTrigger: { trigger: el, start: START, toggleActions: 'play none none reverse' }
			});
			tl.fromTo(
				lines,
				{ yPercent: 110 },
				{ yPercent: 0, duration: DUR.reveal, ease: EASE.steer, stagger: STAGGER.lines }
			);
			lines.forEach((_, k) => tl.call(() => !tl.reversed() && swarm(k), undefined, k * STAGGER.lines + 0.12));
			return tl;
		}
	});
	ScrollTrigger.addEventListener('refresh', measure);

	return () => {
		ScrollTrigger.removeEventListener('refresh', measure);
		split.revert();
		const crowd = getEngine()?.crowd;
		for (const slot of used) {
			timers[slot]?.kill();
			crowd?.attract(slot, null);
		}
	};
}

/** `use:statement`: re-runs with the motion context (desktop scrub / touch play / reduced fade). */
export function statement(el: HTMLElement): ActionReturn {
	const off = mm(({ reduced, desktop, coarse }) =>
		run(el, reduced ? 'fade' : desktop && !coarse ? 'scrub' : 'play')
	);
	return { destroy: off };
}
