// Crowd formations for the /projects/[slug] pages. The games reuse the Ludogram section's own
// sources; Stixiva reuses its grid, already stitched; the planet and Le Rongeur get a source of
// their own (the home page builds theirs from live scenes / measured DOM). All module-level, so
// the crowd sees a stable identity and never re-bakes for nothing.
import type { BakeCtx, BakeResult, FormationSource, Preset } from '#lib/gl/types';
import type { ProjectSlug } from '#lib/content/types';
import type { ThemeName } from '#lib/core/theme.svelte';
import { CITY_ASPECT, LUDO_CITY, LUDO_D20, LUDO_SHELVES, SHELVES_ASPECT } from '#lib/sections/ludogram/formations';
import { STIX_GRID } from '#lib/sections/side-quests/stixiva/formations';

type RGB = [number, number, number];

const SAGE: RGB = [143, 169, 139];
const OCHRE: RGB = [217, 164, 65];
const SIGNAL: RGB = [255, 74, 28];
const APRICOT: RGB = [242, 137, 75];

function slots(N: number) {
	const targets = new Float32Array(N * 4);
	const paint = new Uint8Array(N * 4);
	return {
		targets,
		paint,
		set(i: number, x: number, y: number, z: number, w: number) {
			targets[i * 4] = x;
			targets[i * 4 + 1] = y;
			targets[i * 4 + 2] = z;
			targets[i * 4 + 3] = w;
		},
		/** Alpha 255 = this colour; untouched slots keep alpha 0 = the theme's ink. */
		color(i: number, c: RGB) {
			paint.set([c[0], c[1], c[2], 255], i * 4);
		}
	};
}

/** Free roamers: weight 0, homes spread over the stage (≤ 25% of the crowd, see §S2). */
function ambient(s: ReturnType<typeof slots>, from: number, N: number, rand: () => number) {
	for (let i = from; i < N; i++) s.set(i, rand() * 2 - 1, rand() * 2 - 1, 0, 0);
}

// ── Crazy Planet Survivor: a dotted globe (spun by the page), an orbit, the player ─────────────

function buildPlanet({ N, rand }: BakeCtx): BakeResult {
	const s = slots(N);
	const R = 0.62;
	const nSphere = Math.floor(N * 0.7);
	const nOrbit = Math.floor(N * 0.1);
	const nPlayer = Math.max(24, Math.floor(N * 0.008));
	const golden = Math.PI * (3 - Math.sqrt(5));
	let i = 0;
	// Fibonacci lattice: evenly spread, so the globe reads as a halftone sphere at any angle.
	for (let k = 0; k < nSphere; k++, i++) {
		const y = 1 - (2 * (k + 0.5)) / nSphere;
		const r = Math.sqrt(1 - y * y);
		const a = k * golden;
		const x = Math.cos(a) * r;
		const z = Math.sin(a) * r;
		s.set(i, x * R, y * R, z * R, 1);
		// Continents: low-frequency waves on the unit sphere → sage land, ochre highlands.
		const n = Math.sin(x * 3.1 + 1.7) * Math.cos(y * 2.3 - 0.4) + Math.sin(z * 2.7 + 0.9) * 0.6;
		if (n > 0.62) s.color(i, OCHRE);
		else if (n > 0.12) s.color(i, SAGE);
	}
	// Orbit: a dashed ring, tilted, wider than the globe.
	const tilt = 0.42;
	for (let k = 0; k < nOrbit; k++, i++) {
		const t = k / nOrbit;
		const dash = Math.floor(t * 64);
		const a = (dash + (t * 64 - dash) * 0.62) / 64 * Math.PI * 2;
		const ox = Math.cos(a) * 0.97;
		const oz = Math.sin(a) * 0.97;
		s.set(i, ox, -oz * Math.sin(tilt), oz * Math.cos(tilt), 1);
	}
	// The player: a tight signal cluster on the surface, the horde's target.
	const p = [0.42, 0.28, Math.sqrt(1 - 0.42 * 0.42 - 0.28 * 0.28)];
	for (let k = 0; k < nPlayer; k++, i++) {
		const j = 0.035;
		const x = p[0] + (rand() - 0.5) * j;
		const y = p[1] + (rand() - 0.5) * j;
		const z = p[2] + (rand() - 0.5) * j;
		const l = Math.hypot(x, y, z) / (R * 1.02);
		s.set(i, x / l, y / l, z / l, 1);
		s.color(i, SIGNAL);
	}
	ambient(s, i, N, rand);
	return { targets: s.targets, paint: s.paint };
}

// ── Le Rongeur: a coin, bitten three times, and its crumbs ───────────────────────────────────

