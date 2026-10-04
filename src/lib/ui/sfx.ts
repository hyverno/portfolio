// Tiny WebAudio synth (§9.1): every sound is a few oscillators or a noise burst, no samples.
// A no-op unless the visitor turned SFX on; the AudioContext is created on first use.
import { sfxState } from './sfx.svelte';

export { sfxState, setSfx, loadSfx } from './sfx.svelte';

export type SfxName = 'tick' | 'ping' | 'crit' | 'ach' | 'bite' | 'roll' | 'stitch';

const MASTER = 0.16;
/** Minimum gap between two plays of the same sound, seconds (keeps bursts from clipping). */
const GAP: Record<SfxName, number> = {
	tick: 0.03,
	ping: 0.06,
	crit: 0.05,
	ach: 0.5,
	bite: 0.08,
	roll: 0.3,
	stitch: 0.025
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const last: Partial<Record<SfxName, number>> = {};

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		const AC =
			window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!AC) return null;
		try {
			ctx = new AC();
		} catch {
			return null;
		}
		master = ctx.createGain();
		master.gain.value = MASTER;
		master.connect(ctx.destination);
		const len = Math.floor(ctx.sampleRate * 0.5);
		noise = ctx.createBuffer(1, len, ctx.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
	}
	// Browsers start contexts suspended until a gesture; the SFX toggle click is one.
	if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
	return ctx.state === 'closed' ? null : ctx;
}

function env(c: AudioContext, at: number, dur: number, peak: number): GainNode {
	const g = c.createGain();
	g.gain.setValueAtTime(0.0001, at);
	g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.006, dur / 4));
	g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
	g.connect(master!);
	return g;
}

function tone(c: AudioContext, at: number, dur: number, freq: number, o: { type?: OscillatorType; to?: number; peak?: number } = {}) {
	const osc = c.createOscillator();
	osc.type = o.type ?? 'square';
	osc.frequency.setValueAtTime(freq, at);
	if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur);
	osc.connect(env(c, at, dur, o.peak ?? 0.3));
	osc.start(at);
	osc.stop(at + dur + 0.02);
}

function burst(c: AudioContext, at: number, dur: number, freq: number, o: { q?: number; peak?: number; type?: BiquadFilterType } = {}) {
	const src = c.createBufferSource();
	src.buffer = noise;
	const f = c.createBiquadFilter();
	f.type = o.type ?? 'bandpass';
	f.frequency.value = freq;
	f.Q.value = o.q ?? 1.2;
	src.connect(f);
	f.connect(env(c, at, dur, o.peak ?? 0.5));
	src.start(at, Math.random() * 0.4);
	src.stop(at + dur + 0.02);
}

const VOICES: Record<SfxName, (c: AudioContext, t: number) => void> = {
	tick: (c, t) => tone(c, t, 0.025, 2200, { peak: 0.12 }),
	ping: (c, t) => {
		tone(c, t, 0.22, 1320, { type: 'sine', to: 440, peak: 0.35 });
		burst(c, t, 0.05, 4000, { peak: 0.15 });
	},
	crit: (c, t) => {
		tone(c, t, 0.09, 660, { type: 'triangle', peak: 0.3 });
		tone(c, t + 0.05, 0.16, 990, { type: 'triangle', peak: 0.3 });
		burst(c, t, 0.04, 6000, { peak: 0.25, type: 'highpass' });
	},
	ach: (c, t) => {
		[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
			tone(c, t + i * 0.07, i === 3 ? 0.36 : 0.1, f, { type: 'triangle', peak: 0.28 })
		);
	},
	bite: (c, t) => {
		burst(c, t, 0.06, 1400, { q: 3, peak: 0.6 });
		burst(c, t + 0.07, 0.05, 1100, { q: 3, peak: 0.45 });
	},
	roll: (c, t) => {
		// A die rattling to a stop: clicks drifting further apart.
		let at = t;
		for (let i = 0; i < 7; i++) {
			burst(c, at, 0.03, 2500 + Math.random() * 1500, { q: 4, peak: 0.4 });
			at += 0.04 + i * 0.018 + Math.random() * 0.02;
		}
	},
	stitch: (c, t) => {
		tone(c, t, 0.015, 3200, { type: 'sine', peak: 0.12 });
		burst(c, t, 0.02, 7000, { peak: 0.08, type: 'highpass' });
	}
};

/** Plays a synthesised UI sound. Silent unless SFX is enabled; never throws. */
export function sfx(name: SfxName): void {
	if (!sfxState.enabled) return;
	const c = audio();
	if (!c || c.state !== 'running' || !master) return;
	const now = c.currentTime;
	if (now - (last[name] ?? -1) < GAP[name]) return;
	last[name] = now;
	try {
		VOICES[name](c, now + 0.005);
	} catch {
		/* audio graph errors are never worth a console line */
	}
}

/** Creates / resumes the context inside a user gesture (the SFX toggle), so the next sound plays. */
export function primeSfx(): Promise<void> {
	const c = audio();
	return c ? c.resume().catch(() => {}) : Promise.resolve();
}
