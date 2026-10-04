<!-- A decorative "bitten" blob (DESIGN.md §5 04c): a seeded superellipse with 1–3 circular bites. -->
<script lang="ts">
	import { blob, stream } from './bites';

	interface Props {
		seed: number;
		salt: number;
		w?: number;
		h?: number;
		fill?: string;
	}

	let { seed, salt, w = 64, h = 40, fill = 'var(--r-apricot)' }: Props = $props();

	const uid = $props.id();
	const shape = $derived(blob(stream(seed, salt), w, h));
</script>

<svg class="blob" viewBox="0 0 {w} {h}" width={w} height={h} aria-hidden="true">
	<mask id="{uid}-m" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
		<rect width={w} height={h} fill="#fff" />
		{#each shape.bites as b, i (i)}
			<circle cx={b.x} cy={b.y} r={b.r} fill="#000" />
		{/each}
	</mask>
	<path d={shape.d} {fill} mask="url(#{uid}-m)" />
</svg>

<style>
	.blob {
		display: block;
		flex: none;
		overflow: visible;
	}
</style>
