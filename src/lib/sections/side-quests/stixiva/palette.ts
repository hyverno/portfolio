// Stixiva's ten embroidery threads (DESIGN.md §2.1 chapter palette), in chart order.
// Names belong to the (French) app UI and stay French in both languages.
// Pure data, no imports: unit-testable under plain Node.

export type RGB = [number, number, number];

/** Chart symbols, one per thread: ● ▲ ■ ◆ ✚ ○ △ □ ◇ ✕ (drawn as vectors, never as font glyphs). */
export type SymbolKind =
	| 'disc'
	| 'tri'
	| 'square'
	| 'diamond'
	| 'plus'
	| 'ring'
	| 'triOpen'
	| 'squareOpen'
	| 'diamondOpen'
	| 'cross';

export interface Thread {
	/** 0-based palette index. */
	index: number;
	/** `01`…`10`, the FIL number. */
	code: string;
	name: string;
	hex: string;
	rgb: RGB;
	symbol: SymbolKind;
	/** The symbol as text (legend, PDF sheet, aria). */
	glyph: string;
}

const RAW: [string, string, SymbolKind, string][] = [
	['GARANCE', '#B7332C', 'disc', '●'],
	['ROSE', '#E8A0A6', 'tri', '▲'],
	['OCRE', '#D9A441', 'square', '■'],
	['SAUGE', '#8FA98B', 'diamond', '◆'],
	['PRUSSE', '#22406B', 'plus', '✚'],
	['LIN', '#E9DFC9', 'ring', '○'],
	['ENCRE', '#1B1B1B', 'triOpen', '△'],
	['CORAIL', '#F07561', 'squareOpen', '□'],
	['LILAS', '#A99AC9', 'diamondOpen', '◇'],
	['BOUTEILLE', '#2F5D46', 'cross', '✕']
];

export function hexRgb(hex: string): RGB {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const THREADS: readonly Thread[] = RAW.map(([name, hex, symbol, glyph], index) => ({
	index,
	code: String(index + 1).padStart(2, '0'),
	name,
	hex,
	rgb: hexRgb(hex),
	symbol,
	glyph
}));

/** Weighted RGB distance² (2, 4, 3): the eye is most sensitive to green, least to red. */
export function dist2(r: number, g: number, b: number, c: RGB): number {
	const dr = r - c[0];
	const dg = g - c[1];
	const db = b - c[2];
	return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/** Index (into `among`, default all ten) of the nearest thread to an sRGB colour. */
export function nearestThread(r: number, g: number, b: number, among: readonly number[] = ALL): number {
	let best = among[0];
	let bestD = Infinity;
	for (const i of among) {
		const d = dist2(r, g, b, THREADS[i].rgb);
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	return best;
}

const ALL: readonly number[] = THREADS.map((t) => t.index);

/** Relative luminance (sRGB), to pick a legible symbol colour on a thread swatch. */
export function luminance([r, g, b]: RGB): number {
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
