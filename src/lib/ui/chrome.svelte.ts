// Shared state between the chrome components (preloader → HUD handoff, #1,445 odometer).
import { TIER, device } from '#lib/core/device.svelte';
import { stats } from '#lib/core/stats.svelte';

export const chrome = $state({
	/** HUD pieces are on screen (entrance played). */
	hudIn: false,
	/** `data-hud-slot` names the preloader already flew into place: the HUD shows them without a slide. */
	handed: [] as string[],
	/** Value shown by the #1,445 odometer (0 = segment hidden). */
	devRoll: 0
});

/** Entity count shown by the HUD and the preloader: measured once the engine writes it, else the tier's N. */
export function entityCount(): number {
	if (stats.entities > 0) return stats.entities;
	if (device.webgl === 'none') return 0;
	return TIER[device.tier].sim ** 2;
}

export const pad = (n: number, width: number) =>
	String(Math.max(0, Math.round(n))).padStart(width, '0');
