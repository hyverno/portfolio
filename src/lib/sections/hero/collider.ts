// `use:collider` with an off switch, for copy that lives inside the pinned hero.
//
// core/colliders.ts caches rects in page space (rect.top + scrollY) and is not pin-aware: while the
// hero is pinned the copy stays put on screen but its cached box scrolls up through the letters
// and shoves them out of shape. The hero therefore only registers its copy while the pin is at
// rest (progress 0) and re-registers (= re-measures) when it comes back to rest. Off the pin
// (mobile, reduced motion) the switch simply stays on.
import type { ActionReturn } from 'svelte/action';
import { registerCollider } from '#lib/core/colliders';

export interface SwitchColliderParams {
	enabled: boolean;
	pad?: number;
}

export function switchCollider(
	node: HTMLElement,
	params: SwitchColliderParams
): ActionReturn<SwitchColliderParams> {
	let o = params;
	let off: (() => void) | null = null;

	const apply = () => {
		off?.();
		off = null;
		if (o.enabled) {
			node.dataset.collider = '';
			off = registerCollider(node, o.pad ?? 0);
		} else {
			delete node.dataset.collider;
		}
	};
	apply();

	return {
		update(next) {
			if (next.enabled === o.enabled && (next.pad ?? 0) === (o.pad ?? 0)) return;
			o = next;
			apply();
		},
		destroy() {
			off?.();
			off = null;
			delete node.dataset.collider;
		}
	};
}
