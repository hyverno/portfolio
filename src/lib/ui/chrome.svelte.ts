// Shared state between the chrome components (preloader → HUD handoff, #1,445 odometer).
import { TIER, device } from '#lib/core/device.svelte';
import { stats } from '#lib/core/stats.svelte';
import { t } from '#lib/i18n/index.svelte';

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

/**
 * The governor's latest step (`stats.governorNote` minus its English prefix, tiers localised),
 * e.g. 'DPR 1.0' or 'MOY.'. Empty until the governor has stepped down at least once.
 */
export function governorStep(): string {
	if (!device.governed || !stats.governorNote) return '';
	const step = stats.governorNote.replace(/^DYNAMIC QUALITY:\s*/i, '').trim();
	const q = t().settings.qualities as Record<string, string>;
	return q[step] ?? step;
}

export const pad = (n: number, width: number) =>
	String(Math.max(0, Math.round(n))).padStart(width, '0');
