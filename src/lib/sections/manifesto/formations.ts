// 02 · README formation (§5): `readme-flock`, a calm ambient flock bounded to the section.
//
// The hero's letters pour down into it (the anchor blends from 'hero-tall'), so most of the crowd
// gathers as a loose murmuration in the open band above the statement ([data-flock-zone]): a few
// soft Gaussian schools, dense at the core, feathered at the edge. A thin sprinkle sits around
// the copy so every line has a cluster in reach when its attractor fires, and the roamers mill
// round the schools. Every weight stays low (< .5): the flock is held, never pinned, and the curl
// wander keeps it breathing. Text blocks ([data-flock-avoid]) are never anyone's home.
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';

export const README_FLOCK_ID = 'readme-flock';

/** Share of the crowd in the schools / around the copy / roaming (weight 0, ≤ 25%). */
const SCHOOLS = 0.66;
const SPRINKLE = 0.16;
/** Clearance around text blocks, px. */
const PAD = 22;

interface Box {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

interface School {
	x: number;
	y: number;
	sx: number;
	sy: number;
	/** Cumulative pick weight. */
	acc: number;
}

function gauss(rand: () => number): number {
	// Box–Muller, clamped to ±2.6σ so no school leaks across the whole section.
	const r = Math.sqrt(-2 * Math.log(Math.max(1e-6, rand())));
	const g = r * Math.cos(rand() * Math.PI * 2);
	return Math.max(-2.6, Math.min(2.6, g));
}

function build({ N, w, h, rand, el }: BakeCtx): BakeResult {
	const targets = new Float32Array(N * 4);
	const box = el.getBoundingClientRect();
	const rel = (e: Element): Box => {
		const r = e.getBoundingClientRect();
		return { x0: r.left - box.left, y0: r.top - box.top, x1: r.right - box.left, y1: r.bottom - box.top };
	};
	const zoneEl = el.querySelector('[data-flock-zone]');
	const zone: Box = zoneEl ? rel(zoneEl) : { x0: 0, y0: h * 0.08, x1: w, y1: h * 0.4 };
	const avoid = [...el.querySelectorAll('[data-flock-avoid]')].map(rel);
	const blocked = (x: number, y: number, pad: number) =>
		avoid.some((b) => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad);

	// Schools strung along the band, alternating a little above / below its centre line.
	const zw = Math.max(1, zone.x1 - zone.x0);
	const zh = Math.max(1, zone.y1 - zone.y0);
	const count = w < 700 ? 3 : 5;
	const schools: School[] = [];
	let acc = 0;
	for (let k = 0; k < count; k++) {
		const t = (k + 0.5) / count;
		const a = 0.7 + rand() * 0.5;
		acc += a;
		schools.push({
			x: zone.x0 + zw * (t + (rand() - 0.5) * (0.5 / count)),
			y: zone.y0 + zh * (0.5 + (k % 2 ? 0.14 : -0.12) + (rand() - 0.5) * 0.12),
			sx: zw * (0.55 / count) * (0.8 + rand() * 0.4),
			sy: zh * (0.2 + rand() * 0.06),
			acc
		});
	}
	const inSchool = (out: [number, number]) => {
		for (let tries = 0; tries < 24; tries++) {
			const pick = rand() * acc;
			const s = schools.find((q) => pick <= q.acc) ?? schools[schools.length - 1];
			const x = s.x + gauss(rand) * s.sx;
			const y = s.y + gauss(rand) * s.sy;
			if (x < -8 || x > w + 8 || y < 0 || y > h) continue;
			if (blocked(x, y, PAD)) continue;
			out[0] = x;
			out[1] = y;
			return;
		}
		out[0] = zone.x0 + rand() * zw;
		out[1] = zone.y0 + rand() * zh;
	};
	// Around the copy: uniform over the section, outside the text, thinning toward its edges.
	const nearCopy = (out: [number, number]) => {
		for (let tries = 0; tries < 32; tries++) {
			const x = rand() * w;
			const y = rand() * h;
			if (blocked(x, y, PAD)) continue;
			const edge = Math.min(y, h - y) / Math.max(1, h * 0.12);
			if (rand() > Math.min(1, edge)) continue;
			out[0] = x;
			out[1] = y;
			return;
		}
		inSchool(out);
	};

	const nSchool = Math.round(N * SCHOOLS);
	const nSprinkle = Math.round(N * SPRINKLE);
	const p: [number, number] = [0, 0];
	for (let i = 0; i < N; i++) {
		const o = i * 4;
		let weight: number;
		if (i < nSchool) {
			inSchool(p);
			weight = 0.26 + rand() * 0.16;
		} else if (i < nSchool + nSprinkle) {
			nearCopy(p);
			weight = 0.14 + rand() * 0.1;
		} else {
			// Roamers (weight 0) home on the schools: the leash keeps them milling round the flock.
			inSchool(p);
			weight = 0;
		}
		targets[o] = (p[0] / Math.max(1, w)) * 2 - 1;
		targets[o + 1] = 1 - (p[1] / Math.max(1, h)) * 2;
		targets[o + 3] = weight;
	}
	return { targets };
}

export const README_FLOCK: FormationSource = { kind: 'points', build };
