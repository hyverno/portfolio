// `use:collider` with an on/off switch, for the Ludogram copy.
//
// Two stage-1 behaviours make an always-on obstacle misbehave here:
// - core/colliders.ts caches rects in page space (rect.top + scrollY) and is not pin-aware: while
//   the panel is pinned the brief stays put on screen, but its cached box keeps scrolling with the
//   page and would sweep through the crowd during a slot change. So the parent switches the brief
//   off while the pin moves; switching it back on registers it again, which re-measures it.
// - Off-screen obstacles trap entities: the position pass clamps any entity whose target is on
//   screen to just outside the viewport edge, and if that clamp line falls inside an obstacle
//   box sitting above/below the viewport, the obstacle pushes it back against the clamp forever
//   (seen with the peon behind the section headline). So a block is an obstacle only while it is
//   on screen (IntersectionObserver, no per-frame measuring).
// `data-collider` stays on regardless (input.ts uses it to tell copy from empty space).
import type { ActionReturn } from 'svelte/action';
import { registerCollider } from '#lib/core/colliders';

export interface CollideParams {
	/** Caller's switch (e.g. "the pin is at rest"). */
	on?: boolean;
	pad?: number;
}

export function collideWhen(
	node: HTMLElement,
	params: CollideParams = {}
): ActionReturn<CollideParams> {
	let o = params;
	let visible = false;
	let off: (() => void) | null = null;
	node.dataset.collider = '';

	const apply = () => {
		const want = (o.on ?? true) && visible;
		if (want === !!off) return;
		off?.();
		off = want ? registerCollider(node, o.pad ?? 0) : null;
	};

	const io = new IntersectionObserver(([e]) => {
		visible = e.isIntersecting;
		apply();
	});
	io.observe(node);

	return {
		update(next = {}) {
			const repad = (next.pad ?? 0) !== (o.pad ?? 0);
			o = next;
			if (repad && off) {
				off();
				off = null;
			}
			apply();
		},
		destroy() {
			io.disconnect();
			off?.();
			off = null;
			delete node.dataset.collider;
		}
	};
}
