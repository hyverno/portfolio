<!-- A chart symbol as inline SVG (legend, PDF sheet): same shapes as chart.ts, never a font glyph. -->
<script lang="ts">
	import type { SymbolKind } from './palette.ts';

	let { kind, size = 10 }: { kind: SymbolKind; size?: number } = $props();
</script>

<svg
	class="sym"
	width={size}
	height={size}
	viewBox="0 0 10 10"
	aria-hidden="true"
	fill="currentColor"
	stroke="currentColor"
	stroke-width="1.5"
>
	{#if kind === 'disc'}
		<circle cx="5" cy="5" r="4.1" stroke="none" />
	{:else if kind === 'ring'}
		<circle cx="5" cy="5" r="3.3" fill="none" />
	{:else if kind === 'tri'}
		<path d="M5 0.6 L9.6 8.9 L0.4 8.9 Z" stroke="none" />
	{:else if kind === 'triOpen'}
		<path d="M5 1.6 L8.7 8.2 L1.3 8.2 Z" fill="none" stroke-linejoin="miter" />
	{:else if kind === 'square'}
		<rect x="1.1" y="1.1" width="7.8" height="7.8" stroke="none" />
	{:else if kind === 'squareOpen'}
		<rect x="1.85" y="1.85" width="6.3" height="6.3" fill="none" />
	{:else if kind === 'diamond'}
		<path d="M5 0 L10 5 L5 10 L0 5 Z" stroke="none" />
	{:else if kind === 'diamondOpen'}
		<path d="M5 1.1 L8.9 5 L5 8.9 L1.1 5 Z" fill="none" />
	{:else if kind === 'plus'}
		<path d="M3.7 0.7 H6.3 V3.7 H9.3 V6.3 H6.3 V9.3 H3.7 V6.3 H0.7 V3.7 H3.7 Z" stroke="none" />
	{:else}
		<path d="M1.7 1.7 L8.3 8.3 M8.3 1.7 L1.7 8.3" fill="none" stroke-linecap="square" />
	{/if}
</svg>

<style>
	.sym {
		display: block;
		flex: none;
		overflow: visible;
	}
</style>
