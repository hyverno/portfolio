<!--
	The Gnaw (DESIGN.md §5 04c): a giant example price (Archivo 900, wdth 62) that gets bitten.
	Four scroll steps each take a bite (a CSS mask stack of radial-gradient circles: a main bite and
	two incisor satellites, landing with `spawn` over 240ms) while the price ticks down in steps(6);
	the fourth lands the RONGÉ stamp. Click / [E] BITE bites at the cursor (12 max), 2–9% off each.
	Phones and touch: the four bites play on enter. Reduced motion: bites appear without the bounce.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { interact } from '#lib/core/actions';
	import { ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { t } from '#lib/i18n/index.svelte';
	import { NNBSP } from '#lib/i18n/format';
	import { biteCircles, maskImage, stream, type Circle } from './bites';

	interface Props {
		seed: number;
		/** Every bite the visitor takes: viewport px of the bite, its radius, the running count. */
		onbite?: (b: { x: number; y: number; r: number; n: number }) => void;
		/** Whenever the price or the stamp changes. */
		onchange?: (s: { price: number; pct: number; stamped: boolean; bites: number }) => void;
	}

	let { seed, onbite, onchange }: Props = $props();

	const MAX_BITES = 12;
	const BASE = 249.99;
	/** The scroll gnaw: three drops, then the stamp on the fourth bite. */
	const STEPS = [249.99, 219.49, 197.0, 184.9, 184.9];

	interface Bite {
		/** Normalised to the price box: x / w, y / h, r / h. */
		nx: number;
		ny: number;
		nr: number;
		/** Landing scale, animated 0 → 1 with `spawn`. */
		s: number;
		seed: number;
	}

	let wrap = $state<HTMLDivElement>();
	let el = $state<HTMLButtonElement>();
	let stampEl = $state<HTMLSpanElement>();
	let box = $state({ w: 0, h: 0 });
	let fs = $state(0);
	let step = $state(0);
	let gnawScale = $state([0, 0, 0, 0]);
	let user = $state<Bite[]>([]);
	let drop = $state(1);
	let shown = $state(BASE);
	let stampKey = $state(0);

	// Four scroll bites, seeded per visit: the top, the € flank, the bottom, the top again.
	const gnaw = $derived.by<Bite[]>(() => {
		const r = stream(seed, 11);
		const at: [number, number][] = [
			[0.16 + r() * 0.12, 0.03],
			[0.985, 0.3 + r() * 0.25],
			[0.42 + r() * 0.16, 0.98],
			[0.64 + r() * 0.1, 0.02]
		];
		return at.map(([nx, ny], i) => ({ nx, ny, nr: 0.2 + r() * 0.06, s: 1, seed: (seed + i * 977) >>> 0 }));
	});

	const price = $derived(Math.max(0.01, STEPS[step] * drop));
	const pct = $derived(Math.round((1 - price / BASE) * 100));
	const stamped = $derived(step >= 4);
	const left = $derived(MAX_BITES - user.length);

	function fmt(v: number): string {
		const [i, d] = v.toFixed(2).split('.');
		return `${i},${d}${NNBSP}€`;
	}

	const mask = $derived.by(() => {
		const { w, h } = box;
		if (!w || !h) return '';
		const out: Circle[] = [];
		const add = (b: Bite, s: number) => {
			if (s <= 0.001) return;
			for (const c of biteCircles(b.nx * w, b.ny * h, b.nr * h, w, h, stream(b.seed, 3)))
				out.push({ x: c.x, y: c.y, r: c.r * s });
		};
		gnaw.forEach((b, i) => add(b, gnawScale[i]));
		for (const b of user) add(b, b.s);
		return out.length ? maskImage(out) : '';
	});

	$effect(() => {
		onchange?.({ price, pct, stamped, bites: user.length });
	});

	// The shown value ticks to the price in six steps.
	let tick: gsap.core.Tween | null = null;
	$effect(() => {
		const to = price;
		tick?.kill();
		if (device.reducedMotion) {
			shown = to;
			return;
		}
		const o = { v: untrack(() => shown) };
		tick = gsap.to(o, { v: to, duration: 0.36, ease: 'steps(6)', onUpdate: () => (shown = o.v) });
	});

	const landing: (gsap.core.Tween | null)[] = [null, null, null, null];

	function land(i: number, on: boolean) {
		landing[i]?.kill();
		const o = { s: gnawScale[i] };
		const reduced = device.reducedMotion;
		landing[i] = gsap.to(o, {
			s: on ? 1 : 0,
			duration: reduced ? 0.001 : on ? 0.24 : 0.16,
			ease: reduced ? 'none' : on ? 'spawn' : 'despawn',
			onUpdate: () => {
				gnawScale[i] = o.s;
			}
		});
	}

	function jolt() {
		if (!el || device.reducedMotion) return;
		gsap.fromTo(el, { x: -4 }, { x: 0, duration: 0.3, ease: 'spawn', overwrite: true });
	}

	function setStep(n: number) {
		const next = Math.max(0, Math.min(4, n));
		if (next === step) return;
		const prev = step;
		step = next;
		for (let i = 0; i < 4; i++) {
			const was = i < prev;
			const now = i < next;
			if (was !== now) land(i, now);
		}
		if (next > prev) {
			jolt();
			if (next === 4) stampKey++;
		}
	}

	// The stamp lands: rotated −8°, scale 1.4 → 1, spawn.
	$effect(() => {
		void stampKey;
		if (!stampEl || !stamped) return;
		const reduced = device.reducedMotion;
		gsap.fromTo(
			stampEl,
			{ scale: reduced ? 1 : 1.4, rotation: -8, autoAlpha: 0 },
			{ scale: 1, rotation: -8, autoAlpha: 1, duration: reduced ? 0.001 : 0.36, ease: 'spawn' }
		);
	});

	function biteAt(e: MouseEvent) {
		if (!el || user.length >= MAX_BITES) return;
		const r = el.getBoundingClientRect();
		const w = r.width;
		const h = r.height;
		const rand = stream((seed + user.length * 7919) >>> 0, 5);
		let x: number;
		let y: number;
		if (e.detail === 0 || (e.clientX === 0 && e.clientY === 0)) {
			// Keyboard / [E]: no pointer, so bite an edge.
			const edge = Math.floor(rand() * 3);
			x = edge === 2 ? w * 0.99 : w * (0.08 + rand() * 0.84);
			y = edge === 0 ? h * 0.03 : edge === 1 ? h * 0.97 : h * (0.2 + rand() * 0.6);
		} else {
			x = Math.min(w, Math.max(0, e.clientX - r.left));
			y = Math.min(h, Math.max(0, e.clientY - r.top));
		}
		const nr = 0.13 + rand() * 0.06;
		user.push({ nx: x / w, ny: y / h, nr, s: 0, seed: (seed ^ Math.imul(user.length + 1, 2654435761)) >>> 0 });
		const b = user[user.length - 1];
		const reduced = device.reducedMotion;
		gsap.to(b, { s: 1, duration: reduced ? 0.001 : 0.24, ease: reduced ? 'none' : 'spawn' });
		drop *= 1 - (0.02 + rand() * 0.07);
		jolt();
		onbite?.({ x: r.left + x, y: r.top + y, r: nr * h, n: user.length });
		if (stamped) stampKey++;
	}

	function fit() {
		if (!wrap || !el) return;
		const avail = wrap.clientWidth;
		const natural = el.offsetWidth;
		const current = parseFloat(getComputedStyle(el).fontSize) || 1;
		if (!avail || !natural) return;
		fs = Math.max(48, Math.min(460, (current * avail * 0.985) / natural));
	}

	onMount(() => {
		const measure = () => {
			if (el) box = { w: el.offsetWidth, h: el.offsetHeight };
		};
		// State changes wait for the next frame: never resize inside a ResizeObserver delivery.
		let raf = 0;
		const later = (fn: () => void) => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(fn);
		};
		let lastW = 0;
		const roWrap = new ResizeObserver(() => {
			const w = wrap?.clientWidth ?? 0;
			if (Math.abs(w - lastW) < 0.5) return;
			lastW = w;
			later(() => {
				fit();
				requestAnimationFrame(measure);
			});
		});
		if (wrap) roWrap.observe(wrap);
		const roEl = new ResizeObserver(() => requestAnimationFrame(measure));
		if (el) roEl.observe(el);
		void document.fonts?.ready.then(() => {
			fit();
			requestAnimationFrame(measure);
		});

		const revert = mm(({ desktop, coarse }) => {
			if (!el) return;
			if (desktop && !coarse) {
				// The gnaw rides the scroll: four steps as the price crosses the viewport.
				const sts = ['top 72%', 'top 58%', 'top 44%', 'top 30%'].map((start, i) =>
					ScrollTrigger.create({
						trigger: el,
						start,
						onEnter: () => setStep(i + 1),
						onLeaveBack: () => setStep(i)
					})
				);
				return () => sts.forEach((s) => s.kill());
			}
			// Phones / touch: the four bites play on enter.
			let tl: gsap.core.Timeline | null = null;
			const st = ScrollTrigger.create({
				trigger: el,
				start: 'top 78%',
				once: true,
				onEnter: () => {
					tl = gsap.timeline();
					for (let i = 1; i <= 4; i++) tl.call(() => setStep(i), undefined, (i - 1) * 0.55);
				}
			});
			return () => {
				st.kill();
				tl?.kill();
			};
		});

		return () => {
			cancelAnimationFrame(raf);
			roWrap.disconnect();
			roEl.disconnect();
			revert();
			tick?.kill();
			for (const tw of landing) tw?.kill();
		};
	});
