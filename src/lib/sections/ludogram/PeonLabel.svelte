<!--
	`PEON #4471 (DISPENSABLE)`: a live label riding the one signal entity of the city. The parent
	moves the 0×0 anchor onto the peon every frame (crowd.named('peon')); a target ring sits on the
	peon and the tag hangs in the empty sky on a leader line, clear of the horde (up-left on a wide
	stage, straight up on a narrow one). Clicking it (or E while locked on) despawns the peon: the
	parent bursts crits and sends the next one. A real button, so the keyboard path is the same.
-->
<script lang="ts">
	import { interact } from '#lib/core/actions';
	import { t } from '#lib/i18n/index.svelte';

	interface Props {
		id: number;
		/** True between the despawn and the next peon arriving. */
		gone: boolean;
		ondespawn: () => void;
	}

	let { id, gone, ondespawn }: Props = $props();
</script>

<span class="ring" class:gone aria-hidden="true"></span>
<span class="leader wide" class:gone aria-hidden="true">
	<svg viewBox="0 0 44 58" width="44" height="58"><path d="M0.5 0.5 H12 L39 53" /></svg>
</span>
<span class="leader narrow" class:gone aria-hidden="true"></span>
<button
	class="tag micro"
	class:gone
	type="button"
	use:interact={{ verb: t().cursor.verbs.despawn }}
	onclick={() => !gone && ondespawn()}
>
	<span class="visually-hidden">{t().shipped.peon.aria}: </span>{t().shipped.peon.label(String(id))}
</button>

<style>
	.ring {
		position: absolute;
		left: -8px;
		top: -8px;
		width: 16px;
		height: 16px;
		border: 1px solid var(--signal);
		border-radius: 50%;
		pointer-events: none;
		transition: opacity var(--t-fast) var(--ease-despawn);
	}

	.leader {
		position: absolute;
		pointer-events: none;
		transition: opacity var(--t-fast) var(--ease-despawn);
	}

	.leader.wide {
		right: 3px;
		bottom: 3px;
		width: 44px;
		height: 58px;
	}

	.leader.narrow {
		display: none;
		left: -0.5px;
		bottom: 9px;
		width: 1px;
		height: 30px;
		background: var(--signal);
	}

	.leader svg {
		display: block;
		overflow: visible;
	}

	.leader path {
		fill: none;
		stroke: var(--signal);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.tag {
		position: absolute;
		right: 47px;
		bottom: 48px;
		min-height: 26px;
		padding: 7px 9px 6px;
		color: var(--signal-text);
		background: var(--paper);
		white-space: nowrap;
		cursor: pointer;
		letter-spacing: var(--tr-micro);
		transition:
			opacity var(--t-fast) var(--ease-despawn),
			scale var(--t-fast) var(--ease-steer);
	}

	.tag::before {
		content: '';
		position: absolute;
		inset: 0;
		border: 1px solid currentColor;
		opacity: 0.55;
		pointer-events: none;
	}

	.tag:hover::before,
	.tag:focus-visible::before {
		opacity: 1;
	}

	.tag:active {
		scale: 0.94;
	}

	/* Narrow stage (phones): the peon sits left of centre, so the tag goes up and to the right,
	   above the rooftops and the flag, on a tall vertical leader. */
	@container (max-width: 560px) {
		.leader.wide {
			display: none;
		}

		.leader.narrow {
			display: block;
			height: 104px;
		}

		.tag {
			right: auto;
			left: -18px;
			bottom: 113px;
		}
	}

	.gone {
		opacity: 0;
		pointer-events: none;
	}
</style>
