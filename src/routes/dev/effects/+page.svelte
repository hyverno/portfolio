<script lang="ts">
	import { onMount } from 'svelte';
	import { collider } from '#lib/core/actions';
	import { finishBoot } from '#lib/core/boot.svelte';
	import { isEditable, onKey } from '#lib/core/keys';
	import { gsap } from '#lib/core/motion';
	import { setTheme, theme } from '#lib/core/theme.svelte';
	import { whenEngine } from '#lib/gl/handle';
	import type { ViewMode } from '#lib/gl/types';
	import type { Bench, BenchInfo } from './harness';

	// ?src=engine drives the layout's real engine instead of the fake crowd. ?sim=64 shrinks the fake.
	// ?slow=10 runs every GSAP tween 10× slower (to inspect the sweep and the ink edge).
	let canvas: HTMLCanvasElement;
	let fx = $state<Bench | null>(null);
	let failed = $state(false);
	let info = $state<BenchInfo>({ live: 0, total: 0, mode: 1, ink: false, z: '' });
	let hose = $state(false);
	let rain = $state(false);

	const MODES: [ViewMode, string][] = [
		[1, 'LIT'],
		[2, 'DENSITY'],
		[3, 'DEBUG'],
		[4, 'IDS']
	];

	async function ink() {
		if (!fx) return;
		await fx.cover();
		await new Promise((r) => setTimeout(r, 350));
		await fx.reveal();
	}

	const onToolbar = (t: EventTarget | null) =>
		t instanceof Element && !!t.closest('button, a, .toolbar');

	/** Bench shortcuts; returns false when the key is not one of ours. */
	function shortcut(key: string): boolean {
		const m = Number(key);
		if (m >= 1 && m <= 4) fx?.mode(m as ViewMode);
		else if (key === 'b') fx?.burst();
		else if (key === 'h') hose = fx?.hose() ?? false;
		else if (key === 'c') void fx?.cover();
		else if (key === 'r') void fx?.reveal();
		else return false;
		return true;
	}

	onMount(() => {
		let disposed = false;
		let bench: Bench | null = null;
		const params = new URLSearchParams(location.search);
		const useEngine = params.get('src') === 'engine';
		const offs: (() => void)[] = [];
		finishBoot();
		const slow = Number(params.get('slow'));
		if (slow > 0) {
			gsap.globalTimeline.timeScale(1 / slow);
			offs.push(() => gsap.globalTimeline.timeScale(1));
		}

		const ready = (b: Bench) => {
			if (disposed) return b.dispose();
			bench = fx = b;
			(window as unknown as { __fx: Bench }).__fx = b;
		};

		if (useEngine) {
			canvas.remove();
			whenEngine().then(async (engine) => {
				if (!engine) return void (failed = true);
				const { createEngineBench } = await import('./harness');
				ready(createEngineBench(engine));
			});
			// 1–4 and click-to-ping are the engine's own input; the bench adds the rest.
			for (const k of ['b', 'h', 'c', 'r']) offs.push(onKey(k, () => shortcut(k)));
		} else {
			// Sit in the root stacking context like the layout's canvas, so the ink cover can reach z 70.
			document.body.append(canvas);
			import('./harness')
				.then(({ createFakeBench }) =>
					ready(createFakeBench(canvas, { simSize: Number(params.get('sim')) || 128 }))
				)
				.catch((err) => {
					console.warn('[dev/effects] WebGL unavailable', err);
					failed = true;
				});

			// The layout's engine would answer the same keys and clicks: park it while the bench runs.
			let parked: { canvas: HTMLCanvasElement; resume(): void } | null = null;
			whenEngine().then((engine) => {
				if (!engine || disposed) return;
				const el = (engine.renderer as { domElement: HTMLCanvasElement }).domElement;
				engine.pause(true);
				el.style.visibility = 'hidden';
				parked = { canvas: el, resume: () => engine.pause(false) };
			});
			const onKeyCapture = (e: KeyboardEvent) => {
				if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isEditable(e.target)) return;
				if (shortcut(e.key.toLowerCase())) e.stopImmediatePropagation();
			};
			// The engine pings on click (and skips prevented clicks): claim it first.
			const onClickCapture = (e: MouseEvent) => {
				if (e.button !== 0 || onToolbar(e.target)) return;
				fx?.burst(e.clientX, e.clientY);
				e.preventDefault();
				e.stopImmediatePropagation();
			};
			window.addEventListener('keydown', onKeyCapture, { capture: true });
			window.addEventListener('click', onClickCapture, { capture: true });
			offs.push(() => {
				window.removeEventListener('keydown', onKeyCapture, { capture: true });
				window.removeEventListener('click', onClickCapture, { capture: true });
				if (parked) {
					parked.canvas.style.visibility = '';
					parked.resume();
				}
			});
		}

		const poll = setInterval(() => {
			if (fx) info = fx.info;
		}, 250);
		return () => {
			disposed = true;
			clearInterval(poll);
			for (const off of offs) off();
			bench?.dispose();
			canvas.remove();
		};
	});
