<!--
	Mission brief (§5 03 · SHIPPED, cols 1–5): title in --fs-display, role chip, reception as a HUD
	line, developer / publisher / platforms / runtime release, the line copy and the Steam link.
	Rows carry `data-row` and the title `data-title`, so the section can choreograph slot changes.
	Facts come from content.ts only (BUILD-NOTES §4: nothing beyond the role title is claimed).
-->
<script lang="ts">
	import type { Game } from '#lib/content/types';
	import { langHref, loc, t } from '#lib/i18n/index.svelte';
	import { collideWhen } from './collide';

	interface Props {
		game: Game;
		index: number;
		total: number;
		/** Release status line: static dates in the prerender, `releaseLabel()` after mount. */
		release: string;
		titleId: string;
		/** `/projects/[slug]` pages do not exist yet: the spec-sheet link stays off until they do. */
		specSheets?: boolean;
		/** Crowd obstacle on/off (off while the pin moves: see collide.ts). */
		colliding?: boolean;
	}

	let {
		game,
		index,
		total,
		release,
		titleId,
		specSheets = false,
		colliding = true
	}: Props = $props();

	const NEW_TAB = { en: 'opens in a new tab', fr: 's’ouvre dans un nouvel onglet' };

	const pad2 = (n: number) => String(n).padStart(2, '0');
	const reception = $derived(loc(game.reception));
	// Long titles step down from --fs-display so they set in three lines, not five.
	const scale = $derived(game.title.length > 20 ? 0.7 : game.title.length > 12 ? 0.84 : 1);
</script>

