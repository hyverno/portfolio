// Static procedural SVG stills for the WebGL cells (§7 "No WebGL": the Canvas2D cells keep
// running, the WebGL ones show these). Seeded and pure, so the SSR markup and the client agree;
// colours are theme tokens, so a still follows the page theme like everything else.
import type { LabId } from '#lib/content/types';

const VW = 320;
const VH = 200;

function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** The Damage Number Hose, frozen: a fountain of digits on ballistic arcs out of one nozzle. */
function numbersStill(): string {
	const rand = rng(1445);
	const ox = 160;
	const oy = 192;
	const g = 300;
	let out = '';
	for (let i = 0; i < 150; i++) {
		const a = -Math.PI / 2 + (rand() - 0.5) * 1.1;
		const sp = Math.sqrt(2 * g * (45 + rand() * 135));
		const t = 0.04 + rand() * 0.86;
		const x = ox + Math.cos(a) * sp * t;
		const y = oy + Math.sin(a) * sp * t + 0.5 * g * t * t;
		if (y > VH - 2 || y < 8 || x < 6 || x > VW - 6) continue;
		const crit = rand() < 0.1;
		const v = Math.round((8 + rand() ** 2 * 480) * (crit ? 2.5 : 1));
		const pop = t < 0.12 ? 0.55 + (t / 0.12) * 0.45 : 1;
		const size = (crit ? 12.5 : 8.5) * pop;
		const op = t > 0.7 ? Math.max(0.15, r1(1 - (t - 0.7) / 0.2)) : 1;
		out += `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(size)}"${crit ? ' class="s"' : ''}${op < 1 ? ` opacity="${op}"` : ''}>${v}${crit ? '!' : ''}</text>`;
	}
	return (
		`<g class="num">${out}</g>` +
		// Spawner gizmo: circle + dot.
		`<circle class="ring" cx="${ox}" cy="${oy}" r="6"/><circle class="s" cx="${ox}" cy="${oy}" r="1.6"/>`
	);
}

/** Perspective helper shared by the 3D stills: eye at (0, ey, ez) looking at the origin. */
function camera(ey: number, ez: number, f: number, cx: number, cy: number) {
	const len = Math.hypot(ey, ez);
	const fy = -ey / len;
	const fz = -ez / len;
	// up = (0, 1, 0) orthogonalised against forward.
	const uy = -fz;
	const uz = fy;
	return (x: number, y: number, z: number): [number, number, number] => {
		const px = x;
		const py = y - ey;
		const pz = z - ez;
		const d = py * fy + pz * fz;
		const sy = py * uy + pz * uz;
		return [cx + (px / d) * f, cy - (sy / d) * f, d];
	};
}

/** System in system: four bursts of sparks at different ages and two climbing rockets, over an editor grid. */
function nestedStill(): string {
	const rand = rng(64);
	// Low eye, far back: the bursts sit in the upper middle, the editor floor in the bottom fifth.
	const F = 330;
	const P = camera(1.2, 8.5, F, VW / 2, VH * 0.86);
	let grid = '';
	for (let k = -4; k <= 4; k++) {
		const a = P(k, 0, -4);
		const b = P(k, 0, 4);
		const c = P(-4, 0, k);
		const d = P(4, 0, k);
		grid += `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}M${r1(c[0])} ${r1(c[1])}L${r1(d[0])} ${r1(d[1])}`;
	}
	let dots = '';
	let heads = '';
	// x, y, z, age (s), size.
	const bursts = [
		[-1.15, 2.85, -0.6, 0.35, 1.1],
		[0.95, 3.2, -1.2, 0.75, 1.15],
		[0.25, 2.25, 0.8, 1.1, 0.9],
		[-0.3, 3.65, -2.4, 0.12, 0.7]
	];
	for (const [bx, by, bz, age, size] of bursts) {
		const travel = (1 - Math.exp(-1.7 * age)) / 1.7;
		for (let s = 0; s < 64; s++) {
			const y = 1 - (2 * (s + 0.5)) / 64;
			const rr = Math.sqrt(1 - y * y);
			const phi = s * 2.39996 + bx * 3;
			const sp = (1.3 + rand() * 0.5) * size;
			const X = bx + Math.cos(phi) * rr * sp * travel;
			const Y = by + y * sp * travel - 0.55 * age * age;
			const Z = bz + Math.sin(phi) * rr * sp * travel;
			const [px, py, dd] = P(X, Y, Z);
			const k = age / 1.6;
			dots += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(Math.max(0.6, ((0.05 * Math.sqrt(1 - k) + 0.012) * F) / dd / 1.6))}"${k > 0.55 ? ` opacity="${r1(1 - (k - 0.55) / 0.45)}"` : ''}/>`;
		}
	}
	// Two rockets still climbing, trails sampled back in time.
	for (const [x0, z0, h] of [
		[0.7, 0.4, 1.9],
		[-1.9, 0.9, 1.15]
	]) {
		for (let k = 1; k < 18; k++) {
			const [px, py, dd] = P(x0, h - k * 0.09, z0);
			dots += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(Math.max(0.45, (0.045 * (1 - k / 18) * F) / dd / 1.6))}" opacity="${r1(0.85 * (1 - k / 18))}"/>`;
		}
		const [hx, hy] = P(x0, h, z0);
		heads += `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="2.1"/>`;
	}
	return `<path class="grid" d="${grid}"/>` + `<g class="i">${dots}</g><g class="s">${heads}</g>`;
}

