// Release statuses computed at runtime (DESIGN.md §5 "Runtime status"). Pages prerender with
// the build date; sections call these again in onMount so a visitor always sees today's state.
import { DICTS } from '#lib/i18n/dicts';
import { formatHudDate, formatNum, parseIsoDate } from '#lib/i18n/format';
import type { Lang } from '#lib/i18n/types';
import type { Game, Release } from './types';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Beyond this, a countdown reads worse than a date. */
const COUNTDOWN_MAX_DAYS = 30;

/**
 * Release dates are calendar days in the viewer's own time zone: a game is `out` from local
 * midnight of its date. `days` counts calendar days left (0 once out, 1 = tomorrow);
 * `hours` counts hours until that local midnight (0 once out).
 */
export function releaseStatus(
	iso: string,
	now: Date = new Date()
): { out: boolean; days: number; hours: number } {
	const r = parseIsoDate(iso);
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const days = Math.round((r.getTime() - today) / DAY);
	const localMidnight = new Date(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate());
	const hours = Math.ceil((localMidnight.getTime() - now.getTime()) / HOUR);
	return { out: days <= 0, days: Math.max(0, days), hours: Math.max(0, hours) };
}

/**
 * The HUD status line of a game, localised. On 2026-10-04:
 * - Monsters → `OUT NOW · PC (STEAM, GAME PASS) · XBOX SERIES`
 * - Tabletop → `OUT NOW · STEAM` (the early-access label drops once the full release is out)
 * - Invokyr  → `EARLY ACCESS IN 4 DAYS`, then `OUT NOW · EARLY ACCESS` from 2026-10-08
 * A pending later release is appended: `OUT NOW · EARLY ACCESS · FULL RELEASE IN 8 DAYS`.
 */
export function releaseLabel(game: Game, lang: Lang, now: Date = new Date()): string {
	const d = DICTS[lang].status.release;
	const out: Release[] = [];
	const upcoming: Release[] = [];
	for (const r of game.releases) (releaseStatus(r.date, now).out ? out : upcoming).push(r);

	const parts: string[] = [];
	if (out.length) {
		const full = out.filter((r) => r.kind !== 'early-access');
		const shown = (full.length ? full : out).map((r) =>
			r.kind === 'early-access' ? d.earlyAccess : r.label[lang]
		);
		parts.push(d.outNow, ...new Set(shown));
	}

	const next = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))[0];
	if (next) {
		const what =
			next.kind === 'early-access'
				? d.earlyAccess
				: next.kind === 'launch'
					? d.launch
					: next.label[lang];
		const { days } = releaseStatus(next.date, now);
		parts.push(
			next.precision === 'month' || days > COUNTDOWN_MAX_DAYS
				? d.on(what, formatHudDate(next.date, next.precision, lang))
				: days === 1
					? d.tomorrow(what)
					: d.inDays(what, formatNum(days, lang))
		);
	}
	return parts.join(' · ');
}
