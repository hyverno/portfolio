// Crowd parameter sets (§S2 "Presets"). `calm` is the default, `still` is forced under reduced motion.
import type { CrowdParams, Glyph, Preset } from '../types';

export type NumericParam = Exclude<keyof CrowdParams, 'glyph' | 'glyphAlt'>;

export const NUMERIC_PARAMS: readonly NumericParam[] = [
	'seek',
	'maxSpeed',
	'maxForce',
	'arrive',
	'sep',
	'wander',
	'noiseScale',
	'mouseR',
	'mouseF',
	'scrollCarry',
	'panic',
	'paintMix',
	'size',
	'mixSpread'
];

/** Defaults = preset `calm`, plus everything the presets do not touch. */
export const DEFAULT_PARAMS: CrowdParams = {
	seek: 6,
	maxSpeed: 0.9,
	maxForce: 4,
	arrive: 0.18,
	sep: 0.6,
	wander: 0.25,
	noiseScale: 1.8,
	mouseR: 0.22,
	mouseF: 8,
	scrollCarry: 0.85,
	panic: 0,
	paintMix: 1,
	size: 7,
	mixSpread: 0.45,
	glyph: 'dart',
	glyphAlt: 'dart'
};

export const PRESETS: Record<Preset, Partial<Record<NumericParam, number>>> = {
	// scrollCarry / mouseF are restored by the motion presets after `still` zeroed them.
	calm: { seek: 6, maxSpeed: 0.9, wander: 0.25, sep: 0.6, panic: 0, scrollCarry: 0.85, mouseF: 8 },
	march: { seek: 8, maxSpeed: 1.2, wander: 0.1, sep: 0.8, panic: 0, scrollCarry: 0.85, mouseF: 8 },
	panic: { seek: 2, maxSpeed: 1.6, wander: 1, sep: 0.4, panic: 1, scrollCarry: 0.85, mouseF: 8 },
	// Reduced motion: formations hold, nothing wanders, nothing lags behind the page.
	still: { seek: 10, maxSpeed: 0.6, wander: 0, sep: 0.6, panic: 0, scrollCarry: 1, mouseF: 0 }
};

export const GLYPH_CODE: Record<Glyph, number> = { dot: 0, dart: 1, xstitch: 2 };
