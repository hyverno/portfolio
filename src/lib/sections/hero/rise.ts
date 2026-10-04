// Entrance for the hero copy: lines wait under their masks until `play()`, then rise (720ms
// `steer`, stagger .09, §3.3). Under reduced motion the copy fades in (200ms) instead.
//
// Elements attach and detach freely (the copy is re-created on a language switch): one attached
// after `play()` simply appears in place. Re-splits (resize, late font load) keep the playhead.
import type { ActionReturn } from 'svelte/action';
import { DUR, EASE, STAGGER, SplitText, gsap, registerMotion } from '#lib/core/motion';

interface Item {
	el: HTMLElement;
	split: SplitText | null;
	tl: gsap.core.Timeline | null;
	fade: gsap.core.Tween | null;
}

export class Rise {
	private items = new Set<Item>();
	private played = false;
	private pending: gsap.core.Tween | null = null;

	constructor(private reduced: () => boolean) {}

	get isPlayed(): boolean {
		return this.played;
	}

	/** Svelte action: `use:rise.attach`. Hidden (but in the a11y tree) until played. */
	attach = (el: HTMLElement): ActionReturn => {
		registerMotion();
		const item: Item = { el, split: null, tl: null, fade: null };
		this.items.add(item);

		if (this.reduced()) {
			el.style.visibility = 'visible';
			if (!this.played) gsap.set(el, { opacity: 0 });
		} else {
			item.split = SplitText.create(el, {
				type: 'lines',
				mask: 'lines',
				// Spans keep the paragraph valid; SplitText leaves them inline, so the host's CSS must
				// make `.rise-line` and its `.rise-line-mask` clone block, or neither clip nor transform works.
				tag: 'span',
				linesClass: 'rise-line',
				// aria-label is not allowed on a paragraph: keep the text itself readable instead.
				aria: 'none',
				autoSplit: true,
				onSplit: (s: SplitText) => {
					const tl = gsap.timeline({ paused: true });
					tl.fromTo(
						s.lines,
						{ yPercent: 110 },
						{ yPercent: 0, duration: DUR.reveal, ease: EASE.steer, stagger: STAGGER.lines }
					);
					item.tl = tl;
					// Masked lines are hidden by their offset: the block itself can show now.
					el.style.visibility = 'visible';
					if (this.played) tl.play();
					return tl;
				}
			});
			// Copy re-created after the entrance (language switch): just be there.
			if (this.played) item.tl?.progress(1);
		}

		return {
			destroy: () => {
				this.items.delete(item);
				item.fade?.kill();
				item.split?.revert();
				item.tl?.kill();
				gsap.set(el, { clearProps: 'opacity' });
			}
		};
	};

	/** Starts the entrance after `delay` seconds. Idempotent. */
	play(delay = 0): void {
		if (this.played || this.pending) return;
		this.pending = gsap.delayedCall(delay, () => {
			this.pending = null;
			this.played = true;
			for (const item of this.items) {
				if (item.tl) item.tl.play();
				else
					item.fade = gsap.to(item.el, { opacity: 1, duration: 0.2, ease: 'none' });
			}
		});
	}

	/** Shows everything at once (no entrance: the visitor is already past the hero). */
	finish(): void {
		this.pending?.kill();
		this.pending = null;
		this.played = true;
		for (const item of this.items) {
			if (item.tl) item.tl.progress(1);
			else gsap.set(item.el, { opacity: 1 });
		}
	}

	dispose(): void {
		this.pending?.kill();
		this.pending = null;
	}
}
