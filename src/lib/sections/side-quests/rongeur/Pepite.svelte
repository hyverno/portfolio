<!--
	Pépite, Le Rongeur's hamster (DESIGN.md §5 04c), as a procedural SVG in the brand's three
	colours: brown body, cream belly and muzzle, apricot cheeks and inner ears, a gold-nugget deal
	in her paws ("pépite"). Pupils track `lookAt` (viewport px, clamped to ~3px); she blinks every
	2.5–6s (eyelids squash 1 → .1 → 1 in 120ms) and wiggles her nose every 2.4s. `cheeks` scales the
	pouches; `wave()` and `nom()` are imperative one-shots. Reduced motion: no idle animation.
-->
<script module lang="ts">
	/** Geometry in viewBox units (400 × 400), shared with the stream paths. */
	export const PEPITE_VIEW = 400;
	export const CHEEK_L = { x: 128, y: 238, r: 34, ox: 162, oy: 246 };
	export const CHEEK_R = { x: 272, y: 238, r: 34, ox: 238, oy: 246 };
	export const MOUTH = { x: 200, y: 244 };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { scroll } from '#lib/core/scroll.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';

	interface Props {
		/** Pouch scale: 1 = resting, up to ~2 when stuffed. */
		cheeks: number;
		/** Point to look at, viewport px (null = idle gaze). */
		lookAt?: { x: number; y: number } | null;
		/** Idle gaze direction when nothing is tracked (unit-ish vector). */
		gaze?: { x: number; y: number };
		/** Decorative instance (no accessible name). */
		label?: string;
	}

	let { cheeks, lookAt = null, gaze = { x: -0.6, y: 0.35 }, label = '' }: Props = $props();

	const uid = $props.id();
	const EYE_L = { x: 150, y: 184 };
	const EYE_R = { x: 250, y: 184 };
	const LOOK = 3.4;

	let svg = $state<SVGSVGElement>();
	let pupils = $state({ x: 0, y: 0 });
	let lid = $state(1);
	let nose = $state({ s: 1, y: 0 });
	let jaw = $state(0);
	let wave = $state({ on: 0, a: 0 });

	/** Page-space rect, re-measured on resize; viewport = page − scroll (no layout reads per frame). */
	let box = { left: 0, top: 0, w: 1 };

	function measure() {
		if (!svg) return;
		const r = svg.getBoundingClientRect();
		box = { left: r.left, top: r.top + scroll.y, w: r.width };
	}

	const squint = $derived(Math.max(0.78, 1 - Math.max(0, cheeks - 1.3) * 0.35));

	let waveTl: gsap.core.Timeline | null = null;
	let jawTw: gsap.core.Tween | null = null;

	/** One-shot: raises a paw and waves it ±12° twice. */
	export function waveHello(): void {
		if (device.reducedMotion) return;
		waveTl?.kill();
		waveTl = gsap
			.timeline()
			.to(wave, { on: 1, duration: 0.32, ease: 'spawn' })
			.to(wave, { a: 12, duration: 0.16, ease: 'sine.inOut' })
			.to(wave, { a: -12, duration: 0.26, ease: 'sine.inOut' })
			.to(wave, { a: 12, duration: 0.26, ease: 'sine.inOut' })
			.to(wave, { a: -12, duration: 0.26, ease: 'sine.inOut' })
			.to(wave, { a: 0, duration: 0.16, ease: 'sine.inOut' })
			.to(wave, { on: 0, duration: 0.3, ease: 'despawn' }, '+=0.25');
	}

	/**
	 * Drives `write(t)` over `duration` seconds (t: 0 → 1, linear) and always lands on t = 1:
	 * the one-shots below are shaped functions of t, so a dropped frame can never strand a pose.
	 */
	function oneShot(duration: number, write: (t: number) => void): gsap.core.Tween {
		const p = { t: 0 };
		return gsap.to(p, {
			t: 1,
			duration,
			ease: 'none',
			onUpdate: () => write(p.t),
			onComplete: () => write(1)
		});
	}

	/** One-shot: a quick double chomp (teeth and jaw). */
	export function nom(): void {
		if (device.reducedMotion) return;
		jawTw?.kill();
		jawTw = oneShot(0.3, (t) => (jaw = t >= 1 ? 0 : Math.abs(Math.sin(t * Math.PI * 2))));
	}

	/** Eyelids squash 1 → .1 → 1 over 120ms. */
	function blink() {
		oneShot(0.12, (t) => (lid = t >= 1 ? 1 : 1 - 0.9 * (1 - Math.abs(2 * t - 1))));
	}

	/** A three-beat nose wiggle. */
	function wiggle() {
		oneShot(0.34, (t) => {
			const k = t >= 1 ? 0 : Math.sin(t * Math.PI * 3) * (1 - t);
			nose = { s: 1 + 0.14 * k, y: -1.2 * Math.abs(k) };
		});
	}

	onMount(() => {
		measure();
		const ro = new ResizeObserver(measure);
		if (svg) ro.observe(svg);
		window.addEventListener('resize', measure);

		let blinkTimer = 0;
		const scheduleBlink = () => {
			blinkTimer = window.setTimeout(
				() => {
					if (!device.reducedMotion) blink();
					scheduleBlink();
				},
				2500 + Math.random() * 3500
			);
		};
		scheduleBlink();
		const noseTimer = window.setInterval(() => !device.reducedMotion && wiggle(), 2400);

		// Pupils ease toward their target (critically damped look, not a snap).
		const off = onFrame((_, dt) => {
			let tx = gaze.x * LOOK * 0.6;
			let ty = gaze.y * LOOK * 0.6;
			if (lookAt && box.w > 1) {
				const k = box.w / 400;
				const cx = box.left + 200 * k;
				const cy = box.top - scroll.y + 184 * k;
				const dx = lookAt.x - cx;
				const dy = lookAt.y - cy;
				const d = Math.hypot(dx, dy) || 1;
				const m = Math.min(1, d / (60 * k + 40)) * LOOK;
				tx = (dx / d) * m;
				ty = (dy / d) * m;
			}
			const a = 1 - Math.exp(-dt * 14);
			const nx = pupils.x + (tx - pupils.x) * a;
			const ny = pupils.y + (ty - pupils.y) * a;
			if (Math.abs(nx - pupils.x) > 0.01 || Math.abs(ny - pupils.y) > 0.01) pupils = { x: nx, y: ny };
		}, PRIORITY.ui);

		return () => {
			ro.disconnect();
			window.removeEventListener('resize', measure);
			clearTimeout(blinkTimer);
			clearInterval(noseTimer);
			off();
			waveTl?.kill();
			jawTw?.kill();
		};
	});

	const cheekT = (c: { ox: number; oy: number }, s: number) =>
		`translate(${c.ox} ${c.oy}) scale(${s}) translate(${-c.ox} ${-c.oy})`;
	const eyeT = (e: { x: number; y: number }) =>
		`translate(${e.x} ${e.y}) scale(1 ${lid * squint}) translate(${-e.x} ${-e.y})`;
