// Web Storage that never throws (private mode, blocked site data, SSR).

type Kind = 'local' | 'session';

function store(kind: Kind): Storage | null {
	try {
		if (typeof window === 'undefined') return null;
		return kind === 'local' ? window.localStorage : window.sessionStorage;
	} catch {
		return null;
	}
}

export function readStore(key: string, kind: Kind = 'local'): string | null {
	try {
		return store(kind)?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

export function writeStore(key: string, value: string, kind: Kind = 'local'): void {
	try {
		store(kind)?.setItem(key, value);
	} catch {
		/* quota or blocked: settings simply do not persist */
	}
}

/** Reads a JSON object and merges it over `fallback`, so new keys always have a value. */
export function readJSON<T extends object>(key: string, fallback: T, kind: Kind = 'local'): T {
	const raw = readStore(key, kind);
	if (raw == null) return fallback;
	try {
		return { ...fallback, ...JSON.parse(raw) } as T;
	} catch {
		return fallback;
	}
}
