// UI sound (§9.1): `sfx(name)` is a no-op unless the visitor turned SFX on (off by default,
// persisted). The synth itself (`synth.ts`) is fetched the first time a sound is wanted.
import { sfxState } from './sfx.svelte';

export { sfxState, setSfx, loadSfx } from './sfx.svelte';

export type SfxName = 'tick' | 'ping' | 'crit' | 'ach' | 'bite' | 'roll' | 'stitch';

type Synth = typeof import('./synth');

let synth: Synth | null = null;
let loading: Promise<Synth> | null = null;

function load(): Promise<Synth> {
	loading ??= import('./synth').then((m) => (synth = m));
	return loading;
}

/** Plays a synthesised UI sound. Silent unless SFX is enabled; never throws. */
export function sfx(name: SfxName): void {
	if (!sfxState.enabled || typeof window === 'undefined') return;
	if (synth) synth.play(name);
	else
		void load().then(
			(m) => m.play(name),
			() => {}
		);
}

/** Call inside the gesture that enables sound, so the AudioContext may start. */
export function primeSfx(): Promise<void> {
	return load().then(
		(m) => m.prime(),
		() => {}
	);
}
