<!--
	02 · README (§5). Theme paper.
	The hero's letters break formation into `readme-flock` (anchor declared `from: 'hero-tall'`):
	a loose murmuration in the open band above the statement. The statement's lines surface one by
	one as it scrolls through, each pulling a cluster of the flock into its box for 900ms. Then five
	counters tick up. The 6000× figure is the UE plugin's, and says so.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hudLine, themeSection, collider } from '#lib/core/actions';
	import { ScrollTrigger, mm } from '#lib/core/motion';
	import { heroStats } from '#lib/content/content';
	import { formation } from '#lib/gl/actions';
	import { fmtNum, i18n, loc, t } from '#lib/i18n/index.svelte';
	import { Counters, formatStat } from './manifesto/counters';
	import { README_FLOCK, README_FLOCK_ID } from './manifesto/formations';
	import { statement } from './manifesto/statement';

	let statsEl = $state<HTMLElement>();

	/** Reduced motion jumps the flock in when the README is well on screen; otherwise it scrubs. */
	let reduced = $state(false);
	const flock = $derived({
		id: README_FLOCK_ID,
		source: README_FLOCK,
		from: 'hero-tall',
		preset: 'calm' as const,
		start: reduced ? 'top 70%' : 'top 85%',
		end: 'top 25%'
	});

	const counters = new Counters();
	const noteIndex = heroStats.findIndex((s) => s.note);

	onMount(() => {
		const offMotion = mm((ctx) => {
			reduced = ctx.reduced;
		});
		// Plays once, on the first entry from either side; a visitor restored past the row (refresh
		// with progress > 0) gets the values ticked rather than zeros waiting above them.
		const st = ScrollTrigger.create({
			trigger: statsEl!,
			start: 'top 85%',
			end: 'bottom top',
			onToggle: () => counters.play(),
			onRefresh: (self) => void (self.progress > 0 && counters.play())
		});
		return () => {
			offMotion();
			st.kill();
			counters.dispose();
		};
	});
</script>

<section
	id="readme"
	class="readme section"
	data-section="readme"
	data-theme="paper"
	use:themeSection={'paper'}
	use:hudLine={{ section: t().readme.index, label: t().readme.hud }}
	use:formation={flock}
>
	<div class="wrap grid">
		<p class="index hud-text graphite" data-flock-avoid>{t().readme.index}</p>

		<!-- The open band the letters pour into: the flock's home. -->
		<div class="zone" data-flock-zone aria-hidden="true"></div>
		<p class="visually-hidden gl-only">{t().readme.canvas}</p>

		{#key i18n.lang}
			<h2 class="statement t-h1" data-flock-avoid use:collider={{ pad: 10 }} use:statement>
				{t().readme.statement.pre}<em class="serif">{t().readme.statement.em}</em>{t().readme
					.statement.post}
			</h2>
		{/key}

		<div class="figures" bind:this={statsEl}>
			{#key i18n.lang}
				<dl class="stats" aria-label={t().readme.statsAria} data-flock-avoid use:collider={{ pad: 8 }}>
					{#each heroStats as s, i (s.label.en)}
						{@const final = formatStat(s, s.value, fmtNum)}
						<div class="stat">
							<dt class="label hud-text graphite">
								{loc(s.label)}{#if s.note}<sup aria-hidden="true">*</sup>{/if}
							</dt>
							<dd class="value" aria-describedby={s.note ? 'readme-note' : undefined}>
								{#if s.prefix}<span class="affix">{s.prefix}</span>{/if}<span
									class="num"
									style:min-width="{final.length}ch"
									use:counters.counter={{
										index: i,
										to: s.value,
										format: (v: number) => formatStat(s, v, fmtNum)
									}}>{final}</span
								>{#if s.suffix}<span class="affix">{s.suffix}</span>{/if}
							</dd>
						</div>
					{/each}
				</dl>
				{#if noteIndex >= 0}
					<p class="note micro graphite" id="readme-note" data-flock-avoid>
						<span aria-hidden="true">*</span>
						{loc(heroStats[noteIndex].note!)}
					</p>
				{/if}
			{/key}
		</div>
	</div>
</section>

<style>
	.readme {
		position: relative;
	}

	.grid {
		row-gap: 0;
	}

	.index {
		grid-column: 1 / -1;
		margin: 0;
	}

	.zone {
		grid-column: 1 / -1;
		height: clamp(200px, 34svh, 380px);
		pointer-events: none;
	}

	/* No crowd, no flock: the band would only read as a gap. */
	:global(html.no-webgl) .zone,
	:global(html:not(.js)) .zone {
		height: var(--s-5);
	}

	.statement {
		grid-column: 2 / 12;
		margin: 0;
		max-width: none;
	}

	.figures {
		grid-column: 2 / -1;
		margin-top: clamp(56px, 9svh, 112px);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		column-gap: var(--gutter);
		row-gap: var(--s-4);
		margin: 0;
	}

	.stat {
		display: flex;
		flex-direction: column-reverse;
		justify-content: flex-end;
		gap: var(--s-1);
		padding-top: var(--s-2);
		border-top: 1px solid var(--hairline);
	}

	.label {
		max-width: 16ch;
	}

	.label sup {
		margin-left: 0.15em;
		font-size: 0.8em;
		vertical-align: 0.35em;
		line-height: 0;
		color: var(--signal-text);
	}

	.value {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--fs-h2);
		font-weight: 500;
		font-stretch: 87.5%;
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		font-feature-settings: 'tnum' 1;
		white-space: nowrap;
	}

	/* A fixed field, digits filling from the right like an odometer: nothing shifts while it ticks. */
	.num {
		display: inline-block;
		text-align: right;
	}

	.affix {
		color: var(--graphite);
	}

	.note {
		margin-top: var(--s-3);
		max-width: 60ch;
	}

	.note span {
		color: var(--signal-text);
	}

	@media (max-width: 1023px) {
		.statement,
		.figures {
			grid-column: 1 / -1;
		}
	}

	/* Phones: the stats wrap 2 + 3. */
	@media (max-width: 767px) {
		.stats {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}

		.stat {
			grid-column: span 2;
		}

		.stat:nth-child(-n + 2) {
			grid-column: span 3;
		}
	}
</style>
