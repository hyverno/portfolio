<!--
	SYSTEM IN SYSTEM's node graph (§5 Lab cell 3): Spawn → Update → Emitter[child] → Render, the
	Niagara stack of the parent emitter. NestedScene reports every real launch and burst of its
	analytic schedule; each one sends a signal pulse down the matching wire (Web Animations on a
	dash offset, no per-frame JS) and blinks the node it lands on. Static under reduced motion and
	in the no-WebGL still.
-->
<script lang="ts">
	import { t, fmtNum } from '#lib/i18n/index.svelte';

	interface Props {
		/** Sub-labels under each node title (real counts from the scene). */
		emitters?: number;
		sparks?: number;
	}

	let { emitters = 64, sparks = 64 }: Props = $props();

	const NODES = [
		{ x: 14, y: 14 },
		{ x: 24, y: 76 },
		{ x: 14, y: 138 },
		{ x: 24, y: 200 }
	];
	const NW = 112;
	const NH = 40;
	const POOL = 8;

	const wires = NODES.slice(0, -1).map((a, i) => {
		const b = NODES[i + 1];
		const x1 = a.x + NW / 2;
		const y1 = a.y + NH;
		const x2 = b.x + NW / 2;
		const y2 = b.y;
		return `M${x1} ${y1}C${x1} ${y1 + 14} ${x2} ${y2 - 14} ${x2} ${y2}`;
	});

	const subs = $derived([
		`×${emitters}`,
		'Δt · g',
		`×${sparks}`,
		`${fmtNum(emitters * sparks)} PTS`
	]);

	let pulseEls: SVGPathElement[][] = $state([[], [], []]);
	let flashEls: SVGRectElement[] = $state([]);
	const next = [0, 0, 0];
	let lengths: number[] = [];

	function len(w: number): number {
		if (!lengths.length) lengths = pulseEls.map((p) => p[0]?.getTotalLength?.() ?? 60);
		return lengths[w] || 60;
	}

	/** Sends one pulse down wire `w` (0: Spawn→Update, 1: Update→Emitter, 2: Emitter→Render). */
	export function pulse(w: 0 | 1 | 2): void {
		const el = pulseEls[w]?.[next[w]];
		if (!el || typeof el.animate !== 'function') return;
		next[w] = (next[w] + 1) % POOL;
		const l = len(w);
		const anim = el.animate(
			[
				{ strokeDashoffset: 6, opacity: 1 },
				{ strokeDashoffset: -l, opacity: 1 }
			],
			{ duration: 420, easing: 'linear' }
		);
		anim.onfinish = () => {
			flashEls[w + 1]?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
		};
		if (w === 0) flashEls[0]?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
	}
</script>

<svg class="graph" viewBox="0 0 150 254" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
	{#each wires as d, w (w)}
		<path class="wire" {d} />
		{#each { length: POOL } as _, k (k)}
			<path class="pulse" {d} bind:this={pulseEls[w][k]} />
		{/each}
	{/each}
	{#each NODES as n, i (i)}
		<g transform="translate({n.x} {n.y})">
			<rect class="node" width={NW} height={NH} rx="2" />
			<rect class="flash" width={NW} height={NH} rx="2" bind:this={flashEls[i]} />
			<rect class="tab" class:child={i === 2} width="3" height={NH} />
			<circle class="port" cx={NW / 2} cy="0" r="2.2" />
			<circle class="port" cx={NW / 2} cy={NH} r="2.2" />
			<text class="title" x="10" y="16">{t().lab.nested.graph[i]}</text>
			<text class="sub" x="10" y="30">{subs[i]}</text>
		</g>
	{/each}
</svg>

<style>
	.graph {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.wire {
		fill: none;
		stroke: color-mix(in srgb, var(--ink) 34%, transparent);
		stroke-width: 1;
	}

	.pulse {
		fill: none;
		stroke: var(--signal);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-dasharray: 6 600;
		stroke-dashoffset: 6;
		opacity: 0;
	}

	.node {
		fill: color-mix(in srgb, var(--paper), var(--ink) 5%);
		stroke: color-mix(in srgb, var(--ink) 30%, transparent);
		stroke-width: 1;
	}

	.flash {
		fill: none;
		stroke: var(--signal);
		stroke-width: 1.5;
		opacity: 0;
	}

	.tab {
		fill: color-mix(in srgb, var(--ink) 55%, transparent);
	}

	.tab.child {
		fill: var(--signal);
	}

	.port {
		fill: var(--paper);
		stroke: color-mix(in srgb, var(--ink) 55%, transparent);
		stroke-width: 1;
	}

	.title {
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 500;
		fill: var(--ink);
	}

	.sub {
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.06em;
		fill: var(--graphite);
	}
</style>
