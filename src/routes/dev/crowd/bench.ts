// Test formations for the dev bench: one per baker kind, plus paint, named slots and a 3D shape.
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';

/** Ring + inner disc, painted with a hue ramp (paint) and a 5-colour palette (paintAlt). One named slot. */
export const circle: FormationSource = {
	kind: 'points',
	build({ N, w, h, rand }: BakeCtx): BakeResult {
		const targets = new Float32Array(N * 4);
		const paint = new Uint8Array(N * 4);
		const paintAlt = new Uint8Array(N * 4);
		const palette = [
			[183, 51, 44],
			[34, 64, 107],
			[217, 164, 65],
			[47, 93, 70],
			[236, 233, 225]
		];
		const R = Math.min(w, h) * 0.46;
		const ring = Math.floor(N * 0.4);
		const disc = Math.floor(N * 0.35);
		for (let i = 0; i < N; i++) {
			const o = i * 4;
			let r: number;
			let a: number;
			let weight = 1;
			if (i < ring) {
				a = (i / ring) * Math.PI * 2;
				r = R * (0.92 + rand() * 0.08);
			} else if (i < ring + disc) {
				const k = i - ring;
				a = k * 2.399963;
				r = R * 0.62 * Math.sqrt((k + 0.5) / disc);
			} else {
				a = rand() * Math.PI * 2;
				r = R * (1.1 + rand() * 0.6);
				weight = 0;
			}
			targets[o] = (Math.cos(a) * r) / (w / 2);
			targets[o + 1] = (Math.sin(a) * r) / (h / 2);
			targets[o + 3] = weight;
			const hue = a / (Math.PI * 2);
			paint[o] = 120 + 120 * Math.cos(hue * 6.283);
			paint[o + 1] = 120 + 120 * Math.cos((hue - 0.33) * 6.283);
			paint[o + 2] = 120 + 120 * Math.cos((hue - 0.66) * 6.283);
			paint[o + 3] = i < ring ? 255 : 0;
			const c = palette[Math.floor(rand() * palette.length)];
			paintAlt[o] = c[0];
			paintAlt[o + 1] = c[1];
			paintAlt[o + 2] = c[2];
			paintAlt[o + 3] = 255;
		}
		return { targets, paint, paintAlt, named: { peon: ring + 7 } };
	}
};

/** The 30 deduplicated edges of an icosahedron as 3D targets (rotated through the region matrix). */
export const d20: FormationSource = {
	kind: 'points',
	build({ N, w, h, rand }: BakeCtx): BakeResult {
		const p = (1 + Math.sqrt(5)) / 2;
		const v = [
			[-1, p, 0],
			[1, p, 0],
			[-1, -p, 0],
			[1, -p, 0],
			[0, -1, p],
			[0, 1, p],
			[0, -1, -p],
			[0, 1, -p],
			[p, 0, -1],
			[p, 0, 1],
			[-p, 0, -1],
			[-p, 0, 1]
		];
		const edges: [number, number][] = [];
		for (let i = 0; i < 12; i++) {
			for (let j = i + 1; j < 12; j++) {
				const d = Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
				if (Math.abs(d - 2) < 1e-3) edges.push([i, j]);
			}
		}
		const targets = new Float32Array(N * 4);
		const used = Math.floor(N * 0.8);
		const s = 0.9 / Math.hypot(1, p);
		// Square in px: shrink the wider axis.
		const sx = Math.min(1, h / w);
		const sy = Math.min(1, w / h);
		for (let i = 0; i < N; i++) {
			const o = i * 4;
			if (i >= used) {
				targets[o] = (rand() * 2 - 1) * 1.2;
				targets[o + 1] = (rand() * 2 - 1) * 1.2;
				continue;
			}
			const [a, b] = edges[i % edges.length];
			const t = rand();
			targets[o] = (v[a][0] + (v[b][0] - v[a][0]) * t) * s * sx;
			targets[o + 1] = (v[a][1] + (v[b][1] - v[a][1]) * t) * s * sy;
			targets[o + 2] = (v[a][2] + (v[b][2] - v[a][2]) * t) * s;
			targets[o + 3] = 1;
		}
		return { targets };
	}
};

export const stream: FormationSource = {
	kind: 'paths',
	viewBox: [1000, 600],
	speed: 0.12,
	color: '#F2894B',
	share: 0.7,
	paths: [
		'M20 80 C 300 40, 500 260, 960 300',
		'M20 200 C 260 180, 520 360, 960 300',
		'M20 320 C 300 300, 620 260, 960 300',
		'M20 440 C 340 520, 600 320, 960 300',
		'M20 560 C 360 600, 700 420, 960 300'
	]
};

/** A house on stilts, sampled along its stroke. */
export const house: FormationSource = {
	kind: 'svg',
	viewBox: [200, 200],
	mode: 'stroke',
	share: 0.75,
	paths: [
		'M40 120 L100 50 L160 120 Z',
		'M55 120 L55 165 L145 165 L145 120',
		'M60 165 L60 195 M140 165 L140 195 M88 165 L88 135 L112 135 L112 165'
	]
};
