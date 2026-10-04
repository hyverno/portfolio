<!--
	00 · Preloader: SPAWN (§5, S1), z 80.
	A spawner gizmo at the centre with its callout labels, the stage label + `00000 / 16384` counter
	bottom-right, and the real boot log bottom-left. The paper backdrop sits *under* the WebGL canvas
	(z 19) so the crowd visibly spawns from the gizmo; the labels sit above it.
	Timing: min 1.6s, hard skip 4s; 0.6s on a repeat visit; mobile ≤1.2s; no-WebGL 0.4s.
	Exit: the counter drops out (300ms `despawn`) while the callout labels fly into their HUD slots
	(720ms `steer`, stagger .06), then `finishBoot()`. Any failure still finishes the boot.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { DUR, EASE, STAGGER, decode, gsap } from '#lib/core/motion';
	import { TIER, device } from '#lib/core/device.svelte';
	import { boot, finishBoot, log } from '#lib/core/boot.svelte';
	import { stats } from '#lib/core/stats.svelte';
	import { fmtNum, t } from '#lib/i18n/index.svelte';
	import { ACH_TOTAL, ach } from '#lib/stores/achievements.svelte';
	import { chrome, entityCount, pad } from './chrome.svelte';

	const LINE_GAP_MS = 90;

	let gone = $state(false);
	let mounted = $state(false);
	let count = $state(0);
	let shownCount = $state(0);

	let backdrop = $state<HTMLDivElement>();
	let rootEl = $state<HTMLDivElement>();
	let gizmo = $state<SVGSVGElement>();
	let leader = $state<SVGSVGElement>();
	let logEl = $state<HTMLOListElement>();
	let stageEl = $state<HTMLParagraphElement>();
	let counterEl = $state<HTMLParagraphElement>();
	let labels: HTMLSpanElement[] = $state([]);

	// SSR renders the high-tier count; the real tier is read after mount (A1: no hydration branching).
	const total = $derived(mounted ? TIER[device.tier].sim ** 2 : TIER.high.sim ** 2);
	const maxLines = $derived(mounted && device.mobile ? 6 : 8);
	const stage = $derived(t().boot.stages[boot.stage]);
	const counter = $derived(t().boot.counter(pad(count, 5), String(total)));

	/** The visible log tail; the static-build line always closes the log when there is no WebGL. */
	const lines = $derived.by(() => {
		let list = boot.log.slice(0, shownCount);
		if (device.webgl === 'none') {
			const tail = t().boot.log.noWebgl;
			const last = list.filter((l) => l.endsWith(tail));
			list = [...list.filter((l) => !l.endsWith(tail)), ...last];
		}
		return list.slice(-maxLines);
	});

	const callouts = $derived([
		{ slot: 'tag', text: t().hud.buildTag },
		{
			slot: 'stats',
			text: t().hud.stats(fmtNum(entityCount()), fmtNum(stats.fps), fmtNum(stats.frameMs, 1))
		},
		{
			slot: 'trophies',
			text: `${t().hud.labels.trophies} ${pad(ach.unlocked.length, 2)}/${ACH_TOTAL}`
		}
	]);

	// Counter: steps toward round(progress × N), like a stat overlay catching up.
	const shown = { v: 0 };
	let counterTween: gsap.core.Tween | null = null;
	$effect(() => {
		const target = Math.round(boot.progress * total);
		untrack(() => {
			counterTween?.kill();
			if (device.reducedMotion) {
				shown.v = count = target;
				return;
			}
			counterTween = gsap.to(shown, {
				v: target,
				duration: 0.4,
				ease: 'steps(8)',
				onUpdate: () => void (count = Math.round(shown.v))
			});
		});
	});

	// Stage label decodes on change (§3.3); the first label is simply there.
	let shownStage = '';
	$effect(() => {
		const text = stage;
		if (!stageEl || !mounted || text === shownStage) return;
		const first = shownStage === '';
		shownStage = text;
		if (first || device.reducedMotion) stageEl.textContent = text;
		else decode(stageEl, text);
	});

	let exiting = false;

	/**
	 * Waits for an exit animation, but never longer than its own length plus a margin: tweens run on
	 * rAF, which stops in a background tab, and the preloader must never outlive the boot.
	 */
	function settle(anim: gsap.core.Animation): Promise<void> {
		const ms = anim.totalDuration() * 1000 + 250;
		return Promise.race([
			new Promise<void>((r) => void anim.eventCallback('onComplete', () => r())),
			new Promise<void>((r) => setTimeout(r, ms))
		]);
	}

	async function exit(fast = false) {
		if (exiting) return;
		exiting = true;
		const handed: string[] = [];
		try {
			if (document.hidden) return;
			if (device.reducedMotion || fast) {
				await settle(gsap.to([rootEl, backdrop], { autoAlpha: 0, duration: 0.2, ease: 'none' }));
				return;
			}
			const k = boot.short ? 0.5 : 1;
			const tl = gsap.timeline();
			tl.to(
				[stageEl, counterEl],
				{ y: 24, autoAlpha: 0, duration: 0.3 * k, ease: EASE.despawn, stagger: 0.04 },
				0
			);
			tl.to([logEl, leader], { autoAlpha: 0, duration: 0.3 * k, ease: EASE.despawn }, 0);
			tl.to(
				gizmo!,
				{
					scale: 0.4,
					autoAlpha: 0,
					duration: 0.3 * k,
					ease: EASE.despawn,
					transformOrigin: '50% 50%'
				},
				0
			);

			labels.forEach((el, i) => {
				const slot = el.dataset.slot ?? '';
				const target = document.querySelector<HTMLElement>(`.hud [data-hud-slot="${slot}"]`);
				const tr = target?.getBoundingClientRect();
				if (!tr || tr.width === 0) {
					tl.to(el, { autoAlpha: 0, duration: 0.3 * k, ease: EASE.despawn }, 0);
					return;
				}
				// Flip into the slot: align the edge the HUD slot is anchored to, centre vertically.
				const sr = el.getBoundingClientRect();
				const right = tr.left + tr.width / 2 > window.innerWidth / 2;
				const dx = right ? tr.right - sr.right : tr.left - sr.left;
				const dy = tr.top + tr.height / 2 - (sr.top + sr.height / 2);
				tl.to(el, { x: dx, y: dy, duration: DUR.reveal * k, ease: EASE.steer }, i * STAGGER.rows);
				handed.push(slot);
			});

			tl.to(backdrop!, { autoAlpha: 0, duration: DUR.base * k, ease: EASE.arrive }, 0.18 * k);
			await settle(tl);
		} catch {
			/* never trap the visitor behind the preloader */
		} finally {
			chrome.handed = handed;
			finishBoot();
			gone = true;
		}
	}

	// The layout's safety net (or anything else) may finish the boot first: leave immediately.
	$effect(() => {
		if (boot.done && !exiting) void exit(true);
	});

	onMount(() => {
		mounted = true;
		const short = boot.short;
		const reduced = device.reducedMotion;
		if (short) log(t().boot.log.resumed);
		if (reduced) log(t().boot.log.reduced);

		let lastLine = 0;
		let closing = false;
		const timer = setInterval(() => {
			try {
				const now = performance.now();
				if (shownCount < boot.log.length && now - lastLine >= LINE_GAP_MS) {
					shownCount++;
					lastLine = now;
				}

				const noGL = device.webgl === 'none';
				const ready = boot.progress >= 1;
				// Close the log once: the one joke, then READY (the static build ends on its own line).
				if (ready && !closing && !noGL) {
					closing = true;
					const l = t().boot.log;
					if (!short && !reduced && !boot.log.some((s) => s.endsWith(l.joke))) log(l.joke);
					if (!boot.log.at(-1)?.endsWith(l.ready)) log(l.ready);
				}

				const elapsed = now / 1000;
				const mobile = device.mobile;
				const min = short ? 0.6 : noGL ? 0.4 : reduced ? 0.6 : mobile ? 0.8 : 1.6;
				const max = short ? 0.6 : noGL ? 1.2 : mobile ? 1.2 : 4;
				const flushed = shownCount >= boot.log.length;
				if (elapsed >= max || (elapsed >= min && ready && flushed)) {
					clearInterval(timer);
					void exit();
				}
			} catch {
				clearInterval(timer);
				void exit(true);
			}
		}, 30);

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') void exit();
		};
		window.addEventListener('keydown', onKey);

		return () => {
			clearInterval(timer);
			window.removeEventListener('keydown', onKey);
			counterTween?.kill();
			if (!boot.done) finishBoot();
		};
	});
