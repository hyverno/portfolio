<!--
	07 · LOADOUT: an RPG inventory of 64px square slots, text only (no logos), grouped by rarity.
	Each slot carries a hairline in its rarity tint; the tag sits on its row. The item tooltip shows
	on hover AND keyboard focus (and on tap); each slot also carries it as its accessible
	description, so the floating card is never the only path to the information.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { collider, interact } from '#lib/core/actions';
	import { device } from '#lib/core/device.svelte';
	import { DUR, EASE, gsap, mm } from '#lib/core/motion';
	import { loadout } from '#lib/content/content';
	import type { LoadoutItem, Rarity } from '#lib/content/types';
	import { loc, t } from '#lib/i18n/index.svelte';
	import { COPY } from './tail/copy';

	const RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'common'];
	const TINT: Record<Rarity, string> = {
		legendary: '#D9A441',
		epic: '#A99AC9',
		rare: '#5B73FF',
		common: 'var(--graphite)'
	};

	const groups = RARITIES.map((r) => ({
		rarity: r,
		items: loadout.filter((i) => i.rarity === r)
	})).filter((g) => g.items.length);

	let root = $state<HTMLElement>();
	let tipEl = $state<HTMLDivElement>();
	let active = $state<{ item: LoadoutItem; idx: number } | null>(null);
	let tipX = $state(0);
	let tipY = $state(0);
	let below = $state(false);
	let mounted = $state(false);

	/** Lets `Node/Express` and `Svelte/SvelteKit` wrap after the slash (zero-width space). */
	const ZWSP = String.fromCharCode(0x200b);
	const breakable = (name: string) => name.replaceAll('/', `/${ZWSP}`);

	const tipText = (item: LoadoutItem) =>
		t().patch.loadout.tooltip(
			item.name,
			t().patch.loadout.rarityNames[item.rarity],
			loc(item.tooltip)
		);

	function show(item: LoadoutItem, idx: number, slot: HTMLElement) {
		if (!root) return;
		const r = slot.getBoundingClientRect();
		const box = root.getBoundingClientRect();
		active = { item, idx };
		tipX = r.left - box.left + r.width / 2;
		// Above the slot unless that would leave the viewport.
		below = r.top < 140;
		tipY = below ? r.bottom - box.top + 10 : r.top - box.top - 10;
	}

	function hide(idx?: number) {
		if (idx === undefined || active?.idx === idx) active = null;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') hide();
	}

	// Keep the card inside the inventory horizontally (narrow screens).
	let shiftX = $state(0);
	$effect(() => {
		void active;
		void tipX;
		if (!tipEl || !root || !active) return;
		const w = tipEl.offsetWidth;
		const max = root.clientWidth;
		const left = tipX - w / 2;
		shiftX = left < 0 ? -left : left + w > max ? max - (left + w) : 0;
	});

	onMount(() => {
		mounted = true;
		// Slots pop in like loot: `spawn`, stagger .06 across the grid; a fade under reduced motion.
		return mm(({ reduced }) => {
			const slots = root?.querySelectorAll<HTMLElement>('.slot') ?? [];
			const tags = root?.querySelectorAll<HTMLElement>('.tag') ?? [];
			const scrollTrigger = { trigger: root!, start: 'top 82%', once: true };
			if (reduced) {
				gsap.from([...tags, ...slots], { autoAlpha: 0, duration: 0.2, ease: 'none', scrollTrigger });
				return;
			}
			const tl = gsap.timeline({ scrollTrigger });
			tl.from(tags, { autoAlpha: 0, x: -8, duration: DUR.base, ease: EASE.steer, stagger: 0.06 }, 0);
			tl.from(
				slots,
				{
					scale: 0.6,
					autoAlpha: 0,
					duration: DUR.base,
					ease: EASE.spawn,
					stagger: { each: 0.035, from: 'start' }
				},
				0.08
			);
		});
	});
</script>

<svelte:window onkeydown={onKey} />

