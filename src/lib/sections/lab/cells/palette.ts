// Theme colours for the Canvas2D cells, as CSS strings, kept in step with the theme engine (the
// same tweened source of truth as the DOM and the WebGL uniforms). Cobalt is the debug gizmo
// colour: #5B73FF on dark papers, #2440FF on light ones (§2.1 "Debug set").
import { onThemeColors, type RGB, type ThemeColors } from '#lib/core/theme.svelte';

const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const byte = (c: number) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255);

export interface Palette {
	paper: string;
	ink: string;
	graphite: string;
	hairline: string;
	signal: string;
	cobalt: string;
	/** sRGB bytes, for rgba() strings with a computed alpha. */
	rgb: Record<'paper' | 'ink' | 'graphite' | 'hairline' | 'signal' | 'cobalt', [number, number, number]>;
	dark: boolean;
	/** Bumped on every theme change (cells re-render cached layers when it moves). */
	version: number;
}

const COBALT_DARK: [number, number, number] = [0x5b, 0x73, 0xff];
const COBALT_LIGHT: [number, number, number] = [0x24, 0x40, 0xff];

export const pal: Palette = {
	paper: '#0f1110',
	ink: '#ece9e1',
	graphite: '#8c8b84',
	hairline: '#262826',
	signal: '#ff5a2e',
	cobalt: '#5b73ff',
	rgb: {
		paper: [15, 17, 16],
		ink: [236, 233, 225],
		graphite: [140, 139, 132],
		hairline: [38, 40, 38],
		signal: [255, 90, 46],
		cobalt: COBALT_DARK
	},
	dark: true,
	version: 0
};

const bytes = (c: RGB): [number, number, number] => [byte(c[0]), byte(c[1]), byte(c[2])];
const css = ([r, g, b]: [number, number, number]) => `rgb(${r} ${g} ${b})`;

/** `rgba()` of a palette colour with alpha. */
export function rgba(name: keyof Palette['rgb'], a: number): string {
	const [r, g, b] = pal.rgb[name];
	return `rgb(${r} ${g} ${b} / ${Math.round(Math.min(1, Math.max(0, a)) * 1000) / 1000})`;
}

/** Mix of two palette colours (t = 0 → a). */
export function mix(a: keyof Palette['rgb'], b: keyof Palette['rgb'], t: number): string {
	const A = pal.rgb[a];
	const B = pal.rgb[b];
	const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
	return `rgb(${m(0)} ${m(1)} ${m(2)})`;
}

function apply(c: ThemeColors) {
	pal.rgb.paper = bytes(c.paper);
	pal.rgb.ink = bytes(c.ink);
	pal.rgb.graphite = bytes(c.graphite);
	pal.rgb.hairline = bytes(c.hairline);
	pal.rgb.signal = bytes(c.signal);
	const lum = 0.2126 * c.paper[0] + 0.7152 * c.paper[1] + 0.0722 * c.paper[2];
	pal.dark = lum < 0.2;
	pal.rgb.cobalt = pal.dark ? COBALT_DARK : COBALT_LIGHT;
	pal.paper = css(pal.rgb.paper);
	pal.ink = css(pal.rgb.ink);
	pal.graphite = css(pal.rgb.graphite);
	pal.hairline = css(pal.rgb.hairline);
	pal.signal = css(pal.rgb.signal);
	pal.cobalt = css(pal.rgb.cobalt);
	pal.version++;
}

let users = 0;
let off: (() => void) | null = null;

/** Ref-counted subscription to the theme engine. Returns the release function. */
export function usePalette(): () => void {
	if (users++ === 0) off = onThemeColors(apply);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		if (--users === 0) {
			off?.();
			off = null;
		}
	};
}

/** Martian Mono at a CSS px size for canvas labels. */
export function monoFont(px: number, weight = 500): string {
	return `${weight} ${px}px "Martian Mono Variable", ui-monospace, Menlo, Consolas, monospace`;
}

/** A canvas sized for the device: backing store = CSS size × dpr (capped at 2). */
export function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number): number {
	const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
	const bw = Math.max(1, Math.round(w * dpr));
	const bh = Math.max(1, Math.round(h * dpr));
	if (canvas.width !== bw) canvas.width = bw;
	if (canvas.height !== bh) canvas.height = bh;
	return dpr;
}
