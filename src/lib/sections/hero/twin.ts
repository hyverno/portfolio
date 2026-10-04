// The DOM twin <h1> (§S1 "Glyph source"). CSS sizes it from the same ink ratios as the boxes the
// crowd forms in (font-size = box width / ink width in em), so it needs no JS to sit right. What
// CSS cannot know is where this browser puts the baseline for this font: that is measured here
// once on mount, again on `document.fonts.ready` and on resize — never per frame.
//
// Static build (no WebGL), desktop: `scrub(p)` runs the width march on the DOM name instead,
// font-stretch 125% → 62% while the font size grows so the ink keeps its width (the word grows
// taller as it narrows, like the crowd). Advances per width are measured once, then interpolated.
import { INK } from './formations';

const WDTHS = [62, 70, 80, 90, 100, 112.5, 125];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class Twin {
	/** Word advance in em at each of WDTHS (measured lazily). */
	private advances: number[] | null = null;
	/** Ink width of the wide box, CSS px. */
	private inkW = 0;
	private scrubbing = false;

	constructor(
		private h1: HTMLElement,
		private word: HTMLElement,
		private probe: HTMLElement,
		private wideBox: HTMLElement
	) {}

	/** Baseline offset of the line-height:1 twin as a fraction of its font size (CSS `--k`). */
	measure(): void {
		this.inkW = this.wideBox.offsetWidth;
		this.advances = null;
		const F = parseFloat(getComputedStyle(this.h1).fontSize);
		if (!(F > 0)) return;
		const k = (this.probe.getBoundingClientRect().top - this.h1.getBoundingClientRect().top) / F;
		if (k > 0.5 && k < 1.3) this.h1.style.setProperty('--k', k.toFixed(4));
	}

	/** Static-build width march, p = pin progress 0..1. */
	scrub(p: number): void {
		const t = 1 - clamp01(p);
		if (t >= 1 && !this.scrubbing) return;
		this.scrubbing = t < 1;
		const wdth = lerp(INK.tall.wdth, INK.wide.wdth, t);
		const inkPerAdvance = lerp(INK.tall.w / INK.tall.advance, INK.wide.w / INK.wide.advance, t);
		const size = (this.inkW || this.wideBox.offsetWidth) / (this.advanceAt(wdth) * inkPerAdvance);
		const s = this.h1.style;
		s.setProperty('--wdth', wdth.toFixed(2));
		s.setProperty('--F', `${size.toFixed(2)}px`);
		s.setProperty('--lsb', lerp(INK.tall.lsb, INK.wide.lsb, t).toFixed(4));
	}

	/** Back to the stylesheet's sizing (mode change, engine came up). */
	reset(): void {
		this.scrubbing = false;
		for (const k of ['--wdth', '--F', '--lsb']) this.h1.style.removeProperty(k);
	}

	private advanceAt(wdth: number): number {
		if (!this.advances) {
			const s = document.createElement('span');
			s.textContent = this.word.textContent;
			s.setAttribute('aria-hidden', 'true');
			s.style.cssText =
				'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font-size:100px;letter-spacing:0;line-height:1';
			this.h1.appendChild(s);
			this.advances = WDTHS.map((w) => {
				s.style.fontStretch = `${w}%`;
				return s.getBoundingClientRect().width / 100;
			});
			s.remove();
		}
		const a = this.advances;
		if (wdth <= WDTHS[0]) return a[0];
		for (let i = 1; i < WDTHS.length; i++) {
			if (wdth <= WDTHS[i]) {
				const f = (wdth - WDTHS[i - 1]) / (WDTHS[i] - WDTHS[i - 1]);
				return lerp(a[i - 1], a[i], f);
			}
		}
		return a[a.length - 1];
	}
}
