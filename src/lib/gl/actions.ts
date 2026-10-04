// `use:formation` (§S2 "Scroll protocol"): a section declares its formation and a scroll anchor.
// Each anchor scrubs (top 80% → top 20%, scrub .6) from the previous anchor's formation into its
// own and holds at 1. All anchors resolve to ONE blend per frame (the deepest one scrolled into),
// written only while nobody has claimed the crowd; when the last claim is released the anchors
// take the crowd back. No static three import: safe in any component.
import type { ActionReturn } from 'svelte/action';
import { whenEngine } from './handle';
import type { Crowd, FormationSource, Glyph, Preset } from './types';
import { ScrollTrigger, gsap, mm } from '#lib/core/motion';
import { PRIORITY, onFrame } from '#lib/core/ticker';

export interface FormationParams {
	id: string;
	source: FormationSource;
	/** Formation to blend from (default: the previous anchor on the page, else 'ambient'). */
	from?: string;
	start?: string;
	end?: string;
	preset?: Preset;
	glyph?: Glyph;
	/** Element whose rect the formation maps onto (default: the node itself). */
	region?: HTMLElement;
	space?: 'page' | 'fixed';
}

interface Anchor {
	node: HTMLElement;
	o: FormationParams;
	/** Scrubbed progress 0..1. */
	p: number;
}

type CrowdWithRelease = Crowd & { onRelease?(fn: () => void): () => void };

const anchors: Anchor[] = [];
let crowd: CrowdWithRelease | null = null;
let offRelease: (() => void) | null = null;
let offFrame: (() => void) | null = null;
let dirty = false;
const last = { from: '', to: '', mix: -1 };

function sortAnchors() {
	anchors.sort((a, b) =>
		a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	);
}

function fromOf(i: number): string {
	return anchors[i].o.from ?? (i > 0 ? anchors[i - 1].o.id : 'ambient');
}

/** Writes the blend of the deepest anchor with progress > 0 (or the first anchor at 0). */
function resolve() {
	dirty = false;
	if (!crowd || crowd.owner !== null || !anchors.length) return;
	let k = -1;
	for (let i = anchors.length - 1; i >= 0; i--) {
		if (anchors[i].p > 0) {
			k = i;
			break;
		}
	}
	const i = Math.max(0, k);
	const from = fromOf(i);
	const to = anchors[i].o.id;
	const mix = k < 0 ? 0 : anchors[i].p;
	if (from === last.from && to === last.to && Math.abs(mix - last.mix) < 1e-4) return;
	last.from = from;
	last.to = to;
	last.mix = mix;
	crowd.blend(from, to, mix);
}

function markDirty() {
	dirty = true;
	offFrame ??= onFrame(() => dirty && resolve(), PRIORITY.input);
}

function bindCrowd(c: CrowdWithRelease) {
	if (crowd === c) return;
	offRelease?.();
	crowd = c;
	offRelease =
		c.onRelease?.(() => {
			// Someone else drove the crowd meanwhile: write again even if our numbers did not change.
			last.mix = -1;
			markDirty();
		}) ?? null;
}

function removeAnchor(a: Anchor) {
	const i = anchors.indexOf(a);
	if (i < 0) return;
	anchors.splice(i, 1);
	if (!anchors.length) {
		offFrame?.();
		offFrame = null;
	}
	markDirty();
}

export function formation(
	node: HTMLElement,
	params: FormationParams
): ActionReturn<FormationParams> {
	let o = params;
	let generation = 0;
	let anchor: Anchor | null = null;
	let revert: (() => void) | null = null;

	const setup = async () => {
		const mine = ++generation;
		const engine = await whenEngine();
		// Destroyed or re-configured while the engine was still booting.
		if (!engine || mine !== generation) return;
		const c = engine.crowd as CrowdWithRelease;
		bindCrowd(c);
		void c.define(
			o.id,
			o.source,
			{ el: o.region ?? node, space: o.space ?? 'page' },
			{ preset: o.preset, glyph: o.glyph }
		);

		const a: Anchor = { node, o, p: 0 };
		anchor = a;
		anchors.push(a);
		sortAnchors();
		markDirty();

		const set = (p: number) => {
			if (p === a.p) return;
			a.p = p;
			markDirty();
		};
		const vars = { trigger: node, start: o.start ?? 'top 80%', end: o.end ?? 'top 20%' };

		revert = mm(({ reduced }) => {
			if (reduced) {
				// Reduced motion: no scrub, the formation is either there or not.
				const st = ScrollTrigger.create({
					...vars,
					onUpdate: (self) => set(self.progress > 0 ? 1 : 0),
					onRefresh: (self) => set(self.progress > 0 ? 1 : 0)
				});
				set(st.progress > 0 ? 1 : 0);
				return () => st.kill();
			}
			const proxy = { p: 0 };
			const tween = gsap.to(proxy, {
				p: 1,
				ease: 'none',
				scrollTrigger: { ...vars, scrub: 0.6 },
				onUpdate: () => set(proxy.p)
			});
			set(tween.scrollTrigger?.progress ?? 0);
			return () => {
				tween.scrollTrigger?.kill();
				tween.kill();
			};
		});
	};

	const teardown = () => {
		generation++;
		revert?.();
		revert = null;
		if (anchor) removeAnchor(anchor);
		anchor = null;
	};

	void setup();

	return {
		update(next) {
			const same =
				next.id === o.id &&
				next.source === o.source &&
				next.from === o.from &&
				next.start === o.start &&
				next.end === o.end &&
				next.region === o.region &&
				next.space === o.space;
			o = next;
			if (anchor) anchor.o = next;
			if (same) return;
			teardown();
			void setup();
		},
		destroy() {
			teardown();
		}
	};
}