</script>

<div class="price-wrap" bind:this={wrap}>
	<p class="label micro">{t().rongeur.exampleLabel}</p>
	<div class="price-line">
		<button
			type="button"
			bind:this={el}
			class="price"
			class:spent={left === 0}
			style:font-size={fs ? `${fs}px` : undefined}
			style:mask-image={mask || undefined}
			style:-webkit-mask-image={mask || undefined}
			use:interact={{ verb: t().cursor.verbs.bite }}
			aria-label="{t().rongeur.bite.aria}. {t().rongeur.priceAria(fmt(price))}"
			onclick={biteAt}
			data-no-ping>{fmt(shown)}</button
		>
		{#if stamped}
			<span class="stamp" bind:this={stampEl}>{t().rongeur.stamp(String(pct))}</span>
		{/if}
	</div>
	<p class="hint micro">
		<span>{device.coarse ? t().rongeur.bite.hintTouch : t().rongeur.bite.hint}</span>
		<span class="left">{t().rongeur.bite.left(String(left))}</span>
	</p>
</div>

<style>
	.price-wrap {
		position: relative;
		min-width: 0;
	}

	.label {
		color: var(--r-graphite);
		margin-bottom: 0.6em;
	}

	.price-line {
		position: relative;
		display: block;
		width: 100%;
	}

	.price {
		display: inline-block;
		padding: 0.06em 0 0;
		border: 0;
		background: none;
		text-align: left;
		font-family: var(--font-sans);
		font-weight: 900;
		font-stretch: 62%;
		font-variant-numeric: tabular-nums;
		font-feature-settings: 'tnum' 1;
		font-size: clamp(5.5rem, 15.5vw, 17rem);
		line-height: 0.8;
		letter-spacing: -0.01em;
		white-space: nowrap;
		color: var(--r-brown);
		cursor: pointer;
		mask-composite: intersect;
		-webkit-mask-composite: source-in;
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	@supports not (font-stretch: 62%) {
		.price {
			font-variation-settings: 'wdth' 62;
		}
	}

	.price:focus-visible {
		outline-offset: 10px;
	}

	.price.spent {
		cursor: default;
	}

	.stamp {
		position: absolute;
		right: 1%;
		top: -9%;
		padding: 0.32em 0.6em 0.26em;
		border: 3px solid var(--r-signal-text);
		color: var(--r-signal-text);
		font-family: var(--font-sans);
		font-weight: 800;
		font-stretch: 80%;
		font-size: clamp(1rem, 0.7rem + 1.6vw, 2.25rem);
		line-height: 1;
		letter-spacing: 0.02em;
		white-space: nowrap;
		background: rgb(255 243 226 / 0.88);
		transform: rotate(-8deg);
		pointer-events: none;
		visibility: hidden;
	}

	.hint {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		margin-top: 1.2em;
		color: var(--r-graphite);
	}

	.left {
		color: var(--r-signal-text);
	}
</style>
