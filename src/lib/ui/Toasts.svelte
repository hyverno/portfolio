<!--
	Achievement / status toasts (§7): one at a time, 3.2s hold, 320ms exit, at most one every 5s.
	The region is a persistent polite live region; toasts wait for the preloader to finish.
-->
<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { DUR, EASE, gsap } from '#lib/core/motion';
	import { device } from '#lib/core/device.svelte';
	import { whenBooted } from '#lib/core/boot.svelte';
	import { t } from '#lib/i18n/index.svelte';
	import {
		ACH_TOTAL,
		achText,
		takeToast,
		toastQueue,
		type ToastMsg
	} from '#lib/stores/achievements.svelte';
	import Brackets from './Brackets.svelte';

	const HOLD_MS = 3200;
	const EXIT_S = 0.32;
	const GAP_MS = 5000;

	let current = $state<ToastMsg | null>(null);
	let card = $state<HTMLDivElement>();
	let ready = $state(false);
	let lastShown = Number.NEGATIVE_INFINITY;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let alive = true;

	const copy = $derived.by(() => {
		const m = current;
		if (!m) return null;
		const tr = t().hud.trophy;
		if (!m.ach) return { label: '', title: m.title, body: m.body ?? '', count: '' };
		const { title, line } = achText(m.ach);
		return {
			label: m.kind === 'ultra' ? tr.ultra : tr.unlocked,
			title: m.kind === 'ultra' ? `${tr.prefix} ${title}` : title,
			body: line,
			count: m.count ? tr.progress(String(m.count).padStart(2, '0'), String(ACH_TOTAL)) : ''
		};
	});

	const wait = (ms: number) => new Promise<void>((r) => (timer = setTimeout(r, ms)));

	function pump() {
		if (!ready || current || toastQueue.length === 0) return;
		clearTimeout(timer);
		timer = setTimeout(show, Math.max(0, lastShown + GAP_MS - performance.now()));
	}

	async function show() {
		const m = takeToast();
		if (!m || !alive) return;
		lastShown = performance.now();
		current = m;
		await tick();
		const reduced = device.reducedMotion;
		try {
			if (card) {
				gsap.fromTo(card, reduced ? { autoAlpha: 0 } : { autoAlpha: 0, y: 16, scale: 0.97 }, {
					autoAlpha: 1,
					y: 0,
					scale: 1,
					duration: reduced ? 0.2 : DUR.base,
					ease: reduced ? 'none' : EASE.spawn
				});
			}
			await wait(HOLD_MS);
			if (card && alive) {
				await gsap.to(card, {
					autoAlpha: 0,
					y: reduced ? 0 : 8,
					duration: EXIT_S,
					ease: reduced ? 'none' : EASE.despawn
				});
			}
		} finally {
			if (alive) current = null;
		}
	}

	$effect(() => {
		void toastQueue.length;
		void current;
		void ready;
		untrack(pump);
	});

	onMount(() => {
		void whenBooted().then(() => {
			if (alive) ready = true;
		});
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	});
</script>

<div class="region" role="status" aria-live="polite" aria-atomic="true">
	{#if current && copy}
		<div
			class="toast"
			class:ultra={current.kind === 'ultra'}
			class:info={!current.ach}
			bind:this={card}
		>
			<Brackets color={current.kind === 'ultra' ? '#D9A441' : 'var(--ink)'} pad={4} />
			{#if copy.label || copy.count}
				<p class="head micro">
					<span class="label">
						<svg class="icon" viewBox="0 0 16 16" aria-hidden="true">
							<path d="M8 2.5 13.5 8 8 13.5 2.5 8Z" />
						</svg>
						{copy.label}
					</span>
					{#if copy.count}<span class="count">{copy.count}</span>{/if}
				</p>
			{/if}
			<p class="title">{copy.title}</p>
			{#if copy.body}<p class="body">{copy.body}</p>{/if}
		</div>
	{/if}
</div>

<style>
	.region {
		position: fixed;
		left: 50%;
		bottom: calc(var(--frame-inset) + 72px);
		z-index: var(--z-toast);
		width: min(380px, calc(100vw - 48px));
		transform: translateX(-50%);
		pointer-events: none;
	}

	.toast {
		position: relative;
		display: grid;
		gap: 6px;
		padding: 14px 16px 15px;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--hairline);
		visibility: hidden;
	}

	.head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		color: var(--graphite);
	}

	.label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.icon {
		width: 10px;
		height: 10px;
		fill: none;
		stroke: var(--signal);
		stroke-width: 1.5;
		stroke-linecap: square;
	}

	.title {
		--wdth: 80;
		font-family: var(--font-sans);
		font-stretch: calc(var(--wdth) * 1%);
		font-size: var(--fs-h3);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: 0.005em;
		text-transform: uppercase;
	}

	.body {
		font-size: 0.875rem;
		line-height: 1.4;
		color: var(--graphite);
	}

	.info .title {
		font-family: var(--font-mono);
		font-size: var(--fs-hud);
		font-weight: 450;
		letter-spacing: var(--tr-hud);
		text-transform: none;
		line-height: 1.45;
		font-stretch: 87.5%;
	}

	/* #1,445: gold rim (graphics only; the tag stays ink-on-gold for contrast). */
	.ultra {
		border: 1.5px solid #d9a441;
		box-shadow:
			inset 0 0 0 3px var(--paper),
			inset 0 0 0 4px #d9a441;
	}

	.ultra .label {
		padding: 1px 6px 0;
		background: #d9a441;
		color: #111110;
	}

	.ultra .icon {
		stroke: #111110;
	}

	@media (max-width: 767px) {
		.region {
			bottom: calc(var(--frame-inset) + 16px);
		}
	}
</style>
