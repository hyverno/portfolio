// Moves a node to <body> so fixed overlays (tooltip, PDF preview) can sit above the WebGL canvas
// and the HUD: inside #content they are capped by its z-index (10), under the crowd (20).
import type { ActionReturn } from 'svelte/action';

export function portal(node: HTMLElement): ActionReturn {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
