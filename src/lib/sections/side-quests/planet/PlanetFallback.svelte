<script lang="ts">
	// The static planet (§7 "No WebGL"): an inked SVG sphere with contour ellipses, craters, a
	// dithered terminator, the player and its aggro ring, and dots walking a dashed orbit (CSS
	// motion path). The orbit's far half passes behind the planet: the dots are drawn twice, under
	// the plate and over it clipped to the near half, so the occlusion is right without any script.
	import { t } from '#lib/i18n/index.svelte';

	const R = 118;
	const ORBIT = 'M -176 0 A 176 46 0 1 1 176 0 A 176 46 0 1 1 -176 0 Z';
	const DOTS = Array.from({ length: 11 }, (_, i) => ({ d: `${((i * 100) / 11).toFixed(2)}%`, hot: i === 4 }));
	const HILLS = [
		{ x: -42, y: -38, r: [64, 46, 28, 12], rot: 24, k: 0.62 },
		{ x: 46, y: 30, r: [52, 34, 18], rot: -18, k: 0.7 },
		{ x: -52, y: 58, r: [34, 20], rot: 40, k: 0.55 }
	];
	const CRATERS = [
		{ x: 18, y: -54, r: 20 },
		{ x: -70, y: 12, r: 15 },
		{ x: 60, y: -8, r: 12 }
	];
</script>

<svg class="still" viewBox="-200 -200 400 400" role="img" aria-label={t().fallback.planet}>
	<defs>
		<clipPath id="cp-disc"><circle r={R} /></clipPath>
		<clipPath id="cp-near"><rect x="-210" y="0" width="420" height="210" /></clipPath>
		<pattern id="cp-dither" width="3" height="3" patternUnits="userSpaceOnUse">
			<rect width="1.5" height="1.5" class="ink-fill" />
			<rect x="1.5" y="1.5" width="1.5" height="1.5" class="ink-fill" />
		</pattern>
		<mask id="cp-crescent">
			<circle r={R} fill="#fff" />
			<circle cx="-30" cy="-34" r={R * 1.04} fill="#000" />
		</mask>
	</defs>

	<g transform="rotate(-12)">
		<path class="orbit far" d={ORBIT} />
		{#each DOTS as dot (dot.d)}
			<circle class="dot" class:hot={dot.hot} r="3.4" style:--d={dot.d} style:offset-path="path('{ORBIT}')" />
		{/each}
	</g>

	<g class="plate">
		<circle r={R} class="land" />
		<g clip-path="url(#cp-disc)">
			<!-- Highlands (ochre) and lowlands (paper), cut at contour lines. -->
			<ellipse cx="-42" cy="-38" rx="46" ry="29" transform="rotate(24 -42 -38)" class="high" />
			<ellipse cx="46" cy="30" rx="34" ry="24" transform="rotate(-18 46 30)" class="high" />
			<ellipse cx="74" cy="-70" rx="40" ry="26" transform="rotate(30 74 -70)" class="low" />
			{#each HILLS as hill (hill.x)}
				{#each hill.r as r, i (i)}
					<ellipse
						cx={hill.x}
						cy={hill.y}
						rx={r}
						ry={r * hill.k}
						transform="rotate({hill.rot} {hill.x} {hill.y})"
						class="contour"
						class:index={i === 0}
					/>
				{/each}
			{/each}
			{#each CRATERS as c (c.x)}
				<circle cx={c.x} cy={c.y} r={c.r * 1.25} class="contour" />
				<circle cx={c.x} cy={c.y} r={c.r} class="crater" />
				<circle cx={c.x} cy={c.y} r={c.r * 0.62} class="contour" />
				<circle cx={c.x} cy={c.y} r={c.r * 0.28} class="contour" />
			{/each}
			<!-- Player and its dashed aggro ring. -->
			<circle cx="-8" cy="8" r="22" class="aggro" />
			<circle cx="-8" cy="8" r="5" class="player" />
			<!-- Terminator: an ordered-dither crescent, then solid ink at the limb. -->
			<rect x={-R} y={-R} width={R * 2} height={R * 2} fill="url(#cp-dither)" mask="url(#cp-crescent)" />
		</g>
		<circle r={R} class="outline" />
	</g>

	<g transform="rotate(-12)" clip-path="url(#cp-near)">
		<path class="orbit" d={ORBIT} />
		{#each DOTS as dot (dot.d)}
			<circle class="dot" class:hot={dot.hot} r="3.4" style:--d={dot.d} style:offset-path="path('{ORBIT}')" />
		{/each}
	</g>
</svg>

<style>
	.still {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.land {
		fill: var(--earth-sage);
	}

	.high {
		fill: var(--earth-ochre);
	}

	.low {
		fill: var(--paper);
	}

	.contour {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.contour.index {
		stroke-width: 1.8;
	}

	.crater {
		fill: var(--paper);
		stroke: var(--ink);
		stroke-width: 1.4;
		vector-effect: non-scaling-stroke;
	}

	.ink-fill {
		fill: var(--ink);
	}

	.outline {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}

	.player {
		fill: var(--signal);
		stroke: var(--ink);
		stroke-width: 1;
	}

	.aggro {
		fill: none;
		stroke: var(--signal);
		stroke-width: 1.4;
		stroke-dasharray: 3 3;
		vector-effect: non-scaling-stroke;
	}

	.orbit {
		fill: none;
		stroke: var(--graphite);
		stroke-width: 1.3;
		stroke-dasharray: 7 6;
		vector-effect: non-scaling-stroke;
	}

	.dot {
		fill: var(--ink);
		offset-rotate: 0deg;
		offset-distance: var(--d);
		animation: orbit 16s linear infinite;
	}

	.dot.hot {
		fill: var(--signal);
	}

	@keyframes orbit {
		from {
			offset-distance: var(--d);
		}
		to {
			offset-distance: calc(var(--d) + 100%);
		}
	}
</style>
