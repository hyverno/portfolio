<!--
	06 · CONTRACTS (theme paper). "Parties I've joined." A quest log: CLIENT · ROLE · STACK · STATUS,
	then a smaller community log. The horizontal rules are entities ('contracts-rules', measured
	from the live table); hovering a row pulls them into an AABB around it and widens the name.
	Mobile and the static build draw the rules as dotted CSS. Restraint: no achievement here.
	OVHcloud is a bare name with role MISSION and nothing else, anywhere.
-->
<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { collider, hudLine, reveal, themeSection } from '#lib/core/actions';
	import { device } from '#lib/core/device.svelte';
	import { DUR, EASE, STAGGER, ScrollTrigger, gsap, mm } from '#lib/core/motion';
	import { formation } from '#lib/gl/actions';
	import { contracts, volunteer } from '#lib/content/content';
	import { i18n, loc, t } from '#lib/i18n/index.svelte';
	import { COPY } from './tail/copy';
	import { tailEngine, trackPageHeight, watchLayout, type TailCrowd } from './tail/crowd';
	import { CONTRACTS_RULES, RULES_ID, contractsRules } from './tail/formations';

	// Hover (§3.6): the row's rule entities spread into an AABB around it (480ms `steer`, the
	// crowd's attractor tween). The box is inset so the rule ends fold into bracket legs, and the
	// attractor's reach is narrowed meanwhile so the neighbouring rules stay where they are.
	const HOVER_PAD_Y = 12;
	const HOVER_INSET_X = 44;
	const HOVER_STRENGTH = 0.9;
	/** World units (default 0.45): less than one row, so only this row's rules answer. */
	const HOVER_RANGE = 0.16;

	let ledger = $state<HTMLElement>();
	let engineOk = $state(false);
	let crowd: TailCrowd | null = null;

	/** The rules are entities on desktop when the engine runs; dotted CSS otherwise. */
	const crowdRules = $derived(engineOk && !device.mobile);
	const cols = $derived(t().contracts.columns);
	const ccols = $derived(t().contracts.community.columns);

	let savedRange: number | null = null;
	let rangeTimer: ReturnType<typeof setTimeout> | undefined;

	function setRange(v: number | null) {
		const u = crowd?.U.uAttractRange;
		if (!u) return;
		if (v === null) {
			if (savedRange !== null) u.value = savedRange;
			savedRange = null;
			return;
		}
		savedRange ??= u.value as number;
		u.value = v;
	}

	function rowEnter(e: PointerEvent) {
		if (!crowdRules || !crowd || e.pointerType === 'touch') return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		clearTimeout(rangeTimer);
		setRange(HOVER_RANGE);
		crowd.attract(
			0,
			new DOMRectReadOnly(
				r.left + HOVER_INSET_X,
				r.top - HOVER_PAD_Y,
				Math.max(1, r.width - HOVER_INSET_X * 2),
				r.height + HOVER_PAD_Y * 2
			),
			{ mode: 'perimeter', strength: HOVER_STRENGTH }
		);
	}

	function rowLeave() {
		if (!crowd || savedRange === null) return;
		crowd.attract(0, null);
		clearTimeout(rangeTimer);
		// Keep the narrow reach while the attractor fades out (480ms), then restore it.
		rangeTimer = setTimeout(() => setRange(null), 520);
	}

	/**
	 * The name widens to wdth 100 on hover. A name that would re-wrap when wider (e.g.
	 * "Stoetzel Sonorisation") is held at its wide line breaks at rest too, so a hover never
	 * changes the row height (the rules are baked from it).
	 */
	function fitNames() {
		if (!ledger) return;
		for (const name of ledger.querySelectorAll<HTMLElement>('.quest .name')) {
			const cell = name.parentElement;
			if (!cell) continue;
			name.style.maxWidth = '';
			const probe = name.cloneNode(true) as HTMLElement;
			probe.removeAttribute('data-reveal');
			probe.setAttribute('aria-hidden', 'true');
			probe.style.cssText =
				'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;max-width:none;transition:none;--wdth:100';
			cell.appendChild(probe);
			const full = probe.getBoundingClientRect().width;
			let widest = 0;
			for (const word of (name.textContent ?? '').trim().split(/\s+/)) {
				probe.textContent = word;
				widest = Math.max(widest, probe.getBoundingClientRect().width);
			}
			probe.remove();
			if (full > cell.clientWidth) name.style.maxWidth = `${Math.ceil(widest) + 2}px`;
		}
	}

	// A language switch reflows the table: refit the names and re-bake the rules from the new layout.
	let lastLang = i18n.lang;
	$effect(() => {
		const lang = i18n.lang;
		untrack(() => {
			if (lang === lastLang) return;
			lastLang = lang;
			void tick().then(() => {
				fitNames();
				if (crowd && ledger && crowdRules)
					void crowd.define(RULES_ID, contractsRules(), { el: ledger, space: 'page' });
			});
		});
	});

	onMount(() => {
		let alive = true;
		fitNames();
		const offLayout = ledger ? watchLayout([ledger], fitNames, 120) : () => {};

		let offHeight = () => {};
		void tailEngine().then((h) => {
			if (!alive || !h) return;
			crowd = h.crowd;
			engineOk = true;
			offHeight = trackPageHeight(h.crowd);
		});

		// Leaving the section always lets go of the row (no pointerleave while wheel-scrolling).
		const exit = ledger
			? ScrollTrigger.create({
					trigger: ledger,
					start: 'top bottom',
					end: 'bottom top',
					onToggle: (self) => !self.isActive && rowLeave()
				})
			: null;

		// Rows reveal (stagger .06) by their contents, never the rows themselves: the rule
		// formation measures the rows, so they must not be offset by a transform at bake time.
		const offReveal = mm(({ reduced }) => {
			const tables = ledger?.querySelectorAll<HTMLElement>('[data-ledger]') ?? [];
			for (const table of tables) {
				const rows = [...table.querySelectorAll<HTMLElement>('tbody [data-ledger-row]')];
				const cells = rows.map((r) => r.querySelectorAll<HTMLElement>('[data-reveal]'));
				const head = table.querySelectorAll<HTMLElement>('thead [data-reveal]');
				const checks = table.querySelectorAll<SVGPathElement>('.check path');
				const scrollTrigger = { trigger: table, start: 'top 82%', once: true };
				if (reduced) {
					gsap.from([...head, ...cells.flatMap((c) => [...c])], {
						autoAlpha: 0,
						duration: 0.2,
						ease: 'none',
						scrollTrigger
					});
					continue;
				}
				const tl = gsap.timeline({ scrollTrigger });
				tl.from(head, { autoAlpha: 0, duration: DUR.base, ease: 'none' }, 0);
				cells.forEach((c, i) => {
					tl.from(
						c,
						{ yPercent: 40, autoAlpha: 0, duration: DUR.reveal, ease: EASE.steer, stagger: 0.03 },
						0.1 + i * STAGGER.rows
					);
				});
				if (checks.length) {
					// The ✓ strokes draw on (280ms) as their row lands.
					tl.fromTo(
						checks,
						{ strokeDashoffset: 1 },
						{ strokeDashoffset: 0, duration: 0.28, ease: EASE.steer, stagger: STAGGER.rows },
						0.1 + DUR.reveal * 0.6
					);
				}
			}
		});

		return () => {
			alive = false;
			offHeight();
			offLayout();
			exit?.kill();
			offReveal();
			clearTimeout(rangeTimer);
			// Only let go of attractor 0 if this section is the one holding it.
			if (savedRange !== null) crowd?.attract(0, null);
			setRange(null);
		};
	});
