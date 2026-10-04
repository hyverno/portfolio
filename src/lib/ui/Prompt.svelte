<!-- Lock-on prompt `[E] VERB` (§3.5), Martian micro. Decorative: the keyboard path is E / Enter. -->
<script lang="ts">
	import Keycap from './Keycap.svelte';

	let { verb }: { verb: string } = $props();
</script>

<span class="prompt micro" aria-hidden="true">
	<Keycap key="E" size="micro" active />
	<span class="verb">{verb}</span>
</span>

<style>
	.prompt {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 7px 3px 3px;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--ink);
		white-space: nowrap;
	}

	.verb {
		padding-top: 1px;
	}
</style>