</script>

{#if !gone}
	<div class="backdrop" bind:this={backdrop} aria-hidden="true"></div>
	<div class="pre" bind:this={rootEl} aria-hidden="true">
		<div class="spawner">
			<svg class="gizmo" bind:this={gizmo} viewBox="-40 -40 80 80">
				<circle class="orbit" r="30" />
				<circle class="pulse" r="16" />
				<circle class="ring" r="16" />
				<circle class="core" r="3" />
				<path class="ticks" d="M0-22v-5M0 22v5M-22 0h-5M22 0h5" />
			</svg>
			<svg class="leader" bind:this={leader} viewBox="0 -48 72 48" aria-hidden="true">
				<path d="M12-12 40-40H72" />
			</svg>
			<div class="callouts hud-text">
				{#each callouts as c, i (c.slot)}
					<span class="callout" data-slot={c.slot} bind:this={labels[i]}>{c.text}</span>
				{/each}
			</div>
		</div>

		<ol class="log micro" bind:this={logEl}>
			{#each lines as line, i}
				<li class:latest={i === lines.length - 1}>{line}</li>
			{/each}
		</ol>

		<div class="progress">
			<p class="stage hud-text" bind:this={stageEl}>{stage}</p>
			<p class="counter mono" bind:this={counterEl}>{counter}</p>
		</div>
	</div>
{/if}

<style>
	/* Under the WebGL canvas (z 20), over the content (z 10): the spawn wave shows on paper. */
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: calc(var(--z-gl) - 1);
		background: var(--paper);
	}

	.pre {
		position: fixed;
		inset: var(--frame-inset);
		z-index: var(--z-preloader);
		pointer-events: none;
		color: var(--ink);
	}

	/* No JS: no preloader. If the app never hydrates, CSS still lifts it after 8s. */
	:global(html:not(.js)) .backdrop,
	:global(html:not(.js)) .pre {
		display: none;
	}

	.backdrop,
	.pre {
		animation: failsafe 0s linear 8s forwards;
	}

	@keyframes failsafe {
		to {
			opacity: 0;
			visibility: hidden;
		}
	}

	.spawner {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0;
		height: 0;
	}

	.gizmo {
		position: absolute;
		left: -40px;
		top: -40px;
		width: 80px;
		max-width: none;
		height: 80px;
		overflow: visible;
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
		stroke-linecap: square;
	}

	.orbit {
		stroke: var(--graphite);
		stroke-width: 1;
		stroke-dasharray: 2 5;
		transform-origin: 0 0;
		animation: orbit 6s linear infinite;
	}

	.pulse {
		stroke: var(--signal);
		stroke-width: 1;
		transform-origin: 0 0;
		animation: pulse 0.9s var(--ease-despawn) infinite;
	}

	.core {
		fill: var(--signal);
		stroke: none;
	}

	@keyframes orbit {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		from {
			transform: scale(1);
			opacity: 0.9;
		}
		to {
			transform: scale(2.6);
			opacity: 0;
		}
	}

	/* CAD-style callout: a leader from the gizmo's rim to the stack of labels. */
	.leader {
		position: absolute;
		left: 0;
		top: -48px;
		width: 72px;
		max-width: none;
		height: 48px;
		overflow: visible;
		fill: none;
		stroke: var(--ink);
		stroke-width: 1;
	}

	.callouts {
		position: absolute;
		left: 78px;
		top: -48px;
		display: grid;
		justify-items: start;
		gap: 4px;
		white-space: nowrap;
	}

	/* Paper plates (as in the HUD): the spawn wave streams right under the labels. */
	.callout,
	.log li,
	.stage,
	.counter {
		background: var(--paper);
		box-shadow: 0 0 0 3px var(--paper);
	}

	.callout:first-child {
		color: var(--ink);
	}

	.callout:not(:first-child) {
		color: var(--graphite);
	}

	.log {
		position: absolute;
		left: 18px;
		bottom: 16px;
		display: grid;
		justify-items: start;
		gap: 3px;
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--graphite);
		max-width: min(46ch, 50vw);
	}

	.log li {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		animation: type-in var(--t-fast) steps(4, end) both;
	}

	.log li.latest {
		color: var(--ink);
	}

	@keyframes type-in {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	.progress {
		position: absolute;
		right: 18px;
		bottom: 14px;
		display: grid;
		justify-items: end;
		gap: 4px;
		text-align: right;
	}

	.stage {
		color: var(--graphite);
	}

	.counter {
		font-family: var(--font-mono);
		font-size: var(--fs-h2);
		font-weight: 500;
		font-stretch: 87.5%;
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	@media (max-width: 767px) {
		.callouts {
			left: -50vw;
			right: auto;
			top: 56px;
			width: 100vw;
			justify-items: center;
		}

		.leader {
			display: none;
		}

		.log {
			left: 12px;
			bottom: 92px;
			max-width: calc(100vw - 48px);
		}

		.progress {
			right: 12px;
			bottom: 14px;
		}
	}
</style>
