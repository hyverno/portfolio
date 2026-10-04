// Motion language (§3): plugin registration, named eases, durations, staggers and the shared
// reveal / counter / decode helpers. Import GSAP from here so registration is never forgotten.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { EasePack, RoughEase } from 'gsap/EasePack';
import { device, motionOverride, onReducedMotionChange } from './device.svelte';

export { gsap, ScrollTrigger, SplitText, Flip, CustomEase };

export const EASE = {
	steer: 'steer',
	arrive: 'arrive',
	spawn: 'spawn',
	despawn: 'despawn',
	snap: 'snap',
	glitch: 'glitch'
} as const;

export const DUR = { ack: 0.06, micro: 0.12, fast: 0.24, base: 0.48, reveal: 0.72, morph: 1.4, page: 0.5 } as const;

export const STAGGER = { chars: 0.014, words: 0.035, lines: 0.09, rows: 0.06, cells: 0.06 } as const;

const CURVES: Record<Exclude<keyof typeof EASE, 'glitch'>, string> = {
	steer: 'M0,0 C0.18,0.9 0.32,1 1,1',
	arrive: 'M0,0 C0.7,0 0.2,1 1,1',
	spawn: 'M0,0 C0.3,1.6 0.55,1 1,1',
	despawn: 'M0,0 C0.6,0 0.9,0.4 1,1',
	snap: 'M0,0 C0.9,0 0.1,1 1,1'
};

let registered = false;

/** Registers plugins and the named eases. Idempotent and a no-op on the server. */
export function registerMotion(): void {
	if (registered || typeof window === 'undefined') return;
	registered = true;
	gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase, EasePack);
	for (const [name, path] of Object.entries(CURVES)) CustomEase.create(name, path);
	gsap.registerEase(
		EASE.glitch,
		RoughEase.ease.config({ strength: 1.2, points: 24, taper: 'out', randomize: true, clamp: true })
	);
	gsap.defaults({ ease: EASE.steer, duration: DUR.base });
}

export interface MotionContext {
	reduced: boolean;
	desktop: boolean;
	coarse: boolean;
}

/**
 * `gsap.matchMedia` wrapper. `setup` re-runs (after reverting everything it created) whenever the
 * viewport class or the effective reduced-motion value changes, including the ⚙ Motion override.
 */
export function mm(setup: (c: MotionContext) => void | (() => void)): () => void {
	if (typeof window === 'undefined') return () => {};
	registerMotion();
	let media: gsap.MatchMedia | null = null;
	const build = () => {
		media?.revert();
		media = gsap.matchMedia();
		media.add(
			{
				osReduced: '(prefers-reduced-motion: reduce)',
				desktop: '(min-width: 1024px)',
				coarse: '(pointer: coarse)'
			},
			(ctx) => {
				const c = ctx.conditions ?? {};
				return setup({
					reduced: motionOverride() ?? !!c.osReduced,
					desktop: !!c.desktop,
					coarse: !!c.coarse
				});
			}
		);
	};
	build();
	const off = onReducedMotionChange(build);
	return () => {
		off();
		media?.revert();
		media = null;
	};
}

/** At most 3 elements may animate width at once (§3.3); extra requests just skip the march. */
let widthMarches = 0;
const MAX_WIDTH_MARCHES = 3;

export interface RevealOptions {
	scrub?: boolean | number;
	start?: string;
	end?: string;
	delay?: number;
	widthMarch?: boolean;
}

function widthTarget(el: HTMLElement): number {
	const v = parseFloat(getComputedStyle(el).getPropertyValue('--wdth'));
	return Number.isFinite(v) ? v : 100;
}

/**
 * Split reveal shared by `revealLines` and `use:reveal`. Lines rise from a mask with `steer`;
 * words use the words stagger. Under reduced motion it becomes a 200ms fade.
 */
