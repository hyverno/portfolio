<!--
	08 · The co-op lobby: four player slots in a row (2×2 on mobile). P1 HYVERNO is READY (lime
	LED); P2 is you, blinking [PRESS START] (steps(2) at 1Hz, static under reduced motion) until you
	press it, which opens the mail composer and flips you to READY. P3 and P4 wait, empty.
	The 'contact-ring' formation circles this box (the parent owns it; `el` is its region).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { collider, interact } from '#lib/core/actions';
	import { DUR, EASE, STAGGER, gsap, mm } from '#lib/core/motion';
	import { t } from '#lib/i18n/index.svelte';

	interface Props {
		/** The lobby box (the ring's region). */
		el?: HTMLElement;
		/** P2 has pressed start (or copied the email). */
		joined?: boolean;
		mailto: string;
		onjoin?: () => void;
	}

	let { el = $bindable(), joined = false, mailto, onjoin }: Props = $props();

	const lobby = $derived(t().contact.lobby);

	onMount(() => {
		// Players drop into their slots: `spawn`, stagger .06 (a fade under reduced motion).
		return mm(({ reduced }) => {
			const slots = el?.querySelectorAll<HTMLElement>('[data-slot]') ?? [];
			const scrollTrigger = { trigger: el!, start: 'top 85%', once: true };
			if (reduced) {
				gsap.from(slots, { autoAlpha: 0, duration: 0.2, ease: 'none', scrollTrigger });
				return;
			}
			gsap.from(slots, {
				y: 18,
				autoAlpha: 0,
				duration: DUR.base,
				ease: EASE.spawn,
				stagger: STAGGER.cells,
				scrollTrigger
			});
		});
	});
</script>

<div class="lobby" bind:this={el} role="group" aria-label={lobby.aria}>
	<!-- Static build: the ring the crowd would form, as a dotted stadium. -->
	<span class="ring-css static-only" aria-hidden="true"></span>
	<ol class="slots" role="list">
		<li class="slot host" data-slot use:collider={{ pad: 4 }}>
			<span class="pn mono">{lobby.slot('1')}</span>
			<span class="who">{lobby.host}</span>
			<span class="state hud-text"><span class="led" aria-hidden="true"></span>[{lobby.ready}]</span>
		</li>

		<li class="slot you" class:joined data-slot use:collider={{ pad: 4 }}>
			<a
				class="join"
				href={mailto}
				use:interact={{ verb: t().cursor.verbs.start }}
				onclick={() => onjoin?.()}
			>
				<span class="corners" aria-hidden="true"></span>
				<span class="pn mono">{lobby.slot('2')}</span>
				<span class="who">{lobby.you}</span>
				{#if joined}
					<span class="state hud-text"><span class="led" aria-hidden="true"></span>[{lobby.ready}]</span>
				{:else}
					<span class="state hud-text blink">[{lobby.pressStart}]</span>
				{/if}
			</a>
		</li>

		{#each ['3', '4'] as n (n)}
			<li class="slot empty" data-slot>
				<span class="pn mono">{lobby.slot(n)}</span>
				<span class="who empty-label hud-text">{lobby.empty}</span>
			</li>
		{/each}
	</ol>
</div>

<style>
	.lobby {
		position: relative;
	}

	.ring-css {
		position: absolute;
		inset: -30px;
		border: 2px dotted color-mix(in srgb, var(--ink) 55%, transparent);
		border-radius: 999px;
		pointer-events: none;
	}

	.slots {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: clamp(8px, 1vw, 14px);
		list-style: none;
		padding: 0;
	}

	.slot {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 7.25rem;
		padding: 12px 14px 12px;
		border: 1px solid var(--hairline);
		background: var(--paper);
	}

	.host {
		border-color: color-mix(in srgb, var(--ink) 55%, transparent);
	}

	.pn {
		font-size: var(--fs-micro);
		letter-spacing: var(--tr-micro);
		color: var(--graphite);
	}

	.who {
		--wdth: 88;
		align-self: center;
		font-family: var(--font-sans);
		font-size: var(--fs-h3);
		line-height: 1.05;
		font-weight: 700;
		font-stretch: 88%;
		letter-spacing: 0.01em;
		overflow-wrap: anywhere;
	}

	.state {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}

	.led {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--debug-lime);
		flex: none;
	}

	/* P2: the selectable slot (house brackets instead of a border) and the whole slot is the link. */
	.you {
		border-color: transparent;
		padding: 0;
	}

	.join {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100%;
		padding: 12px 14px;
		color: var(--ink);
		background: none;
		transition: background-color var(--t-fast) steps(4);
	}

	.corners {
		--c: var(--ink);
		--l: var(--bracket);
		--w: var(--bracket-w);
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(var(--c) 0 0) 0 0 / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 0 / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 0 / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 0 100% / var(--w) var(--l) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--l) var(--w) no-repeat,
			linear-gradient(var(--c) 0 0) 100% 100% / var(--w) var(--l) no-repeat;
		transition: inset var(--t-fast) var(--ease-steer);
	}

	.join:hover .corners,
	.join:focus-visible .corners {
		inset: -6px;
	}

	.join:hover {
		background: color-mix(in srgb, var(--ink) 6%, transparent);
	}

	.blink {
		color: var(--signal-text);
		animation: blink 1s steps(2, jump-none) infinite;
	}

	@keyframes blink {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	.joined .who {
		color: var(--ink);
	}

	.empty {
		border-style: dashed;
		color: var(--graphite);
	}

	.empty-label {
		justify-self: start;
		font-family: var(--font-mono);
		font-size: var(--fs-hud);
		font-weight: var(--fw-hud);
		letter-spacing: var(--tr-hud);
	}

	@media (max-width: 767px) {
		.slots {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.slot {
			min-height: 6.25rem;
			padding: 10px 12px;
		}

		.join {
			padding: 10px 12px;
		}

		.state {
			white-space: normal;
		}
	}
</style>
