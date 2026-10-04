// Engine handle: lets any component reach the WebGL engine without importing `three`.
import type { Engine } from './types';

let engine: Engine | null = null;
let settled = false;
let resolvers: ((e: Engine | null) => void)[] = [];

/** Resolves with the engine once the layout has initialised it, or `null` when WebGL is unavailable. */
export function whenEngine(): Promise<Engine | null> {
	if (settled) return Promise.resolve(engine);
	return new Promise((resolve) => resolvers.push(resolve));
}

export function getEngine(): Engine | null {
	return engine;
}

/** Called once by the root layout after `initEngine` settles (pass `null` for the static build). */
export function setEngine(e: Engine | null): void {
	engine = e;
	settled = true;
	const pending = resolvers;
	resolvers = [];
	for (const resolve of pending) resolve(e);
}
