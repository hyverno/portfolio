// Boot progress for the preloader (S1). Every value is real: stages report as they finish.
import { readStore, writeStore } from './storage';

export type BootStage = 'fonts' | 'compile' | 'formations' | 'firstFrame';

const WEIGHTS: Record<BootStage, number> = { fonts: 0.3, compile: 0.3, formations: 0.3, firstFrame: 0.1 };
const MAX_LOG = 64;
const SESSION_KEY = 'hyv.boot';

export const boot = $state({
	progress: 0,
	stage: 'spawn' as 'spawn' | 'compile' | 'bake' | 'ready',
	log: [] as string[],
	done: false,
	/** Repeat visit in this session: the preloader plays its 0.6s version. */
	short: false
});

const parts: Record<BootStage, number> = { fonts: 0, compile: 0, formations: 0, firstFrame: 0 };
let resolveBooted: () => void;
const booted = new Promise<void>((r) => (resolveBooted = r));

/** Reads the session flag (client only). Called by the root layout before any child mounts. */
export function initBoot(): void {
	boot.short = readStore(SESSION_KEY, 'session') === '1';
}

/** Reports a stage as `p` complete (0..1, default 1). Progress never goes backwards. */
export function report(stage: BootStage, p = 1): void {
	parts[stage] = Math.max(parts[stage], Math.min(1, Math.max(0, p)));
	let sum = 0;
	for (const k in WEIGHTS) sum += WEIGHTS[k as BootStage] * parts[k as BootStage];
	boot.progress = Math.min(1, Math.round(sum * 1000) / 1000);
	boot.stage =
		boot.progress >= 1
			? 'ready'
			: parts.compile >= 1
				? 'bake'
				: parts.fonts >= 1 || parts.compile > 0
					? 'compile'
					: 'spawn';
}

/** Appends an engine-log line prefixed with seconds since navigation start: `[0.203] …`. */
export function log(line: string): void {
	const t = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
	boot.log.push(`[${t.toFixed(3)}] ${line}`);
	if (boot.log.length > MAX_LOG) boot.log.splice(0, boot.log.length - MAX_LOG);
}

export function whenBooted(): Promise<void> {
	return booted;
}

/** Ends the boot sequence (preloader exit, or the layout's 6s safety net). Idempotent. */
export function finishBoot(): void {
	if (boot.done) return;
	boot.done = true;
	performance.mark('hyv:booted');
	writeStore(SESSION_KEY, '1', 'session');
	resolveBooted();
}
