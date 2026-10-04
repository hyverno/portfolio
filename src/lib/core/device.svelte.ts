// Device capabilities, quality tier and the user's motion / quality settings.
import { getEngine } from '#lib/gl/handle';
import { readJSON, writeStore } from './storage';
import { stats } from './stats.svelte';

export type Tier = 'high' | 'med' | 'low';
export type Quality = 'AUTO' | 'LOW' | 'MED' | 'HIGH';

export interface TierSpec {
	sim: 128 | 96 | 64;
	density: 256 | 128;
	dpr: number;
	/** Planet GPGPU texture size [w, h]. */
	planet: [number, number];
	planetDetail: number;
	/** Damage Number Hose capacity (Lab). */
	hose: number;
	/** Global damage numbers capacity. */
	numbers: number;
}

export const TIER: Record<Tier, TierSpec> = {
	high: { sim: 128, density: 256, dpr: 1.5, planet: [128, 64], planetDetail: 40, hose: 65536, numbers: 16384 },
	med: { sim: 96, density: 256, dpr: 1.25, planet: [64, 64], planetDetail: 30, hose: 32768, numbers: 8192 },
	low: { sim: 64, density: 128, dpr: 1, planet: [32, 64], planetDetail: 20, hose: 8192, numbers: 4096 }
};

export const device = $state({
	reducedMotion: false,
	finePointer: false,
	coarse: false,
	mobile: false,
	webgl: 'pending' as 'pending' | 'ok' | 'none',
	floatRT: 'none' as 'float' | 'half' | 'none',
	tier: 'high' as Tier,
	dpr: 1,
	governed: false
});

interface Settings {
	quality: Quality;
	/** null = follow the OS setting. */
	reducedMotion: boolean | null;
}

const SETTINGS_KEY = 'hyv.settings';
const settings: Settings = { quality: 'AUTO', reducedMotion: null };

let detected = false;
let guessed: Tier = 'high';
let osReduced = false;
const motionListeners = new Set<(reduced: boolean) => void>();

const mq = (q: string) => window.matchMedia(q);

function guessTier(): Tier {
	if (device.mobile || device.coarse) return 'low';
	const nav = navigator as Navigator & { deviceMemory?: number };
	const cores = nav.hardwareConcurrency ?? 8;
	const memory = nav.deviceMemory ?? 8;
	return cores <= 4 || memory <= 4 ? 'med' : 'high';
}

function computeDpr(): number {
	const cap = Math.min(TIER[device.tier].dpr, device.mobile ? 1 : 1.5);
	return Math.min(window.devicePixelRatio || 1, cap);
}

function readPointer() {
	device.finePointer = mq('(hover: hover) and (pointer: fine)').matches;
	device.coarse = mq('(pointer: coarse)').matches;
	device.mobile =
		mq('(max-width: 767px)').matches ||
		(device.coarse && Math.min(screen.width, screen.height) < 768);
}

function applyReduced() {
	const next = settings.reducedMotion ?? osReduced;
	const html = document.documentElement;
	html.classList.toggle('reduced-motion', next);
	html.classList.toggle('motion-full', settings.reducedMotion === false);
	if (next === device.reducedMotion) return;
	device.reducedMotion = next;
	for (const fn of motionListeners) fn(next);
}

function persist() {
	writeStore(SETTINGS_KEY, JSON.stringify(settings));
}

/** Synchronous capability detection. Idempotent; call once as early as possible on the client. */
export function detectDevice(): void {
	if (detected || typeof window === 'undefined') return;
	detected = true;

	const saved = readJSON<Settings>(SETTINGS_KEY, settings);
	if (['AUTO', 'LOW', 'MED', 'HIGH'].includes(saved.quality)) settings.quality = saved.quality;
	if (typeof saved.reducedMotion === 'boolean') settings.reducedMotion = saved.reducedMotion;

	const reducedMq = mq('(prefers-reduced-motion: reduce)');
	osReduced = reducedMq.matches;
	readPointer();
	guessed = guessTier();
	device.tier = settings.quality === 'AUTO' ? guessed : (settings.quality.toLowerCase() as Tier);
	stats.quality = settings.quality;
	device.dpr = computeDpr();
	applyReduced();

	reducedMq.addEventListener('change', (e) => {
		osReduced = e.matches;
		applyReduced();
	});
	mq('(pointer: coarse)').addEventListener('change', readPointer);
	mq('(hover: hover) and (pointer: fine)').addEventListener('change', readPointer);
	let raf = 0;
	window.addEventListener('resize', () => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			readPointer();
			device.dpr = computeDpr();
		});
	});
}

let applyingTier = false;

/** Changes the quality tier. 'governor' steps are sticky for the session; the engine is told once. */
export function setTier(t: Tier, reason: 'governor' | 'user'): void {
	if (reason === 'governor') {
		device.governed = true;
		stats.governorNote = `DYNAMIC QUALITY: ${t.toUpperCase()}`;
	} else {
		settings.quality = t.toUpperCase() as Quality;
		stats.quality = settings.quality;
		persist();
	}
	if (device.tier === t || applyingTier) return;
	device.tier = t;
	if (typeof window !== 'undefined') device.dpr = computeDpr();
	applyingTier = true;
	try {
		getEngine()?.setTier(t);
	} finally {
		applyingTier = false;
	}
}

/** Settings popover: 'AUTO' returns to the detected tier (unless the governor already stepped down). */
export function setQuality(q: Quality): void {
	if (q !== 'AUTO') return setTier(q.toLowerCase() as Tier, 'user');
	settings.quality = 'AUTO';
	stats.quality = 'AUTO';
	persist();
	if (!device.governed && device.tier !== guessed) {
		device.tier = guessed;
		device.dpr = computeDpr();
		getEngine()?.setTier(guessed);
	}
}

/** User override for motion; `null` follows the OS. Persisted. */
export function setReducedMotion(v: boolean | null): void {
	settings.reducedMotion = v;
	persist();
	if (typeof window !== 'undefined') applyReduced();
}

/** The user's explicit motion override (`null` = follow the OS). */
export function motionOverride(): boolean | null {
	return settings.reducedMotion;
}

/** Fires when the effective reduced-motion value changes (OS or user setting). */
export function onReducedMotionChange(fn: (reduced: boolean) => void): () => void {
	motionListeners.add(fn);
	return () => motionListeners.delete(fn);
}

/** Switch the whole page to the static build (`html.no-webgl`). Safe to call more than once. */
export function markNoWebGL(): void {
	device.webgl = 'none';
	if (typeof document !== 'undefined') document.documentElement.classList.add('no-webgl');
}