</script>

<section
	id="contracts"
	data-section="contracts"
	data-theme="paper"
	class="section contracts"
	use:themeSection={'paper'}
	use:hudLine={{ section: t().contracts.index.slice(0, 2), label: t().contracts.hud }}
>
	<div class="wrap">
		<header class="head grid">
			<p class="index hud-text graphite">{t().contracts.index}</p>
			<h2
				class="headline t-display"
				use:reveal={{ mode: 'lines', widthMarch: true }}
				use:collider={{ pad: 8 }}
			>
				{t().contracts.headline}
			</h2>
		</header>

		<div class="ledger" class:crowd={crowdRules} bind:this={ledger}>
			{#if crowdRules && ledger}
				<div
					class="anchor"
					aria-hidden="true"
					use:formation={{ id: RULES_ID, source: CONTRACTS_RULES, region: ledger }}
				></div>
			{/if}

			<!-- svelte-ignore a11y_no_redundant_roles -->
			<table class="log quest" data-ledger="major" role="table">
				<caption class="visually-hidden">{loc(COPY.ledgerCaption)}</caption>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<thead role="rowgroup">
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<tr class="row head-row" data-ledger-row role="row">
						<th class="c-client hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{cols.client}</span>
						</th>
						<th class="c-role hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{cols.role}</span>
						</th>
						<th class="c-stack hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{cols.stack}</span>
						</th>
						<th class="c-status hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{cols.status}</span>
						</th>
					</tr>
				</thead>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<tbody role="rowgroup">
					{#each contracts as c (c.name)}
						<!-- svelte-ignore a11y_no_redundant_roles -->
						<tr
							class="row"
							data-ledger-row
							role="row"
							onpointerenter={rowEnter}
							onpointerleave={rowLeave}
							use:collider
						>
							<th class="c-client" scope="row" role="rowheader">
								<span class="name" data-reveal>{c.label ? loc(c.label) : c.name}</span>
							</th>
							<td class="c-role" role="cell">
								<span class="label micro graphite" aria-hidden="true">{cols.role}</span>
								<span class="role" data-reveal>{loc(c.role)}</span>
							</td>
							<td class="c-stack" role="cell">
								<span class="label micro graphite" aria-hidden="true">{cols.stack}</span>
								<span class="stack hud-text" class:graphite={!c.stack} data-reveal>
									{c.stack ?? t().contracts.none}
								</span>
							</td>
							<td class="c-status" role="cell">
								<span class="label micro graphite" aria-hidden="true">{cols.status}</span>
								<span class="check" role="img" aria-label={t().contracts.doneAria} data-reveal>
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path d="M4.5 12.5l5 5L19.5 6.5" pathLength="1" />
									</svg>
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<h3 class="community-title hud-text">{t().contracts.community.title}</h3>

			<!-- svelte-ignore a11y_no_redundant_roles -->
			<table class="log community" data-ledger="minor" role="table">
				<caption class="visually-hidden">{loc(COPY.communityCaption)}</caption>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<thead role="rowgroup">
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<tr class="row head-row" data-ledger-row role="row">
						<th class="v-name hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{ccols.name}</span>
						</th>
						<th class="v-what hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{ccols.what}</span>
						</th>
						<th class="v-when hud-text graphite" scope="col" role="columnheader">
							<span data-reveal>{ccols.when}</span>
						</th>
					</tr>
				</thead>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<tbody role="rowgroup">
					{#each volunteer as v (v.name)}
						<!-- svelte-ignore a11y_no_redundant_roles -->
						<tr
							class="row"
							data-ledger-row
							role="row"
							onpointerenter={rowEnter}
							onpointerleave={rowLeave}
							use:collider
						>
							<th class="v-name" scope="row" role="rowheader">
								<span class="vname" data-reveal>{v.name}</span>
							</th>
							<td class="v-what" role="cell">
								<span class="label micro graphite" aria-hidden="true">{ccols.what}</span>
								<span data-reveal>{loc(v.what)}</span>
							</td>
							<td class="v-when" role="cell">
								<span class="label micro graphite" aria-hidden="true">{ccols.when}</span>
								<span class="hud-text" data-reveal>{loc(v.when)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<style>
	.contracts {
		/* Dotted rule tile (static build, mobile, and before the engine is known). */
		--dot: radial-gradient(circle at 1.5px 1.5px, var(--ink) 1.05px, transparent 1.45px);
	}

	.head {
		row-gap: var(--s-3);
		margin-bottom: clamp(48px, 7vw, 104px);
	}

	.index {
		grid-column: 1 / -1;
	}

	.headline {
		grid-column: 1 / -1;
		max-width: 14ch;
	}

	.ledger {
		position: relative;
	}

	.anchor {
		position: absolute;
		inset: 0 0 auto 0;
		height: 1px;
		pointer-events: none;
	}

	/* ── table → grid rows (roles keep the table semantics) ───────────────────── */
	.log,
	.log thead,
	.log tbody,
	.log caption {
		display: block;
		width: 100%;
	}

	.log {
		border-collapse: collapse;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: var(--gutter);
		align-items: baseline;
		/* Static rules: one dotted row under every row, two under the header and the last row. */
		background: var(--dot) 0 100% / 6px 3px repeat-x;
	}

	.head-row,
	tbody .row:last-child {
		background:
			var(--dot) 0 100% / 6px 3px repeat-x,
			var(--dot) 3px calc(100% - 4px) / 6px 3px repeat-x;
	}

	/* Entity rules: the crowd draws them. */
	.ledger.crowd .row {
		background: none;
	}

	.log th,
	.log td {
		display: block;
		text-align: left;
		font-weight: inherit;
		padding: 0;
		min-width: 0;
	}

	.head-row {
		padding-bottom: 18px;
	}

	.label {
		display: none;
	}

	/* quest log */
	.quest tbody .row {
		padding-block: clamp(20px, 2.2vw, 36px) clamp(22px, 2.4vw, 40px);
	}

	.c-client {
		grid-column: 1 / 7;
	}
	.c-role {
		grid-column: 7 / 10;
	}
	.c-stack {
		grid-column: 10 / 12;
	}
	.c-status {
		grid-column: 12 / 13;
		justify-self: end;
	}

	.name {
		--wdth: var(--wdth-h1);
		display: inline-block;
		font-size: var(--fs-h1);
		line-height: var(--lh-h1);
		letter-spacing: var(--tr-h1);
		font-weight: var(--fw-h1);
		font-stretch: calc(var(--wdth) * 1%);
		text-wrap: balance;
		transition: --wdth var(--t-base) var(--ease-steer);
	}

	@media (hover: hover) and (pointer: fine) {
		.quest tbody .row:hover .name {
			--wdth: 100;
		}
	}

	.role {
		display: block;
		font-size: var(--fs-body);
		line-height: 1.4;
		max-width: 30ch;
		text-wrap: pretty;
	}

	.stack {
		display: block;
	}

	.check {
		display: inline-grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--ink);
		transform: translateY(6px);
	}

	.check svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: var(--ink);
		stroke-width: 2.2;
		stroke-linecap: square;
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}

	/* community log */
	.community-title {
		margin: clamp(80px, 10vw, 152px) 0 var(--s-3);
		font-weight: 500;
	}

	.community tbody .row {
		padding-block: clamp(16px, 1.8vw, 26px);
	}

	.v-name {
		grid-column: 1 / 5;
	}
	.v-what {
		grid-column: 5 / 11;
	}
	.v-when {
		grid-column: 11 / 13;
		justify-self: end;
		text-align: right;
	}

	.vname {
		--wdth: var(--wdth-h2);
		display: inline-block;
		font-size: var(--fs-h2);
		line-height: var(--lh-h2);
		font-weight: var(--fw-h2);
		font-stretch: calc(var(--wdth) * 1%);
		text-wrap: balance;
	}

	.v-what span[data-reveal] {
		display: block;
		max-width: 52ch;
		text-wrap: pretty;
	}

	.v-when .hud-text {
		white-space: nowrap;
	}

	/* ── tablet: 8 columns ────────────────────────────────────────────────────── */
	@media (min-width: 768px) and (max-width: 1023px) {
		.row {
			grid-template-columns: repeat(8, minmax(0, 1fr));
		}
		.c-client {
			grid-column: 1 / 5;
		}
		.c-role {
			grid-column: 5 / 7;
		}
		.c-stack {
			grid-column: 7 / 8;
		}
		.c-status {
			grid-column: 8 / 9;
		}
		.v-name {
			grid-column: 1 / 4;
		}
		.v-what {
			grid-column: 4 / 7;
		}
		.v-when {
			grid-column: 7 / 9;
		}
	}

	/* ── mobile: rows stack as cards, the rules stay dotted CSS ─────────────────── */
	@media (max-width: 767px) {
		.head-row {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}

		.row {
			grid-template-columns: minmax(0, 1fr) auto;
			row-gap: 10px;
			align-items: start;
		}

		tbody .row:first-child {
			background:
				var(--dot) 0 0 / 6px 3px repeat-x,
				var(--dot) 0 100% / 6px 3px repeat-x;
		}

		.quest tbody .row,
		.community tbody .row {
			padding-block: 22px 26px;
		}

		.label {
			display: block;
			margin-bottom: 2px;
		}

		.c-client,
		.v-name {
			grid-column: 1 / -1;
		}

		.c-role,
		.v-what {
			grid-column: 1 / -1;
		}

		.c-stack,
		.v-when {
			grid-column: 1 / 2;
			justify-self: start;
			text-align: left;
		}

		.c-status {
			grid-column: 2 / 3;
			grid-row: 3;
			align-self: end;
		}

		.name {
			font-size: clamp(2.25rem, 1.2rem + 5vw, 3rem);
		}

		.check {
			transform: none;
		}

		.community-title {
			margin-top: 72px;
		}
	}
</style>
