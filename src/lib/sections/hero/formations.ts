// Hero formations (§S1, §5 "01 · Hero"). Sources are defined once at module level: the crowd
// compares source identity, so a new object would re-bake.
import type { FormationSource } from '#lib/gl/types';

export const HERO_OWNER = 'hero';
export const HERO_WIDE_ID = 'hero-wide';
export const HERO_TALL_ID = 'hero-tall';

/** HYVERNO at wdth 125, fitted to the twin's ink box (10 columns on desktop). */
export const HERO_WIDE: FormationSource = { kind: 'glyphs', key: 'HYVERNO_W125' };
/** HYVERNO at wdth 62, same width: the word grows taller as it narrows. */
export const HERO_TALL: FormationSource = { kind: 'glyphs', key: 'HYVERNO_W62' };

/**
 * Ink metrics of the two baked runs (`src/lib/gen/glyphs.json`, Archivo 900, tracking 0, font
 * units at 1000 upem, y down from the baseline). The CSS boxes the crowd forms in use the same
 * ratios, so the DOM twin and the dots share one geometry:
 *   bbox [x, y, w, h] = [74, -700, 6592, 712] (wdth 125) · [40, -700, 3437, 712] (wdth 62)
 * The cap top is 700 above the baseline and the O overshoots 12 below it.
 */
export const INK = {
	wide: { lsb: 0.074, w: 6.592, h: 0.712, advance: 6.711, wdth: 125 },
	tall: { lsb: 0.04, w: 3.437, h: 0.712, advance: 3.507, wdth: 62 },
	cap: 0.7,
	overshoot: 0.012
} as const;

/** Pin progress at which the march hands the crowd over to the README anchor (§S1). */
export const MARCH_SPLIT = 0.45;