</script>

<svg
	bind:this={svg}
	class="pepite"
	viewBox="0 0 400 400"
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
>
	<!-- ground shadow: a flat ellipse, no blur -->
	<ellipse cx="200" cy="376" rx="128" ry="11" fill="#EBD9C1" />

	<!-- ears -->
	<g>
		<circle cx="112" cy="102" r="37" fill="#2B1B12" />
		<circle cx="117" cy="106" r="21" fill="#F2894B" />
		<circle cx="288" cy="102" r="37" fill="#2B1B12" />
		<circle cx="283" cy="106" r="21" fill="#F2894B" />
	</g>

	<!-- the waving paw (behind the body: it rises from the shoulder) -->
	{#if wave.on > 0.01}
		<g
			transform="translate(316 236) rotate({-58 * wave.on + wave.a}) scale({0.35 + 0.65 * wave.on}) translate(-316 -236)"
		>
			<rect x="306" y="223" width="96" height="26" rx="13" fill="#2B1B12" />
			<ellipse cx="404" cy="236" rx="17" ry="19" fill="#2B1B12" />
			<ellipse cx="408" cy="236" rx="9" ry="10.5" fill="#F2894B" />
			<circle cx="419" cy="225" r="3.3" fill="#F2894B" />
			<circle cx="422" cy="236" r="3.3" fill="#F2894B" />
			<circle cx="419" cy="247" r="3.3" fill="#F2894B" />
		</g>
	{/if}

	<!-- body -->
	<path
		d="M200 70 C292 70 348 140 348 238 C348 324 292 372 200 372 C108 372 52 324 52 238 C52 140 108 70 200 70 Z"
		fill="#2B1B12"
	/>
	<!-- a little crest of fur -->
	<path d="M188 74 Q194 58 200 72 Q206 60 212 74" fill="#2B1B12" />

	<!-- belly -->
	<clipPath id="{uid}-body">
		<path d="M200 70 C292 70 348 140 348 238 C348 324 292 372 200 372 C108 372 52 324 52 238 C52 140 108 70 200 70 Z" />
	</clipPath>
	<ellipse cx="200" cy="318" rx="100" ry="76" fill="#FFF3E2" clip-path="url(#{uid}-body)" />

	<!-- feet -->
	<g fill="#FFF3E2" stroke="#2B1B12" stroke-width="2.2">
		<ellipse cx="146" cy="370" rx="30" ry="12" />
		<ellipse cx="254" cy="370" rx="30" ry="12" />
	</g>
	<g stroke="#2B1B12" stroke-width="2" stroke-linecap="round">
		<path d="M136 365 v6 M146 364 v7 M156 365 v6" />
		<path d="M244 365 v6 M254 364 v7 M264 365 v6" />
	</g>

	<!-- cheek pouches -->
	<g transform={cheekT(CHEEK_L, cheeks)}>
		<circle cx={CHEEK_L.x} cy={CHEEK_L.y} r={CHEEK_L.r} fill="#F2894B" />
		<ellipse cx={CHEEK_L.x - 12} cy={CHEEK_L.y - 13} rx="9" ry="6" fill="#FFF3E2" opacity="0.55" transform="rotate(-24 {CHEEK_L.x - 12} {CHEEK_L.y - 13})" />
	</g>
	<g transform={cheekT(CHEEK_R, cheeks)}>
		<circle cx={CHEEK_R.x} cy={CHEEK_R.y} r={CHEEK_R.r} fill="#F2894B" />
		<ellipse cx={CHEEK_R.x - 10} cy={CHEEK_R.y - 14} rx="9" ry="6" fill="#FFF3E2" opacity="0.55" transform="rotate(-24 {CHEEK_R.x - 10} {CHEEK_R.y - 14})" />
	</g>

	<!-- muzzle -->
	<ellipse cx="200" cy="240" rx="47" ry="35" fill="#FFF3E2" />

	<!-- whiskers: three hairlines a side -->
	<g stroke="#2B1B12" stroke-width="1.6" stroke-linecap="round" fill="none">
		<path d="M164 230 L98 214 M162 240 L94 240 M164 250 L100 266" />
		<path d="M236 230 L302 214 M238 240 L306 240 M236 250 L300 266" />
	</g>

	<!-- nose -->
	<g transform="translate(200 {222 + nose.y}) scale({nose.s} {2 - nose.s}) translate(-200 -222)">
		<path d="M187 216 Q200 208 213 216 Q212 227 200 232 Q188 227 187 216 Z" fill="#2B1B12" />
		<ellipse cx="195" cy="216" rx="3.6" ry="2.2" fill="#FFF3E2" opacity="0.8" />
	</g>

	<!-- mouth + incisors -->
	<g transform="translate(0 {jaw * 2.4})">
		<rect x="192.5" y="241" width="7" height="12" rx="2" fill="#FFFDF8" stroke="#2B1B12" stroke-width="1.8" />
		<rect x="200.5" y="241" width="7" height="12" rx="2" fill="#FFFDF8" stroke="#2B1B12" stroke-width="1.8" />
	</g>
	<path
		d="M200 232 L200 240 M187 239 Q193.5 247 200 240 Q206.5 247 213 239"
		fill="none"
		stroke="#2B1B12"
		stroke-width="2.6"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<!-- eyes -->
	{#each [EYE_L, EYE_R] as e (e.x)}
		<g transform={eyeT(e)}>
			<ellipse cx={e.x} cy={e.y} rx="19" ry="21" fill="#FFF3E2" />
			<circle cx={e.x + pupils.x} cy={e.y + pupils.y + 1} r="13.5" fill="#2B1B12" />
			<circle cx={e.x + pupils.x + 5} cy={e.y + pupils.y - 4.5} r="4.6" fill="#FFFDF8" />
			<circle cx={e.x + pupils.x - 4.5} cy={e.y + pupils.y + 6} r="1.9" fill="#FFFDF8" />
		</g>
	{/each}

	<!-- paws holding the nugget (the deal) -->
	<g>
		<path d="M200 268 L222 280 L218 306 L196 314 L178 300 L180 278 Z" fill="#F2894B" stroke="#2B1B12" stroke-width="2.4" stroke-linejoin="round" />
		<path d="M200 268 L200 290 L222 280 M200 290 L196 314 M200 290 L180 278" fill="none" stroke="#2B1B12" stroke-width="1.4" stroke-linejoin="round" opacity="0.55" />
		<path d="M186 282 L196 276 L198 288 Z" fill="#FFF3E2" opacity="0.7" />
		<ellipse cx="176" cy="292" rx="15" ry="12" fill="#2B1B12" />
		<ellipse cx="224" cy="292" rx="15" ry="12" fill="#2B1B12" />
		<g fill="#F2894B">
			<circle cx="183" cy="285" r="2.2" />
			<circle cx="185" cy="292" r="2.2" />
			<circle cx="183" cy="299" r="2.2" />
			<circle cx="217" cy="285" r="2.2" />
			<circle cx="215" cy="292" r="2.2" />
			<circle cx="217" cy="299" r="2.2" />
		</g>
	</g>
</svg>

<style>
	.pepite {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
</style>
