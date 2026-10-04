// Sound on/off. Off by default; the choice persists in localStorage 'hyv.sfx'.
import { readStore, writeStore } from '#lib/core/storage';

export const sfxState = $state({ enabled: false });

const KEY = 'hyv.sfx';
let loaded = false;

/** Reads the saved setting once (client only). Call from onMount, never during SSR/hydration. */
export function loadSfx(): void {
	if (loaded || typeof window === 'undefined') return;
	loaded = true;
	sfxState.enabled = readStore(KEY) === '1';
}

export function setSfx(enabled: boolean): void {
	loaded = true;
	sfxState.enabled = enabled;
	writeStore(KEY, enabled ? '1' : '0');
}
