// A collider that only exists on wide viewports (workaround, see the S-planet report). On a phone
// a full-width heading is a dam, not a stone: the crowd arriving from above piles up on its top
// edge and the formation below it never forms. Wide layouts leave room to flow around it.
import type { ActionReturn } from 'svelte/action';
import { registerCollider } from '#lib/core/colliders';

const WIDE = '(min-width: 768px)';

export function wideCollider(node: HTMLElement, o: { pad?: number } = {}): ActionReturn<{ pad?: number } | undefined> {
	let pad = o.pad ?? 0;
	let off: (() => void) | null = null;
	const mq = window.matchMedia(WIDE);
	const sync = () => {
		off?.();
		off = null;
		if (mq.matches) {
			off = registerCollider(node, pad);
			node.dataset.collider = '';
		} else delete node.dataset.collider;
	};
	sync();
	mq.addEventListener('change', sync);
	return {
		update(next = {}) {
			if ((next.pad ?? 0) === pad) return;
			pad = next.pad ?? 0;
			sync();
		},
		destroy() {
			mq.removeEventListener('change', sync);
			off?.();
			delete node.dataset.collider;
		}
	};
}
