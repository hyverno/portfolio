<script lang="ts">
	import { onMount } from 'svelte';
	import { collider } from '#lib/core/actions';
	import { onKey } from '#lib/core/keys';
	import { setTheme, theme } from '#lib/core/theme.svelte';
	import type { ViewMode } from '#lib/gl/types';
	import type { Harness } from './harness';

	let canvas: HTMLCanvasElement;
	let fx = $state<Harness | null>(null);
	let failed = $state(false);
	let info = $state({ live: 0, total: 0, mode: 1 as ViewMode, ink: false, z: '' });
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

	function onPointerDown(e: PointerEvent) {
		if (!fx || e.button !== 0) return;
		if ((e.target as HTMLElement).closest('button, a, .toolbar')) return;
		fx.burst(e.clientX, e.clientY);
	}

	onMount(() => {
		let disposed = false;
		let harness: Harness | null = null;
		const params = new URLSearchParams(location.search);
		// Like the layout's canvas, sit in the root stacking context so the ink cover can reach z 70.
		document.body.append(canvas);
		import('./harness')
			.then(({ createHarness }) => {
				if (disposed) return;
				harness = createHarness(canvas, { simSize: Number(params.get('sim')) || 128 });
				fx = harness;
				(window as unknown as { __fx: Harness }).__fx = harness;
			})
			.catch((err) => {
				console.warn('[dev/effects] WebGL unavailable', err);
				failed = true;
			});

		const poll = setInterval(() => {
			if (fx) info = fx.info;
		}, 250);
		const keys = [
			...MODES.map(([m]) => onKey(String(m), () => fx?.mode(m))),
			onKey('b', () => fx?.burst()),
			onKey('h', () => (hose = fx?.hose() ?? false)),
			onKey('c', () => void fx?.cover()),
			onKey('r', () => void fx?.reveal())
		];
		return () => {
			disposed = true;
			clearInterval(poll);
			for (const off of keys) off();
			harness?.dispose();
			canvas.remove();
		};
	});
</script>

<svelte:head>
	<title>DEV · GL EFFECTS</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onpointerdown={onPointerDown} />

<canvas class="fx" bind:this={canvas} aria-hidden="true"></canvas>

<div class="bench wrap">
	<header class="head">
		<p class="hud-text graphite">DEV / A3B · GL EFFECTS · FAKE CROWD</p>
		<h1 class="title" use:collider>Damage, density, debug, ink.</h1>
		<p class="copy" use:collider>
			A stand-in crowd drives the real effect modules: GPU damage numbers, the four view modes with
			their scanline sweep, the debug overlay and the Ink Swarm cover. Click empty space to ping.
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
		padding-block: 120px 200px;
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
		left: 16px;
		right: 16px;
		bottom: 16px;
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
	.readout {
		color: var(--graphite);
		font-variant-numeric: tabular-nums;
	}
</style>
