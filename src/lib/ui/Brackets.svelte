<!--
	The house shape (§2.5): four 10px corners, 1.5px thick.
	- Inline (no `target` prop): an overlay inside the positioned parent, offset by `pad`.
	- Fixed (`target` passed, even null, or `fixed`): a viewport overlay that glides between boxes
	  (240ms `steer`). It follows `target`, or is driven imperatively via `moveTo` / `follow` / `hide`.
-->
<script lang="ts">
	import { DUR, EASE, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { expand, trackRect, type Box } from './track';

	interface Props {
		target?: HTMLElement | null;
		color?: string;
		pad?: number;
		fixed?: boolean;
		/** z-index of the fixed overlay. */
		z?: string;
	}

	let { target, color = 'currentColor', pad = 4, fixed, z = 'var(--z-top)' }: Props = $props();

	const isFixed = $derived(fixed ?? target !== undefined);

	const L = 10;
	let root = $state<HTMLDivElement>();
	let corners: HTMLSpanElement[] = $state([]);
	const cur: Box = { x: 0, y: 0, w: 0, h: 0 };
	let from: Box = { ...cur };
	let to: Box = { ...cur };
	let tween: gsap.core.Tween | null = null;
	let shown = false;

	function render() {
		const [tl, tr, bl, br] = corners;
		if (!br) return;
		const w = Math.max(cur.w, L * 2);
		const h = Math.max(cur.h, L * 2);
		tl.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
		tr.style.transform = `translate(${cur.x + w - L}px, ${cur.y}px)`;
		bl.style.transform = `translate(${cur.x}px, ${cur.y + h - L}px)`;
		br.style.transform = `translate(${cur.x + w - L}px, ${cur.y + h - L}px)`;
	}

	const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

	/** Glides to `box` (viewport px). */
	export function moveTo(box: Box, o: { duration?: number; ease?: string } = {}) {
		to = { ...box };
		const d = device.reducedMotion ? 0 : (o.duration ?? DUR.fast);
		tween?.kill();
		tween = null;
		if (d === 0) {
			Object.assign(cur, to);
			render();
			return;
		}
		from = { ...cur };
		const s = { p: 0 };
		tween = gsap.to(s, {
			p: 1,
			duration: d,
			ease: o.ease ?? EASE.steer,
			onUpdate: () => {
				// `to` may move while gliding (scroll): always ease toward the live target.
				cur.x = lerp(from.x, to.x, s.p);
				cur.y = lerp(from.y, to.y, s.p);
				cur.w = lerp(from.w, to.w, s.p);
				cur.h = lerp(from.h, to.h, s.p);
				render();
			},
			onComplete: () => void (tween = null)
		});
	}

	/** Updates the target without a new glide (scroll / resize while locked). */
	export function follow(box: Box) {
		to = { ...box };
		if (tween) return;
		Object.assign(cur, to);
		render();
	}

	/** Places the brackets instantly. */
	export function snap(box: Box) {
		tween?.kill();
		tween = null;
		to = { ...box };
		Object.assign(cur, to);
		render();
	}

	export function show() {
		if (shown || !root) return;
		shown = true;
		gsap.to(root, { autoAlpha: 1, duration: DUR.ack, ease: 'none', overwrite: 'auto' });
	}

	export function hide(o: { duration?: number } = {}) {
		if (!shown || !root) return;
		shown = false;
		gsap.to(root, {
			autoAlpha: 0,
			duration: o.duration ?? DUR.micro,
			ease: 'none',
			overwrite: 'auto'
		});
	}

	/** Mousedown acknowledgement: .9 for 80ms, springs back on release. */
	export function press(down: boolean) {
		if (!root) return;
		gsap.to(root, {
			scale: down ? 0.9 : 1,
			duration: down ? 0.08 : DUR.fast,
			ease: down ? 'none' : EASE.spawn,
			transformOrigin: `${cur.x + cur.w / 2}px ${cur.y + cur.h / 2}px`,
			overwrite: 'auto'
		});
	}

	// Target-driven mode (focus ring, any "brackets around this element" overlay).
	$effect(() => {
		if (!isFixed || target === undefined) return;
		const el = target;
		if (!el) {
			hide();
			return;
		}
		let first = true;
		const tracker = trackRect(el, (b) => {
			if (b.w === 0 && b.h === 0) return hide();
			const box = expand(b, pad);
			if (!first) return follow(box);
			first = false;
			if (shown) moveTo(box);
			else {
				// Appear by contracting onto the element: a lock-on, not a pop.
				snap(expand(box, 6));
				moveTo(box);
				show();
			}
		});
		return () => tracker.stop();
	});
</script>

{#if isFixed}
	<div class="fixed" bind:this={root} style:--c={color} style:z-index={z} aria-hidden="true">
		{#each ['tl', 'tr', 'bl', 'br'] as k, i (k)}
			<span class="corner {k}" bind:this={corners[i]}></span>
		{/each}
	</div>
{:else}
	<span class="inline" style:--c={color} style:--pad="{pad}px" aria-hidden="true"></span>
{/if}

<style>
	.fixed {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
	}

	.corner {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--bracket);
		height: var(--bracket);
		will-change: transform;
		--bar-h: linear-gradient(var(--c) 0 0);
	}

	.tl {
		background:
			var(--bar-h) 0 0 / 100% var(--bracket-w) no-repeat,
			var(--bar-h) 0 0 / var(--bracket-w) 100% no-repeat;
	}
	.tr {
		background:
			var(--bar-h) 100% 0 / 100% var(--bracket-w) no-repeat,
			var(--bar-h) 100% 0 / var(--bracket-w) 100% no-repeat;
	}
	.bl {
		background:
			var(--bar-h) 0 100% / 100% var(--bracket-w) no-repeat,
			var(--bar-h) 0 100% / var(--bracket-w) 100% no-repeat;
	}
	.br {
		background:
			var(--bar-h) 100% 100% / 100% var(--bracket-w) no-repeat,
			var(--bar-h) 100% 100% / var(--bracket-w) 100% no-repeat;
	}

	.inline {
		--l: var(--bracket);
		--w: var(--bracket-w);
		position: absolute;
		inset: calc(var(--pad) * -1);
		pointer-events: none;
		background:
			linear-gradient(var(--c) 0 0) 0 0 / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 0 / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--w) var(--l) no-repeat;
	}
</style>