</script>

<svelte:head>
	<title>DEV · GL EFFECTS</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<canvas class="fx" bind:this={canvas} aria-hidden="true"></canvas>

<div class="bench wrap">
	<header class="head">
		<p class="hud-text graphite">
			DEV / A3B · GL EFFECTS · {fx?.source === 'engine' ? 'REAL ENGINE' : 'FAKE CROWD'}
		</p>
		<h1 class="title" use:collider>Damage, density, debug, ink.</h1>
		<p class="copy" use:collider>
			A stand-in crowd (or the real engine, with ?src=engine) drives the real effect modules: GPU
			damage numbers, the four view modes with their scanline sweep, the debug overlay and the Ink
			Swarm cover. Click empty space to ping.
		</p>
	</header>

	<div class="cards">
		<figure class="card" use:collider><figcaption class="mono">CARD 01</figcaption></figure>
		<figure class="card" use:collider><figcaption class="mono">CARD 02</figcaption></figure>
		<figure class="card tall" use:collider><figcaption class="mono">CARD 03</figcaption></figure>
	</div>

	<p class="copy note" use:collider>
		Keys: 1–4 view modes · B burst · H hose · C cover · R reveal. Scroll to check that the debug
		brackets track their elements.
	</p>
	<div class="spacer"></div>
	<p class="copy" use:collider>End of page.</p>
</div>

<div class="toolbar mono" role="toolbar" aria-label="Effects controls">
	{#if failed}
		<span>WEBGL UNAVAILABLE</span>
	{:else}
		<div class="group">
			{#each MODES as [m, label] (m)}
				<button class:on={info.mode === m} onclick={() => fx?.mode(m)}>[{m}] {label}</button>
			{/each}
		</div>
		<div class="group">
			<button onclick={() => fx?.burst()}>BURST</button>
			<button onclick={() => fx?.burst(undefined, undefined, 1)}>CRITS</button>
			<button onclick={() => fx?.crumbs()}>CRUMBS</button>
			<button class:on={hose} onclick={() => (hose = fx?.hose() ?? false)}>HOSE</button>
			<button class:on={rain} onclick={() => (rain = fx?.rain() ?? false)}>RAIN</button>
		</div>
		<div class="group">
			<button onclick={() => void fx?.cover()}>COVER</button>
			<button onclick={() => void fx?.reveal()}>REVEAL</button>
			<button onclick={ink}>COVER → REVEAL</button>
			<button onclick={() => setTheme(theme.name === 'paper' ? 'viewport' : 'paper')}>THEME</button>
		</div>
		<span class="readout">
			LIVE {info.live} · TOTAL {info.total} · MODE {info.mode}{info.ink ? ` · INK z${info.z}` : ''}
		</span>
	{/if}
</div>

<style>
	.fx {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: var(--z-gl);
		pointer-events: none;
	}
	.bench {
		position: relative;
		z-index: var(--z-content);
		padding-block: 160px 200px;
	}
	.head {
		max-width: 62ch;
	}
	.title {
		font-size: var(--fs-h1);
		margin: 16px 0 24px;
		display: inline-block;
	}
	.copy {
		max-width: 52ch;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 24px;
		margin: 96px 0;
	}
	.card {
		margin: 0;
		height: 180px;
		border: 1px solid var(--hairline);
		padding: 12px;
	}
	.card.tall {
		height: 260px;
	}
	.note {
		margin-top: 48px;
	}
	.spacer {
		height: 120vh;
	}
	.toolbar {
		position: fixed;
		left: 28px;
		right: 28px;
		top: 64px;
		z-index: var(--z-hud);
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		align-items: center;
		font-size: var(--fs-micro);
		letter-spacing: 0.08em;
	}
	.group {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	button {
		font: inherit;
		letter-spacing: inherit;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--ink);
		padding: 6px 8px;
		cursor: pointer;
	}
	button.on {
		background: var(--ink);
		color: var(--paper);
	}
	@media (max-width: 639px) {
		.toolbar {
			left: 16px;
			right: 16px;
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.group {
			flex-wrap: nowrap;
		}
		.readout {
			white-space: nowrap;
		}
	}
	.readout {
		color: var(--graphite);
		font-variant-numeric: tabular-nums;
	}
</style>
