<!--
	Static build (§7 No WebGL): line drawings of the three formations, drawn from the very same
	geometry the crowd samples (geometry.ts), so the static page shows the same city, shelves and
	d20. Shown only under html.no-webgl / without JS (`.static-only`). The interactions around them
	(peon, pack, roll) keep working: the parent passes their state in.
-->
<script lang="ts">
	import { t } from '#lib/i18n/index.svelte';
	import { faceOf, faceQuat, projectEdges } from './d20';
	import { D20_RADIUS } from './formations';
	import {
		CITY_SEGS,
		CITY_VIEW,
		MINI,
		MINI_COUNT,
		MINIS_PER_BLOCK,
		PEON,
		SHELF_SEGS,
		SHELF_VIEW,
		hordeOutline,
		miniColors,
		miniOrigin,
		polyPath,
		segsPath
	} from './geometry';

	interface Props {
		kind: 'city' | 'shelves' | 'd20';
		/** Shelves: the mini pulled as the rare (-1 = none yet). */
		rare?: number;
		/** Shelves: primer → paint wipe done. */
		painted?: boolean;
		/** d20: the number facing the viewer. */
		face?: number;
		/** City: the peon has just been despawned. */
		peonGone?: boolean;
	}

	let { kind, rare = -1, painted = false, face = 20, peonGone = false }: Props = $props();

	const CITY_D = segsPath(CITY_SEGS);
	const HORDE_D = polyPath(hordeOutline());
	const SHELF_D = segsPath(SHELF_SEGS);

	const hex = (c: number[]) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

	function miniPaths(m: number) {
		const [x, y] = miniOrigin(m);
		const [bx0, by0, bx1, by1] = MINI.body;
		const { r } = MINI.head;
		const hx = x + MINI.head.x;
		const hy = y + MINI.head.y;
		return {
			body: `M${x + bx0} ${y + by0}H${x + bx1}V${y + by1}H${x + bx0}Z`,
			head: `M${hx - r} ${hy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`,
			base: `M${x + MINI.base[0]} ${y + MINI.base[1]}H${x + MINI.base[2]}`
		};
	}

	/** Primer layer (one colour) and the painted layer grouped by colour: a handful of paths. */
	const MINIS = (() => {
		const primer = { body: '', head: '', base: '' };
		const paint = new Map<string, { fill: string; stroke: string }>();
		const add = (color: number[], kind: 'fill' | 'stroke', d: string) => {
			const k = hex(color);
			const e = paint.get(k) ?? { fill: '', stroke: '' };
			e[kind] += d;
			paint.set(k, e);
		};
		for (let m = 0; m < MINI_COUNT; m++) {
			const p = miniPaths(m);
			primer.body += p.body;
			primer.head += p.head;
			primer.base += p.base;
			const c = miniColors(Math.floor(m / MINIS_PER_BLOCK));
			add(c.body, 'fill', p.body);
			add(c.head, 'fill', p.head);
			add(c.base, 'stroke', p.base);
		}
		return { primer, paint: [...paint.entries()].map(([color, d]) => ({ color, ...d })) };
	})();

	const rarePath = $derived(rare >= 0 ? miniPaths(rare) : null);

	const edges = $derived(projectEdges(faceQuat(faceOf(face))));
	const S = D20_RADIUS;
</script>

<div class="static static-only">
	{#if kind === 'city'}
		<svg viewBox="0 0 {CITY_VIEW[0]} {CITY_VIEW[1]}" role="img" aria-label={t().fallback.city}>
			<defs>
				<pattern id="ludo-horde-dots" width="9" height="9" patternUnits="userSpaceOnUse">
					<circle cx="2" cy="2" r="1.7" />
					<circle cx="6.5" cy="6.5" r="1.7" />
				</pattern>
			</defs>
			<path class="horde" d={HORDE_D} />
			<path class="ink" d={CITY_D} />
			<circle class="peon" class:gone={peonGone} cx={PEON[0]} cy={PEON[1]} r="5" />
		</svg>
	{:else if kind === 'shelves'}
		<svg viewBox="0 0 {SHELF_VIEW[0]} {SHELF_VIEW[1]}" role="img" aria-label={t().fallback.shelves}>
			<path class="ink" d={SHELF_D} />
			<g class="primer">
				<path d={MINIS.primer.body} />
				<path d={MINIS.primer.head} />
				<path class="base" d={MINIS.primer.base} />
			</g>
			<g class="paint" class:on={painted}>
				{#each MINIS.paint as p (p.color)}
					{#if p.fill}<path d={p.fill} style:fill={p.color} />{/if}
					{#if p.stroke}<path class="base" d={p.stroke} style:stroke={p.color} />{/if}
				{/each}
			</g>
			{#if rarePath}
				<g class="rare">
					<path d={rarePath.body} />
					<path d={rarePath.head} />
					<path class="base" d={rarePath.base} />
				</g>
			{/if}
		</svg>
	{:else}
		<svg viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label={t().fallback.d20}>
			{#each edges as e, i (i)}
				<line class:back={e.back} x1={e.x1 * S} y1={-e.y1 * S} x2={e.x2 * S} y2={-e.y2 * S} />
			{/each}
		</svg>
	{/if}
</div>

<style>
	.static {
		position: absolute;
		inset: 0;
		color: var(--ink);
		pointer-events: none;
	}

	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.ink {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.4;
		stroke-linecap: square;
		vector-effect: non-scaling-stroke;
	}

	.horde {
		fill: url(#ludo-horde-dots);
		color: var(--graphite);
	}

	pattern circle {
		fill: var(--graphite);
	}

	.peon {
		fill: var(--signal);
		transition: opacity var(--t-fast) steps(2, end);
	}

	.peon.gone {
		opacity: 0;
	}

	.primer path,
	.rare path {
		fill: #7a7a7c;
	}

	.base {
		fill: none !important;
		stroke: #7a7a7c;
		stroke-width: 1.2;
	}

	.paint .base {
		stroke-width: 1.2;
	}

	/* Primer → paint: a 30° wipe, the same lean as the crowd's scanline. */
	.paint {
		clip-path: polygon(0 0, 0 0, -58% 100%, 0 100%);
		transition: clip-path 1.3s linear;
	}

	.paint.on {
		clip-path: polygon(0 0, 158% 0, 100% 100%, 0 100%);
	}

	/* Reduced motion (OS or ⚙ override): painted at once. */
	:global(html.reduced-motion) .paint {
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html:not(.motion-full)) .paint {
			transition: none;
		}
	}

	.rare path {
		fill: var(--signal);
	}

	.rare .base {
		stroke: var(--signal);
	}

	line {
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	line.back {
		stroke: var(--graphite);
		stroke-dasharray: 2 4;
		stroke-width: 1;
	}
</style>
