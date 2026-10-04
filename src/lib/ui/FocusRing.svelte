<!--
	Keyboard focus as a lock-on (§3.5, §7): `:focus-visible` gets the house brackets in cobalt,
	offset 4px, at z 100. Runs in every mode (including reduced motion, where it simply snaps).
	While mounted, `html.focus-brackets` hides the CSS outline fallback from global.css.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Brackets from './Brackets.svelte';

	let target = $state<HTMLElement | null>(null);

	onMount(() => {
		const html = document.documentElement;
		html.classList.add('focus-brackets');

		const onFocusIn = (e: FocusEvent) => {
			const el = e.target;
			// Programmatic targets (`tabindex="-1"`, e.g. <main> after the skip link) get no ring.
			target =
				el instanceof HTMLElement && el.tabIndex >= 0 && el.matches(':focus-visible') ? el : null;
		};
		const onFocusOut = (e: FocusEvent) => {
			// Focus leaving the page (or to nothing) clears the ring; focusin on the next element replaces it.
			if (!e.relatedTarget) target = null;
		};
		const onPointerDown = () => {
			target = null;
		};

		document.addEventListener('focusin', onFocusIn);
		document.addEventListener('focusout', onFocusOut);
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => {
			html.classList.remove('focus-brackets');
			document.removeEventListener('focusin', onFocusIn);
			document.removeEventListener('focusout', onFocusOut);
			document.removeEventListener('pointerdown', onPointerDown, true);
		};
	});
</script>

<Brackets {target} color="var(--debug-cobalt)" pad={4} z="var(--z-top)" />
