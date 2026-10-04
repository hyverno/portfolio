<!--
	The custom cursor itself (§3.5), loaded only when it is active (fine pointer, motion on):
	10px ink crosshair via `gsap.quickTo` (.12s power3); lock-on brackets fitted to the rect + 6px
	(240ms `steer`) with the `[E] VERB` prompt 8px below-right; .9 press; cast ring; Debug readout.
	[data-interact] locks are published with `setLocked` (core's E handler clicks them); plain
	links / buttons are clicked by E here.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { DUR, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { scroll } from '#lib/core/scroll.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { isEditable, onKey } from '#lib/core/keys';
	import { getLocked, setLocked } from '#lib/core/actions';
	import { getEngine } from '#lib/gl/handle';
	import { t } from '#lib/i18n/index.svelte';
	import Brackets from './Brackets.svelte';
	import Prompt from './Prompt.svelte';
	import { pad } from './chrome.svelte';
	import { expand, trackRect, type Box, type Tracker } from './track';

	const LOCK_PAD = 6;
	const LOCKABLE = '[data-interact], a[href], button:not(:disabled), [role="button"]';
	/** World units (§S2 uMouseR) → px: .22 × half the viewport height. */
	const AGGRO_R = 0.22;

	let reticle = $state<HTMLDivElement>();
	let brackets = $state<ReturnType<typeof Brackets>>();
	let verb = $state('');
	let castR = $state(0);
	let debug = $state(false);
	let readout = $state('');
	let away = $state(true);
	let overText = $state(false);
	let pressed = $state(false);
	/** Prompt flips to the other side of the reticle near the right / bottom edges. */
	let flipX = $state(false);
	let flipY = $state(false);
	let aggro = $state(0);

	function verbFor(el: HTMLElement): string {
		const v = t().cursor.verbs;
		if (el.dataset.interact) return el.dataset.interact;
		if (el.tagName === 'A') return v.open;
		return el.hasAttribute('aria-pressed') || el.hasAttribute('aria-expanded')
			? v.toggle
			: v.select;
	}

	function start(): () => void {
		const html = document.documentElement;
		html.classList.add('has-cursor');
		const el = reticle!;
		const xTo = gsap.quickTo(el, 'x', { duration: 0.12, ease: 'power3' });
		const yTo = gsap.quickTo(el, 'y', { duration: 0.12, ease: 'power3' });

		let px = -100;
		let py = -100;
		let locked: HTMLElement | null = null;
		let tracker: Tracker | null = null;
		let ours = false;

		const pointBox = (): Box => ({ x: px - 7, y: py - 7, w: 14, h: 14 });

		function lockOn(next: HTMLElement | null) {
			if (next === locked) return;
			tracker?.stop();
			tracker = null;
			if (ours && getLocked() === locked) setLocked(null);
			locked = next;
			ours = false;
			if (!next) {
				verb = '';
				brackets?.moveTo(pointBox(), { duration: DUR.fast });
				brackets?.hide();
				return;
			}
			if (next.hasAttribute('data-interact')) {
				setLocked(next);
				ours = true;
			}
			verb = verbFor(next);
			let first = true;
			tracker = trackRect(next, (b) => {
				const box = expand(b, LOCK_PAD);
				if (!first) return brackets?.follow(box);
				first = false;
				// The crosshair splits into the AABB: brackets grow from the reticle onto the rect.
				brackets?.snap(pointBox());
				brackets?.show();
				brackets?.moveTo(box, { duration: DUR.fast });
			});
		}

		function evaluate(target: Element | null) {
			if (!target) return lockOn(null);
			overText = isEditable(target);
			const hit = target.closest<HTMLElement>(LOCKABLE);
			lockOn(hit && !hit.closest('[aria-hidden="true"], [inert]') ? hit : null);
			const cast = target.closest<HTMLElement>('[data-cursor="cast"]');
			castR = cast ? Number(cast.dataset.cursorR) || 60 : 0;
		}

		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			px = e.clientX;
			py = e.clientY;
			if (away) {
				away = false;
				gsap.set(el, { x: px, y: py });
			}
			xTo(px);
			yTo(py);
			flipX = px > window.innerWidth - 160;
			flipY = py > window.innerHeight - 48;
			evaluate(e.target instanceof Element ? e.target : null);
			if (debug) readout = t().cursor.readout(pad(px, 4), pad(py, 4));
		};
		const onOut = (e: MouseEvent) => {
			if (e.relatedTarget) return;
			away = true;
			lockOn(null);
		};
		const onDown = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			pressed = true;
			brackets?.press(true);
		};
		const onUp = () => {
			if (!pressed) return;
			pressed = false;
			brackets?.press(false);
		};

		// Content scrolls under a still pointer: re-test what is under it, ≤10×/s.
		let lastY = scroll.y;
		let lastTest = 0;
		const offFrame = onFrame((time) => {
			const mode = getEngine()?.viewMode;
			if ((mode === 3) !== debug) {
				debug = mode === 3;
				aggro = AGGRO_R * (window.innerHeight / 2);
				readout = t().cursor.readout(pad(px, 4), pad(py, 4));
			}
			if (away || scroll.y === lastY || time - lastTest < 0.1) return;
			lastY = scroll.y;
			lastTest = time;
			evaluate(document.elementFromPoint(px, py));
		}, PRIORITY.ui);

		// E on a plain link/button lock (core handles [data-interact] locks and focused elements).
		const offE = onKey('e', (e) => {
			if (e.repeat || !locked || ours || getLocked()) return;
			if (document.activeElement?.closest('[data-interact]')) return;
			e.preventDefault();
			locked.click();
		});

		window.addEventListener('pointermove', onMove, { passive: true });
		window.addEventListener('pointerdown', onDown, { passive: true });
		window.addEventListener('pointerup', onUp, { passive: true });
		document.addEventListener('mouseout', onOut);

		return () => {
			html.classList.remove('has-cursor');
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointerup', onUp);
			document.removeEventListener('mouseout', onOut);
			offFrame();
			offE();
			tracker?.stop();
			if (ours && getLocked() === locked) setLocked(null);
			verb = '';
			away = true;
		};
	}

	onMount(start);
