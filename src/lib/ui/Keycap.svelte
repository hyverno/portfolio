<!-- Keycap `[1]` (§2.5). Display only: wrap it in a button when it is a control. -->
<script lang="ts">
	interface Props {
		key: string;
		active?: boolean;
		/** Gold rim (#1,445 unlocked on the [4] IDS key). */
		gold?: boolean;
		size?: 'hud' | 'micro';
	}

	let { key, active = false, gold = false, size = 'hud' }: Props = $props();
</script>

<kbd class="keycap {size}" class:active class:gold aria-hidden="true">{key}</kbd>

<style>
	.keycap {
		display: inline-grid;
		place-items: center;
		min-width: 1.9em;
		height: 1.9em;
		padding: 0 0.4em;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		line-height: 1;
		color: var(--ink);
		border: 1px solid currentColor;
		/* A 2px "travel" edge: the key reads as pressable without a shadow. */
		box-shadow: 0 1.5px 0 0 currentColor;
		transform: translateY(0);
		transition:
			transform var(--t-ack) linear,
			box-shadow var(--t-ack) linear,
			background-color var(--t-micro) steps(2),
			color var(--t-micro) steps(2);
	}

	.hud {
		font-size: var(--fs-hud);
	}

	.micro {
		font-size: var(--fs-micro);
		min-width: 1.8em;
		height: 1.8em;
	}

	.active {
		background: var(--ink);
		color: var(--paper);
		border-color: var(--ink);
		box-shadow: 0 0 0 0 var(--ink);
		transform: translateY(1.5px);
	}

	.gold {
		border-color: #d9a441;
		box-shadow:
			0 1.5px 0 0 #d9a441,
			0 0 0 1px #d9a441;
	}

	.gold.active {
		box-shadow: 0 0 0 1px #d9a441;
	}
</style>
