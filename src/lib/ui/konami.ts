// Achievement #1,445 (S4) triggers: the Konami code, or 7 quick taps on the HUD build tag on
// touch devices. The payoff itself lives in `devmode.ts` and is fetched when it fires.
import { KONAMI, onSequence } from '#lib/core/keys';
import { isUnlocked } from '#lib/stores/achievements.svelte';
import { chrome } from './chrome.svelte';

const TAPS = 7;
const TAP_GAP_MS = 700;

/** Plays the #1,445 payoff (ignored while it is already running; replays never re-toast). */
export function developerMode(): Promise<void> {
	return import('./devmode').then(
		(m) => m.developerMode(),
		() => {}
	);
}

/** Shows the persisted #1,445 segment on later visits. */
export function restoreDeveloperMode(): void {
	if (isUnlocked('dev-mode') && chrome.devRoll === 0) chrome.devRoll = 1445;
}

/** Wires the Konami listener; returns a cleanup. */
export function listenKonami(): () => void {
	return onSequence(KONAMI, () => void developerMode());
}

/** Build-tag tap counter: 7 quick touch taps trigger #1,445. Returns true when it fired. */
export function createTapCounter(): (e: PointerEvent) => boolean {
	let count = 0;
	let last = 0;
	return (e) => {
		if (e.pointerType === 'mouse') return false;
		const now = performance.now();
		count = now - last < TAP_GAP_MS ? count + 1 : 1;
		last = now;
		if (count < TAPS) return false;
		count = 0;
		void developerMode();
		return true;
	};
}