</script>

<div class="cursor" aria-hidden="true">
	<div
		class="reticle"
		class:locked={verb !== ''}
		class:away
		class:text={overText}
		class:pressed
		class:flip-x={flipX}
		class:flip-y={flipY}
		bind:this={reticle}
	>
		<span class="cross"></span>
		{#if castR}
			<svg class="ring cast" style:--r="{castR}px" viewBox="-1 -1 2 2" preserveAspectRatio="none">
				<circle r="0.995" vector-effect="non-scaling-stroke" />
			</svg>
		{/if}
		{#if debug}
			<svg class="ring aggro" style:--r="{aggro}px" viewBox="-1 -1 2 2" preserveAspectRatio="none">
				<circle r="0.995" vector-effect="non-scaling-stroke" />
			</svg>
			<span class="readout micro">{readout}</span>
		{/if}
		{#if verb}
			<span class="prompt"><Prompt {verb} /></span>
		{/if}
	</div>
	<Brackets bind:this={brackets} fixed color="var(--ink)" pad={0} z="auto" />
</div>

<style>
	:global(html.has-cursor),
	:global(html.has-cursor *) {
		cursor: none !important;
	}

	:global(html.has-cursor :is(textarea, select, [contenteditable='true'], [contenteditable=''])),
	:global(
		html.has-cursor
			input:not([type='button'], [type='submit'], [type='checkbox'], [type='radio'], [type='range'])
	) {
		cursor: text !important;
	}

	.cursor {
		position: fixed;
		inset: 0;
		z-index: var(--z-cursor);
		pointer-events: none;
	}

	.reticle {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		color: var(--ink);
		will-change: transform;
		transition: opacity var(--t-micro) linear;
	}

	.reticle.away,
	.reticle.text {
		opacity: 0;
	}

	.cross {
		position: absolute;
		left: -5px;
		top: -5px;
		width: 10px;
		height: 10px;
		background:
			linear-gradient(currentColor 0 0) 50% 50% / 100% 1.5px no-repeat,
			linear-gradient(currentColor 0 0) 50% 50% / 1.5px 100% no-repeat;
		transition:
			transform var(--t-fast) var(--ease-steer),
			opacity var(--t-micro) linear;
	}

	.locked .cross {
		transform: scale(0.4) rotate(45deg);
		opacity: 0;
	}

	.pressed .cross {
		transform: scale(0.9);
		transition-duration: 80ms;
	}

	.ring {
		position: absolute;
		left: calc(var(--r) * -1);
		top: calc(var(--r) * -1);
		width: calc(var(--r) * 2);
		height: calc(var(--r) * 2);
		overflow: visible;
		fill: none;
		stroke-width: 1;
	}

	.cast {
		stroke: var(--ink);
		stroke-dasharray: 4 4;
	}

	.aggro {
		stroke: var(--debug-cobalt);
		stroke-dasharray: 2 6;
	}

	.readout {
		position: absolute;
		left: 12px;
		top: -22px;
		color: var(--debug-cobalt);
		white-space: nowrap;
	}

	.prompt {
		position: absolute;
		left: 8px;
		top: 8px;
		animation: prompt-in var(--t-micro) steps(3, end) both;
	}

	.flip-x .prompt {
		left: auto;
		right: 8px;
	}

	.flip-y .prompt {
		top: auto;
		bottom: 8px;
	}

	@keyframes prompt-in {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
</style>
