// Plain (rune-free) i18n types, importable from anywhere, including content/ and server code.
import type en from './en';

export type Lang = 'en' | 'fr';
export const LANGS: readonly Lang[] = ['en', 'fr'];

/** A headline with exactly one Instrument Serif italic accent word: `{pre}<em>{em}</em>{post}`. */
export interface Rich {
	pre: string;
	em: string;
	post: string;
}

/**
 * `en.ts` is declared `as const`, so its literal types are too narrow for another language.
 * Widen every string literal to `string` while keeping the shape: object keys, tuple lengths
 * and function parameter lists all stay exact, so `fr.ts` must match `en.ts` key for key.
 */
export type Widen<T> = T extends string
	? string
	: T extends number
		? number
		: T extends boolean
			? boolean
			: T extends (...args: infer A) => infer R
				? (...args: A) => Widen<R>
				: { readonly [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<typeof en>;
