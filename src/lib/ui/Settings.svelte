<!--
	⚙ popover (§5.10): Quality AUTO/LOW/MED/HIGH, Motion FULL/REDUCED, Toasts ON/OFF, SFX
	(panel in SettingsPanel.svelte, fetched on hover / focus / first open).
	Non-modal: Escape or a click outside closes it and focus returns to ⚙.
-->
<script lang="ts">
	import { tick, type Component } from 'svelte';
	import { t } from '#lib/i18n/index.svelte';
	import { sfx } from './sfx';

	interface Props {
		go: (id: string, e: MouseEvent) => void;
		navHref: (id: string) => string;
	}

	let { go, navHref }: Props = $props();

	const id = 'hud-settings';

	type PanelProps = {
		id: string;
		close: (refocus?: boolean) => void;
		go: Props['go'];
		navHref: Props['navHref'];
		el?: HTMLDivElement;
	};

	let open = $state(false);
	let button = $state<HTMLButtonElement>();
	let panel = $state<HTMLDivElement>();
	let Panel = $state<Component<PanelProps, object, 'el'>>();
	let loading: Promise<void> | null = null;

	function load(): Promise<void> {
		loading ??= import('./SettingsPanel.svelte').then((m) => void (Panel = m.default));
		return loading;
	}

	function close(refocus = true) {
		open = false;
		if (refocus) button?.focus();
	}

	async function toggle() {
		sfx('tick');
		if (!open) await load().catch(() => {});
		open = !open && !!Panel;
	}

	$effect(() => {
		if (!open) return;
		void tick().then(() =>
			panel?.querySelector<HTMLElement>('[aria-pressed="true"], button')?.focus()
		);
		const onDown = (e: PointerEvent) => {
			const target = e.target as Node;
			if (!panel?.contains(target) && !button?.contains(target)) close(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		document.addEventListener('pointerdown', onDown, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown, true);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<button
	class="gear hud-text"
	bind:this={button}
	aria-expanded={open}
	aria-controls={id}
	aria-label={t().settings.open}
	onclick={toggle}
	onpointerenter={() => void load().catch(() => {})}
	onfocus={() => void load().catch(() => {})}
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<circle cx="8" cy="8" r="2.25" />
		<path
			d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
		/>
	</svg>
</button>

{#if open && Panel}
	<Panel {id} {close} {go} {navHref} bind:el={panel} />
{/if}

<style>
	.gear {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		margin: -6px -6px -6px 0;
		color: var(--ink);
	}

	.gear svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: square;
		transition: transform var(--t-fast) var(--ease-steer);
	}

	.gear[aria-expanded='true'] svg {
		transform: rotate(45deg);
	}
</style>