/** Gerstner water as ink contours: marching squares over the analytic height, seen in perspective. */
function waterStill(): string {
	const P = camera(2.6, 5.4, 300, VW / 2, VH * 0.42);
	const waves = [
		[1, 0.2, 1.6, 0.24],
		[0.7, 0.75, 1.1, 0.18],
		[-0.4, 1, 0.85, 0.14],
		[0.95, -0.35, 0.62, 0.1]
	];
	const height = (x: number, z: number) => {
		let h = 0;
		for (const [dx, dz, L, s] of waves) {
			const l = Math.hypot(dx, dz);
			const k = (Math.PI * 2) / L;
			h += (s / k) * Math.sin(k * ((dx / l) * x + (dz / l) * z) + L * 3.1);
		}
		return h;
	};
	const N = 44;
	const S = 4;
	const at = (i: number) => -S + (i / N) * S * 2;
	const hs = new Float32Array((N + 1) * (N + 1));
	for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hs[j * (N + 1) + i] = height(at(i), at(j)) * 24;
	let d = '';
	const pt = (x: number, z: number, lv: number) => {
		const [px, py] = P(x, lv / 24, z);
		return `${Math.round(px)} ${Math.round(py)}`;
	};
	for (let j = 0; j < N; j++) {
		for (let i = 0; i < N; i++) {
			const a = hs[j * (N + 1) + i];
			const b = hs[j * (N + 1) + i + 1];
			const c = hs[(j + 1) * (N + 1) + i + 1];
			const e = hs[(j + 1) * (N + 1) + i];
			const lo = Math.ceil(Math.min(a, b, c, e));
			const hi = Math.floor(Math.max(a, b, c, e));
			for (let lv = lo; lv <= hi; lv++) {
				const pts: [number, number][] = [];
				const edge = (h0: number, h1: number, x0: number, z0: number, x1: number, z1: number) => {
					if ((h0 < lv) === (h1 < lv) || h0 === h1) return;
					const t = (lv - h0) / (h1 - h0);
					pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
				};
				const x0 = at(i);
				const x1 = at(i + 1);
				const z0 = at(j);
				const z1 = at(j + 1);
				edge(a, b, x0, z0, x1, z0);
				edge(b, c, x1, z0, x1, z1);
				edge(c, e, x1, z1, x0, z1);
				edge(e, a, x0, z1, x0, z0);
				for (let k = 0; k + 1 < pts.length; k += 2) {
					d += `M${pt(pts[k][0], pts[k][1], lv)}L${pt(pts[k + 1][0], pts[k + 1][1], lv)}`;
				}
			}
		}
	}
	// The patch outline.
	const c0 = P(-S, 0, -S);
	const c1 = P(S, 0, -S);
	const c2 = P(S, 0, S);
	const c3 = P(-S, 0, S);
	const outline = `M${r1(c0[0])} ${r1(c0[1])}L${r1(c1[0])} ${r1(c1[1])}L${r1(c2[0])} ${r1(c2[1])}L${r1(c3[0])} ${r1(c3[1])}Z`;
	return (
		`<path class="grid" d="${outline}"/>` + `<path class="line" d="${d}"/>`
	);
}

const cache = new Map<LabId, string>();

/** The still's inner SVG markup (wrap it in a `viewBox="0 0 320 200"` svg). */
export function still(id: LabId): string {
	let s = cache.get(id);
	if (s !== undefined) return s;
	s = id === 'numbers' ? numbersStill() : id === 'nested' ? nestedStill() : id === 'water' ? waterStill() : '';
	cache.set(id, s);
	return s;
}

export const STILL_VIEWBOX = `0 0 ${VW} ${VH}`;
