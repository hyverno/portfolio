// Achievements (§6) and the toast queue (§7). Unlocks persist in localStorage 'hyv.ach' and
// never re-toast; toasts are queued here and paced by `ui/Toasts.svelte` (one at a time).
import { FLAGS } from '#lib/core/flags';
import { readJSON, writeStore } from '#lib/core/storage';
import { t } from '#lib/i18n/index.svelte';
import { sfx } from '#lib/ui/sfx';

export type AchId =
	| 'first-blood'
	| 'crowd-control'
	| 'wireframe'
	| 'crit'
	| 'planet-breaker'
	| 'cross-stitch'
	| 'cheeks-full'
	| 'bullet-hell'
	| 'networking'
	| 'completionist'
	| 'dev-mode';

export const ACH_IDS: readonly AchId[] = [
	'first-blood',
	'crowd-control',
	'wireframe',
	'crit',
	'planet-breaker',
	'cross-stitch',
	'cheeks-full',
	'bullet-hell',
	'networking',
	'completionist',
	'dev-mode'
];

export const ACH_TOTAL = ACH_IDS.length;

/** §6 English copy, used when the dictionary is missing a key. */
const FALLBACK: Record<AchId, { title: string; line: string }> = {
	'first-blood': { title: 'FIRST BLOOD', line: 'You pinged the crowd. It pinged back.' },
	'crowd-control': { title: 'CROWD CONTROL', line: 'Selected 500+ units. Micro: excellent.' },
	wireframe: { title: 'WIREFRAME ENJOYER', line: 'Opened Debug view.' },
	crit: { title: 'CRIT HAPPENS', line: 'Rolled a nat 20.' },
	'planet-breaker': { title: 'PLANET BREAKER', line: 'Eight craters. Physics was consulted.' },
	'cross-stitch': { title: 'CROSS MY HEART', line: 'Stitched a full pattern.' },
	'cheeks-full': { title: 'CHEEKS FULL', line: 'Pépite is proud of you.' },
	'bullet-hell': { title: 'BULLET HELL', line: '20,000 numbers on screen. Still 60fps.' },
	networking: { title: 'NETWORKING', line: 'Email copied.' },
	completionist: { title: 'COMPLETIONIST', line: 'Reached the footer.' },
	'dev-mode': { title: '#1,445 · DEVELOPER MODE', line: 'His 1,444 Steam achievements, plus you.' }
};

/** Localised title and line, falling back to §6 English per field. */
export function achText(id: AchId): { title: string; line: string } {
	const dict = (t() as { achievements?: Partial<Record<AchId, { title?: string; line?: string }>> })
		.achievements?.[id];
	return { title: dict?.title || FALLBACK[id].title, line: dict?.line || FALLBACK[id].line };
}

export type ToastKind = 'ach' | 'info' | 'ultra';

export interface ToastMsg {
	id: number;
	kind: ToastKind;
	title: string;
	body?: string;
	/** Achievement toasts re-read their copy at render time, so a language switch while queued is fine. */
	ach?: AchId;
	/** Trophies unlocked at the moment of this toast. */
	count?: number;
}

export const ach = $state({
	unlocked: [] as AchId[],
	/** ⚙ Toasts: OFF. Unlocks still persist; nothing is shown. */
	muted: false,
	progress: {} as Partial<Record<AchId, { value: number; max: number }>>
});

/** Pending toasts, oldest first. `Toasts.svelte` takes them one at a time with `takeToast()`. */
export const toastQueue = $state<ToastMsg[]>([]);

const KEY = 'hyv.ach';
const QUEUE_MAX = 6;

interface Saved {
	unlocked: AchId[];
	muted: boolean;
	progress: Partial<Record<AchId, { value: number; max: number }>>;
}

let loaded = false;
let nextId = 1;

/** Reads the saved state once (client only). Called lazily by every mutation, and by the HUD on mount. */
export function loadAchievements(): void {
	if (loaded || typeof window === 'undefined') return;
	loaded = true;
	const saved = readJSON<Saved>(KEY, { unlocked: [], muted: false, progress: {} });
	// Older saves stored a bare array of ids.
	const list = Array.isArray(saved) ? (saved as unknown as AchId[]) : saved.unlocked;
	ach.unlocked = (Array.isArray(list) ? list : []).filter((id) => ACH_IDS.includes(id));
	ach.muted = saved.muted === true;
	ach.progress = saved.progress && typeof saved.progress === 'object' ? saved.progress : {};
}

function persist() {
	const data: Saved = { unlocked: ach.unlocked, muted: ach.muted, progress: ach.progress };
	writeStore(KEY, JSON.stringify(data));
}

export function isUnlocked(id: AchId): boolean {
	loadAchievements();
	return ach.unlocked.includes(id);
}

/** Queues a toast (dropped while toasts are muted). */
export function toast(m: {
	title: string;
	body?: string;
	kind?: ToastKind;
	ach?: AchId;
	count?: number;
}): void {
	if (typeof window === 'undefined') return;
	loadAchievements();
	if (ach.muted) return;
	if (toastQueue.length >= QUEUE_MAX) toastQueue.shift();
	toastQueue.push({
		id: nextId++,
		kind: m.kind ?? 'info',
		title: m.title,
		body: m.body,
		ach: m.ach,
		count: m.count
	});
}

export function takeToast(): ToastMsg | undefined {
	return toastQueue.shift();
}

/** Unlocks once: persists, plays the jingle and queues the toast. Re-unlocking is a no-op. */
export function unlock(id: AchId): void {
	if (typeof window === 'undefined' || !FLAGS.achievements || !ACH_IDS.includes(id)) return;
	loadAchievements();
	if (ach.unlocked.includes(id)) return;
	ach.unlocked.push(id);
	persist();
	sfx('ach');
	const { title, line } = achText(id);
	toast({
		kind: id === 'dev-mode' ? 'ultra' : 'ach',
		title,
		body: line,
		ach: id,
		count: ach.unlocked.length
	});
}

/** Records progress (e.g. Cheeks Full 3/12) and unlocks when `value >= max`. */
export function progress(id: AchId, value: number, max: number): void {
	if (typeof window === 'undefined' || !FLAGS.achievements) return;
	loadAchievements();
	const prev = ach.progress[id];
	const v = Math.max(0, Math.min(value, max));
	if (!prev || prev.value !== v || prev.max !== max) {
		ach.progress[id] = { value: v, max };
		persist();
	}
	if (v >= max) unlock(id);
}

/** ⚙ Toasts ON/OFF. Muting also drops anything still queued. */
export function setToastsMuted(muted: boolean): void {
	loadAchievements();
	ach.muted = muted;
	if (muted) toastQueue.length = 0;
	persist();
}
