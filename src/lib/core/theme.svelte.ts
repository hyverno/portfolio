// Theme engine (§2.1.1): one tweened object in linear RGB drives both the CSS custom properties
// on <html> and the WebGL uniforms, so DOM and canvas can never drift apart.
import { gsap } from 'gsap';
import { DUR, EASE, registerMotion } from './motion';
import { device } from './device.svelte';
import { boot } from './boot.svelte';

export type ThemeName = 'paper' | 'viewport' | 'ink' | 'earth' | 'ice' | 'aida' | 'rongeur';

export interface ThemeTokens {
	paper: string;
	ink: string;
	graphite: string;
	hairline: string;
	signal: string;
	signalText: string;
}

export type RGB = [number, number, number];
export type ThemeColors = Record<keyof ThemeTokens, RGB>;

export const THEMES: Record<ThemeName, ThemeTokens> = {
	paper: { paper: '#ECE9E1', ink: '#111110', graphite: '#5F5E58', hairline: '#D2CEC3', signal: '#FF4A1C', signalText: '#B8310D' },
	viewport: { paper: '#0F1110', ink: '#ECE9E1', graphite: '#8C8B84', hairline: '#262826', signal: '#FF5A2E', signalText: '#FF7A55' },
	ink: { paper: '#111110', ink: '#ECE9E1', graphite: '#8C8B84', hairline: '#2A2A27', signal: '#FF4A1C', signalText: '#FF7A55' },
	earth: { paper: '#E6E4D8', ink: '#14160F', graphite: '#5A5D4F', hairline: '#CFCDBE', signal: '#FF4A1C', signalText: '#B8310D' },
	ice: { paper: '#E4ECF0', ink: '#0F1B2A', graphite: '#4C5D6E', hairline: '#C8D5DD', signal: '#FF4A1C', signalText: '#B8310D' },
	aida: { paper: '#F3EFE6', ink: '#1B1B1B', graphite: '#5F5A50', hairline: '#DDD6C6', signal: '#B7332C', signalText: '#9E2A24' },
	rongeur: { paper: '#FFF3E2', ink: '#2B1B12', graphite: '#6E5444', hairline: '#EBD9C1', signal: '#F2894B', signalText: '#A4471A' }
};

/** Dark-paper themes: grain switches to `screen`, cobalt to its light variant (via `data-theme`). */
export const DARK_THEMES: ReadonlySet<ThemeName> = new Set(['viewport', 'ink']);

export const theme = $state({ name: 'paper' as ThemeName });

const KEYS = ['paper', 'ink', 'graphite', 'hairline', 'signal', 'signalText'] as const;
const CSS_VAR: Record<keyof ThemeTokens, string> = {
	paper: '--paper',
	ink: '--ink',
	graphite: '--graphite',
	hairline: '--hairline',
	signal: '--signal',
	signalText: '--signal-text'
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** '#RRGGBB' → linear RGB 0..1. */
export function hexToLinear(hex: string): RGB {
	const n = parseInt(hex.slice(1), 16);
	return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

function linearToCss([r, g, b]: RGB): string {
	const c = (v: number) => Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255);
	return `rgb(${c(r)} ${c(g)} ${c(b)})`;
}

function linearTheme(name: ThemeName): ThemeColors {
	const t = THEMES[name];
	return Object.fromEntries(KEYS.map((k) => [k, hexToLinear(t[k])])) as ThemeColors;
}

/** The single source of truth, tweened in place. Listeners receive this same object every call. */
const colors: ThemeColors = linearTheme('paper');
/** Flat proxy GSAP tweens: 18 numbers (6 tokens × rgb). */
const flat: Record<string, number> = {};
const listeners = new Set<(c: ThemeColors) => void>();
let tween: gsap.core.Tween | null = null;

function syncFlat() {
	for (const k of KEYS) for (let i = 0; i < 3; i++) flat[`${k}${i}`] = colors[k][i];
}
syncFlat();

function apply() {
	for (const k of KEYS) for (let i = 0; i < 3; i++) colors[k][i] = flat[`${k}${i}`];
	const style = document.documentElement.style;
	for (const k of KEYS) style.setProperty(CSS_VAR[k], linearToCss(colors[k]));
	for (const fn of listeners) fn(colors);
}

/** Tweens the whole page (DOM + WebGL) to `name` over 720ms `arrive`. */
export function setTheme(name: ThemeName, o: { duration?: number; immediate?: boolean } = {}): void {
	if (typeof window === 'undefined' || !(name in THEMES)) return;
	if (name === theme.name) return;
	registerMotion();
	theme.name = name;
	// Non-token extras (grain blend, cobalt variant, color-scheme) follow the attribute.
	document.documentElement.dataset.theme = name;
	tween?.kill();
	tween = null;

	const target = linearTheme(name);
	const to: Record<string, number> = {};
	for (const k of KEYS) for (let i = 0; i < 3; i++) to[`${k}${i}`] = target[k][i];

	// While the preloader covers the page (e.g. a reload mid-page) there is nothing to tween for.
	const duration =
		o.immediate || !boot.done ? 0 : (o.duration ?? (device.reducedMotion ? DUR.fast : DUR.reveal));
	if (duration === 0) {
		Object.assign(flat, to);
		apply();
		return;
	}
	tween = gsap.to(flat, {
		...to,
		duration,
		ease: EASE.arrive,
		onUpdate: apply,
		onComplete: () => void (tween = null)
	});
}

/**
 * Subscribes to theme colours in linear RGB 0..1 (fires on every tween update and once immediately).
 * The object passed is reused between calls: copy it if you need to keep a snapshot.
 */
export function onThemeColors(fn: (c: ThemeColors) => void): () => void {
	listeners.add(fn);
	fn(colors);
	return () => listeners.delete(fn);
}

/** The current (possibly mid-tween) colours in linear RGB. */
export function themeColors(): Readonly<ThemeColors> {
	return colors;
}