<div class="loadout" bind:this={root} role="group" aria-labelledby="loadout-title">
	<header class="loadout-head">
		<h3 id="loadout-title" class="title hud-text">{t().patch.loadout.title}</h3>
		<p class="hint micro graphite" aria-hidden="true">
			{loc(!mounted || device.finePointer ? COPY.loadoutHint : COPY.loadoutHintTouch)}
		</p>
	</header>

	<div class="tiers" role="list" aria-label={t().patch.loadout.aria} use:collider={{ pad: 10 }}>
		{#each groups as g (g.rarity)}
			<div class="tier" role="listitem" style:--tint={TINT[g.rarity]}>
				<p class="tag micro">
					<span class="swatch" aria-hidden="true"></span>
					{t().patch.loadout.rarities[g.rarity]}
				</p>
				<ul class="slots" role="list">
					{#each g.items as item (item.name)}
						{@const idx = loadout.indexOf(item)}
						<li>
							<button
								type="button"
								class="slot"
								class:on={active?.idx === idx}
								aria-describedby="loadout-desc-{idx}"
								use:interact={{ verb: loc(COPY.inspect) }}
								onpointerenter={(e) =>
									e.pointerType === 'mouse' && show(item, idx, e.currentTarget)}
								onpointerleave={(e) => e.pointerType === 'mouse' && hide(idx)}
								onfocus={(e) => show(item, idx, e.currentTarget)}
								onblur={() => hide(idx)}
								onclick={(e) =>
									active?.idx === idx && !device.finePointer
										? hide(idx)
										: show(item, idx, e.currentTarget)}
							>
								<span class="name">{breakable(item.name)}</span>
								<span class="pip" aria-hidden="true"></span>
							</button>
							<span id="loadout-desc-{idx}" class="visually-hidden">{tipText(item)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	{#if active}
		<div
			class="tip"
			class:below
			bind:this={tipEl}
			aria-hidden="true"
			style:left="{tipX}px"
			style:top="{tipY}px"
			style:--shift="{shiftX}px"
			style:--tint={TINT[active.item.rarity]}
		>
			<p class="tip-head micro">
				<span class="swatch"></span>{t().patch.loadout.rarities[active.item.rarity]}
			</p>
			<p class="tip-body">{tipText(active.item)}</p>
		</div>
	{/if}
</div>

<style>
	.loadout {
		position: relative;
	}

	.loadout-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--s-1) var(--s-3);
		padding-bottom: var(--s-2);
		margin-bottom: var(--s-3);
		border-bottom: 1px solid var(--hairline);
	}

	.title {
		font-weight: 500;
	}

	.tiers {
		display: grid;
		gap: 14px;
	}

	.tier {
		display: grid;
		grid-template-columns: 9.5rem minmax(0, 1fr);
		align-items: center;
		column-gap: var(--s-2);
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--ink);
		letter-spacing: 0.12em;
	}

	.swatch {
		display: inline-block;
		width: 8px;
		height: 8px;
		background: var(--tint);
		flex: none;
	}

	.slots {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		list-style: none;
		padding: 0;
	}

	.slot {
		position: relative;
		display: grid;
		align-content: end;
		width: 64px;
		height: 64px;
		padding: 6px;
		text-align: left;
		background: color-mix(in srgb, var(--tint) 7%, var(--paper));
		box-shadow: inset 0 0 0 1px var(--tint);
		transition:
			background-color var(--t-micro) steps(2),
			box-shadow var(--t-micro) steps(2);
	}

	/* Item names keep their real casing; condensed so `Svelte/SvelteKit` fits a 64px slot. */
	.slot .name {
		font-family: var(--font-sans);
		font-size: 11px;
		line-height: 1.1;
		font-stretch: 75%;
		font-weight: 650;
		letter-spacing: 0.005em;
		overflow-wrap: break-word;
		hyphens: none;
	}

	/* Rarity pip, top-left: the tint as a tick, like an item-frame corner. */
	.pip {
		position: absolute;
		top: 0;
		left: 0;
		width: 12px;
		height: 3px;
		background: var(--tint);
	}

	.slot:hover,
	.slot.on {
		background: color-mix(in srgb, var(--tint) 18%, var(--paper));
		box-shadow:
			inset 0 0 0 1px var(--tint),
			inset 0 0 0 2px var(--tint);
	}

	.slot:active {
		transform: translateY(1px);
	}

	.tip {
		position: absolute;
		z-index: 2;
		width: max-content;
		max-width: min(320px, 80vw);
		padding: 10px 12px 12px;
		background: var(--ink);
		color: var(--paper);
		transform: translate(calc(-50% + var(--shift, 0px)), -100%);
		pointer-events: none;
		box-shadow: inset 0 3px 0 0 var(--tint);
	}

	.tip.below {
		transform: translate(calc(-50% + var(--shift, 0px)), 0);
	}

	.tip-head {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
		color: color-mix(in srgb, var(--paper) 72%, transparent);
	}

	.tip-body {
		font-size: 0.875rem;
		line-height: 1.4;
	}

	@media (max-width: 767px) {
		.tier {
			grid-template-columns: minmax(0, 1fr);
			row-gap: 8px;
		}

		.slots {
			gap: 6px;
		}
	}
</style>