export function revealSplit(el: HTMLElement, by: 'lines' | 'words', o: RevealOptions = {}): () => void {
	return mm(({ reduced }) => {
		const scrollTrigger: ScrollTrigger.Vars = {
			trigger: el,
			start: o.start ?? 'top 85%',
			...(o.end ? { end: o.end } : {}),
			...(o.scrub ? { scrub: o.scrub === true ? 1 : o.scrub } : { once: true })
		};

		if (reduced) {
			gsap.from(el, { autoAlpha: 0, duration: 0.2, ease: 'none', delay: o.delay ?? 0, scrollTrigger });
			return;
		}

		let marching = false;
		const wdth = o.widthMarch ? widthTarget(el) : 100;
		const split = SplitText.create(el, {
			type: by === 'lines' ? 'lines' : 'words,lines',
			mask: by,
			autoSplit: true,
			onSplit: (s) => {
				const tl = gsap.timeline({ delay: o.delay ?? 0, scrollTrigger });
				tl.from(by === 'lines' ? s.lines : s.words, {
					yPercent: 110,
					duration: DUR.reveal,
					ease: EASE.steer,
					stagger: by === 'lines' ? STAGGER.lines : STAGGER.words
				});
				if (o.widthMarch && (marching || widthMarches < MAX_WIDTH_MARCHES)) {
					if (!marching) widthMarches++;
					marching = true;
					el.style.contain = 'layout paint';
					// Lines were split at the target width. While wider than that they must not wrap
					// (the heading would grow taller and shift everything below, pins included):
					// they stay on one row and their masks clip the overflow until the march lands.
					const lines = s.lines;
					tl.fromTo(
						el,
						{ '--wdth': 125 },
						{
							'--wdth': wdth,
							duration: 1.1,
							ease: EASE.steer,
							// No wide pre-render before the reveal: the page lays out at the target width.
							immediateRender: false,
							onStart: () => void gsap.set(lines, { whiteSpace: 'nowrap' }),
							onComplete: () => {
								if (marching) widthMarches--;
								marching = false;
								el.style.removeProperty('contain');
								gsap.set(lines, { clearProps: 'whiteSpace' });
							}
						},
						0
					);
				}
				return tl;
			}
		});
		return () => {
			if (marching) widthMarches--;
			marching = false;
			split.revert();
			el.style.removeProperty('contain');
			el.style.removeProperty('--wdth');
		};
	});
}

/** The default line reveal (§3.3). Returns a cleanup. */
export function revealLines(el: HTMLElement, o: RevealOptions = {}): () => void {
	return revealSplit(el, 'lines', o);
}

const ticks = new WeakMap<HTMLElement, gsap.core.Tween>();

/** Stepped counter (`tick` ease): `el.textContent` counts to `to`. Jumps straight there under reduced motion. */
export function tickTo(
	el: HTMLElement,
	to: number,
	o: { from?: number; steps?: number; duration?: number; format?: (n: number) => string } = {}
): gsap.core.Tween {
	registerMotion();
	const format = o.format ?? ((n: number) => String(Math.round(n)));
	const from = o.from ?? (parseFloat((el.textContent ?? '').replace(/[^\d.-]/g, '')) || 0);
	const state = { v: from };
	ticks.get(el)?.kill();
	const tween = gsap.to(state, {
		v: to,
		duration: device.reducedMotion ? 0 : (o.duration ?? 0.96),
		ease: `steps(${o.steps ?? 8})`,
		onStart: () => void (el.textContent = format(state.v)),
		onUpdate: () => void (el.textContent = format(state.v))
	});
	ticks.set(el, tween);
	return tween;
}

const DECODE_CHARSET = '0123456789#/_';
const decodes = new WeakMap<HTMLElement, gsap.core.Tween>();

/**
 * HUD decode (§3.3): each character cycles through 2 glyphs at 30ms each, then lands, left to right.
 * Labels longer than 24 characters swap instantly.
 */
export function decode(el: HTMLElement, text: string, o: { duration?: number; charset?: string } = {}): gsap.core.Tween {
	registerMotion();
	decodes.get(el)?.kill();
	const charset = o.charset ?? DECODE_CHARSET;
	const cycle = 0.06;
	const duration = text.length > 24 ? 0 : (o.duration ?? Math.min(0.6, cycle + text.length * 0.02));
	const clock = { t: 0 };
	const render = () => {
		const landAt = (i: number) => cycle + (i / Math.max(1, text.length)) * Math.max(0, duration - cycle);
		let out = '';
		for (let i = 0; i < text.length; i++) {
			const ch = text[i];
			if (ch === ' ' || clock.t >= landAt(i)) out += ch;
			else out += charset[(Math.floor(clock.t / 0.03) + i * 7) % charset.length];
		}
		el.textContent = out;
	};
	const tween = gsap.to(clock, {
		t: duration,
		duration,
		ease: 'none',
		onUpdate: render,
		onComplete: () => void (el.textContent = text)
	});
	if (duration === 0) el.textContent = text;
	decodes.set(el, tween);
	return tween;
}