function buildRongeur({ N, rand }: BakeCtx): BakeResult {
	const s = slots(N);
	const R = 0.8;
	// Bites on the rim (centre angle, radius as a fraction of R), each with two incisor notches.
	const bites = [
		{ a: 0.62, r: 0.24 },
		{ a: -0.42, r: 0.13 },
		{ a: 3.95, r: 0.16 }
	].map((b) => ({ x: Math.cos(b.a) * R, y: Math.sin(b.a) * R, r: b.r * R, a: b.a }));
	const bitten = (x: number, y: number) =>
		bites.some((b) => {
			if (Math.hypot(x - b.x, y - b.y) < b.r) return true;
			// Two small teeth marks just inside each bite.
			for (const side of [-1, 1]) {
				const ta = b.a + side * 0.09;
				const tx = Math.cos(ta) * (R - b.r * 1.02);
				const ty = Math.sin(ta) * (R - b.r * 1.02);
				if (Math.hypot(x - tx, y - ty) < b.r * 0.22) return true;
			}
			return false;
		});
	const nCoin = Math.floor(N * 0.74);
	const nCrumbs = Math.floor(N * 0.08);
	let i = 0;
	// A sunflower (Vogel) spiral fills the disc evenly with a perfectly round rim; the bites are cut
	// out of it. Oversample so the bitten coin still gets its full share of slots.
	const golden = Math.PI * (3 - Math.sqrt(5));
	const M = Math.ceil(nCoin * 1.22);
	const cells: [number, number][] = [];
	for (let k = 0; k < M && cells.length < nCoin; k++) {
		const r = R * Math.sqrt((k + 0.5) / M);
		const a = k * golden;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		if (!bitten(x, y)) cells.push([x, y]);
	}
	const rim = R * (1 - 2.4 / Math.sqrt(M));
	for (let k = 0; k < nCoin; k++, i++) {
		const [x, y] = cells[k % cells.length];
		s.set(i, x, y, 0, 1);
		// An apricot rim and a few apricot "deals" scattered over the brown coin.
		if (Math.hypot(x, y) > rim || rand() < 0.1) s.color(i, APRICOT);
	}
	// Crumbs: loosely held around the bites, falling away from the coin.
	for (let k = 0; k < nCrumbs; k++, i++) {
		const b = bites[k % bites.length];
		const a = b.a + (rand() - 0.5) * 1.4;
		const d = R + b.r * (0.2 + rand() * 1.2);
		s.set(i, Math.cos(a) * d, Math.sin(a) * d - rand() * 0.15, 0, 0.35);
		s.color(i, APRICOT);
	}
	ambient(s, i, N, rand);
	return { targets: s.targets, paint: s.paint };
}

// ── Stixiva: the grid, already stitched in thread colours ───────────────────────────────────

const stixBuild = (STIX_GRID as Extract<FormationSource, { kind: 'points' }>).build;
function buildStitched(ctx: BakeCtx): BakeResult {
	const r = stixBuild(ctx);
	return { ...r, paint: r.paintAlt ?? r.paint };
}

export const PROJECT_PLANET: FormationSource = { kind: 'points', build: buildPlanet };
export const PROJECT_RONGEUR: FormationSource = { kind: 'points', build: buildRongeur };
export const PROJECT_STIXIVA: FormationSource = { kind: 'points', build: buildStitched };

export interface ProjectVisual {
	source: FormationSource;
	/** Stage width / height (the formation's own proportions). */
	aspect: number;
	preset: Preset;
	/** Spun slowly around the vertical axis (3D formations). */
	spin: boolean;
	theme: ThemeName;
}

export const PROJECT_VISUALS: Record<ProjectSlug, ProjectVisual> = {
	'monsters-are-coming': { source: LUDO_CITY, aspect: CITY_ASPECT, preset: 'march', spin: false, theme: 'viewport' },
	'tabletop-game-shop-simulator': { source: LUDO_SHELVES, aspect: SHELVES_ASPECT, preset: 'calm', spin: false, theme: 'viewport' },
	invokyr: { source: LUDO_D20, aspect: 1, preset: 'calm', spin: true, theme: 'viewport' },
	'crazy-planet-survivor': { source: PROJECT_PLANET, aspect: 1, preset: 'calm', spin: true, theme: 'earth' },
	stixiva: { source: PROJECT_STIXIVA, aspect: 1.45, preset: 'calm', spin: false, theme: 'aida' },
	'le-rongeur': { source: PROJECT_RONGEUR, aspect: 1, preset: 'calm', spin: false, theme: 'rongeur' }
};