<div class="brief" use:collideWhen={{ on: colliding, pad: 12 }}>
	<p class="kicker hud-text" data-row>
		<span class="count">{t().shipped.ticker(pad2(index + 1), pad2(total))}</span>
		<span class="rule" aria-hidden="true"></span>
	</p>

	<h3 class="title" id={titleId} data-title style:--k={scale}>{game.title}</h3>

	<div class="tags" data-row>
		<p class="chip hud-text">
			<span class="visually-hidden">{t().shipped.labels.role}: </span>{loc(game.role)}
		</p>
		{#if reception}
			<p class="reception hud-text">
				<span class="diamond" aria-hidden="true"></span><span class="visually-hidden"
					>{t().shipped.labels.reception}:
				</span>{reception}
			</p>
		{/if}
	</div>

	<dl class="meta hud-text" data-row>
		<div>
			<dt>{t().shipped.labels.developer}</dt>
			<dd>{game.developer}</dd>
		</div>
		{#if game.publisher}
			<div>
				<dt>{t().shipped.labels.publisher}</dt>
				<dd>{game.publisher}</dd>
			</div>
		{/if}
		<div>
			<dt>{t().shipped.labels.platforms}</dt>
			<dd>{game.platforms.join(' · ')}</dd>
		</div>
		<div>
			<dt>{t().shipped.labels.release}</dt>
			<dd class="release">{release}</dd>
		</div>
	</dl>

	<p class="line" data-row>
		{loc(game.line)}
		{#if game.sub}<span class="sub">{loc(game.sub)}</span>{/if}
	</p>

	{#if game.steam || specSheets}
		<p class="links" data-row>
			{#if game.steam}
				<a class="cta hud-text" href={game.steam} target="_blank" rel="noopener external">
					<span class="visually-hidden">{game.title}: </span>{t().shipped.steam}<span
						class="visually-hidden"
					>
						({loc(NEW_TAB)})</span
					>
				</a>
			{/if}
			{#if specSheets}
				<a class="spec hud-text" href={langHref(`/projects/${game.slug}`)}
					>{t().shipped.specSheet}</a
				>
			{/if}
		</p>
	{/if}
</div>

<style>
	.brief {
		display: flex;
		flex-direction: column;
		gap: clamp(14px, 2.4svh, 26px);
		min-width: 0;
	}

	.kicker {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: none;
		white-space: nowrap;
	}

	.count {
		color: var(--ink);
	}

	.rule {
		flex: 1 1 auto;
		height: 1px;
		max-width: 220px;
		background: var(--graphite);
		opacity: 0.45;
	}

	/* --fs-display, wdth 70, 800: condensed and loud; long titles scale down via --k. */
	.title {
		--wdth: var(--wdth-display);
		font-size: min(calc(var(--fs-display) * var(--k, 1)), calc(13.6svh * var(--k, 1)));
		line-height: var(--lh-display);
		letter-spacing: var(--tr-display);
		font-weight: var(--fw-display);
		max-width: 11ch;
		text-wrap: balance;
	}

	.title :global(.ln) {
		white-space: nowrap;
	}

	/* Display line-height is 0.88: glyphs overflow each line box. Grow every line mask (without
	   moving the line) so descenders are not cut and hidden lines sit well clear of it. */
	.title :global(.ln-mask) {
		padding-block: 0.16em;
		margin-block: -0.16em;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 22px;
	}

	.chip {
		position: relative;
		max-width: none;
		padding: 7px 11px 6px;
		color: var(--ink);
		white-space: nowrap;
		/* The house shape: four 10px corners. */
		background:
			linear-gradient(currentColor 0 0) 0 0 / 8px 1.5px no-repeat,
			linear-gradient(currentColor 0 0) 0 0 / 1.5px 8px no-repeat,
			linear-gradient(currentColor 0 0) 100% 0 / 8px 1.5px no-repeat,
			linear-gradient(currentColor 0 0) 100% 0 / 1.5px 8px no-repeat,
			linear-gradient(currentColor 0 0) 0 100% / 8px 1.5px no-repeat,
			linear-gradient(currentColor 0 0) 0 100% / 1.5px 8px no-repeat,
			linear-gradient(currentColor 0 0) 100% 100% / 8px 1.5px no-repeat,
			linear-gradient(currentColor 0 0) 100% 100% / 1.5px 8px no-repeat;
	}

	.reception {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		max-width: none;
		color: var(--ink);
	}

	/* Waypoint diamond (§2.5 icon set). */
	.diamond {
		width: 7px;
		height: 7px;
		background: var(--signal);
		transform: rotate(45deg);
		flex: none;
	}

	.meta {
		display: grid;
		gap: 7px;
		margin: 0;
	}

	.meta div {
		display: grid;
		grid-template-columns: 12ch minmax(0, 1fr);
		gap: 12px;
	}

	dt {
		color: var(--graphite);
	}

	dd {
		margin: 0;
		color: var(--ink);
		overflow-wrap: anywhere;
	}

	.line {
		font-size: var(--fs-lede);
		line-height: var(--lh-lede);
		max-width: 30ch;
		color: var(--ink);
	}

	.sub {
		display: block;
		margin-top: 0.35em;
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1.05em;
		color: var(--graphite);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 24px;
		align-items: center;
	}

	/* Secondary CTA: bracketed rectangle, the ink fill sweeps in steps(4) on hover (§3.6). */
	.cta {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 16px;
		color: var(--ink);
		background-image:
			linear-gradient(var(--ink) 0 0), linear-gradient(currentColor 0 0),
			linear-gradient(currentColor 0 0), linear-gradient(currentColor 0 0),
			linear-gradient(currentColor 0 0), linear-gradient(currentColor 0 0),
			linear-gradient(currentColor 0 0), linear-gradient(currentColor 0 0),
			linear-gradient(currentColor 0 0);
		background-repeat: no-repeat;
		background-size:
			0% 100%,
			10px 1.5px,
			1.5px 10px,
			10px 1.5px,
			1.5px 10px,
			10px 1.5px,
			1.5px 10px,
			10px 1.5px,
			1.5px 10px;
		background-position:
			0 0,
			0 0,
			0 0,
			100% 0,
			100% 0,
			0 100%,
			0 100%,
			100% 100%,
			100% 100%;
		transition:
			background-size var(--t-fast) steps(4, end),
			color var(--t-fast) steps(4, end);
	}

	.cta:hover {
		color: var(--paper);
		background-size:
			100% 100%,
			10px 1.5px,
			1.5px 10px,
			10px 1.5px,
			1.5px 10px,
			10px 1.5px,
			1.5px 10px,
			10px 1.5px,
			1.5px 10px;
	}

	.spec {
		color: var(--signal-text);
	}

	@media (max-width: 1023px) {
		.title {
			font-size: calc(var(--fs-display) * var(--k, 1) * 1.05);
			max-width: 12ch;
		}

		.line {
			max-width: 34ch;
		}
	}

	@media (max-height: 820px) and (min-width: 1024px) {
		.brief {
			gap: 12px;
		}

		.meta {
			gap: 4px;
		}

		.line {
			font-size: calc(var(--fs-lede) * 0.92);
		}
	}
</style>
