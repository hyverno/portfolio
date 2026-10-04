// Image → thread mapping (DESIGN.md §5 04b): k-means (k = 10) fitted on the grid's pixels, every
// cluster snapped to the nearest of the ten threads with weighted RGB (2, 4, 3); optionally a
// Floyd–Steinberg pass over the snapped palette. Pure and deterministic (seeded k-means++).
import { THREADS, nearestThread, type RGB } from './palette.ts';

export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function d2(p: Float32Array, i: number, c: Float32Array, j: number): number {
	const dr = p[i * 3] - c[j * 3];
	const dg = p[i * 3 + 1] - c[j * 3 + 1];
	const db = p[i * 3 + 2] - c[j * 3 + 2];
	return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

export interface KMeans {
	/** k × rgb (0..255). */
	centroids: Float32Array;
	/** Cluster per pixel. */
	assign: Uint8Array;
	iterations: number;
}

/** Lloyd's k-means with k-means++ seeding, in the same weighted RGB space as the thread snap. */
export function kmeans(rgba: ArrayLike<number>, k = 10, seed = 0x5717_1a, maxIter = 32): KMeans {
	const n = Math.floor(rgba.length / 4);
	const p = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		p[i * 3] = rgba[i * 4];
		p[i * 3 + 1] = rgba[i * 4 + 1];
		p[i * 3 + 2] = rgba[i * 4 + 2];
	}
	const rand = mulberry32(seed);
	const c = new Float32Array(k * 3);
	const best = new Float32Array(n).fill(Infinity);

	// k-means++: each new centre drawn with probability ∝ distance² to the nearest chosen one.
	let first = Math.floor(rand() * n);
	c.set(p.subarray(first * 3, first * 3 + 3), 0);
	for (let j = 1; j < k; j++) {
		let sum = 0;
		for (let i = 0; i < n; i++) {
			const d = d2(p, i, c, j - 1);
			if (d < best[i]) best[i] = d;
			sum += best[i];
		}
		let pick = rand() * sum;
		first = n - 1;
		for (let i = 0; i < n; i++) {
			pick -= best[i];
			if (pick <= 0) {
				first = i;
				break;
			}
		}
		c.set(p.subarray(first * 3, first * 3 + 3), j * 3);
	}

	const assign = new Uint8Array(n);
	const sums = new Float64Array(k * 3);
	const counts = new Uint32Array(k);
	let it = 0;
	for (; it < maxIter; it++) {
		let changed = it === 0;
		for (let i = 0; i < n; i++) {
			let bj = 0;
			let bd = Infinity;
			for (let j = 0; j < k; j++) {
				const d = d2(p, i, c, j);
				if (d < bd) {
					bd = d;
					bj = j;
				}
			}
			if (assign[i] !== bj) {
				assign[i] = bj;
				changed = true;
			}
			best[i] = bd;
		}
		if (!changed) break;
		sums.fill(0);
		counts.fill(0);
		for (let i = 0; i < n; i++) {
			const j = assign[i];
			sums[j * 3] += p[i * 3];
			sums[j * 3 + 1] += p[i * 3 + 1];
			sums[j * 3 + 2] += p[i * 3 + 2];
			counts[j]++;
		}
		for (let j = 0; j < k; j++) {
			if (counts[j] === 0) {
				// Empty cluster: re-seed it on the worst-fitted pixel.
				let far = 0;
				for (let i = 1; i < n; i++) if (best[i] > best[far]) far = i;
				c.set(p.subarray(far * 3, far * 3 + 3), j * 3);
				best[far] = 0;
				continue;
			}
			c[j * 3] = sums[j * 3] / counts[j];
			c[j * 3 + 1] = sums[j * 3 + 1] / counts[j];
			c[j * 3 + 2] = sums[j * 3 + 2] / counts[j];
		}
	}
	return { centroids: c, assign, iterations: it };
}

/** Each cluster centre → its nearest thread (weighted RGB 2, 4, 3). */
export function snapClusters(km: KMeans): Uint8Array {
	const k = km.centroids.length / 3;
	const snap = new Uint8Array(k);
	for (let j = 0; j < k; j++) {
		snap[j] = nearestThread(km.centroids[j * 3], km.centroids[j * 3 + 1], km.centroids[j * 3 + 2]);
	}
	return snap;
}

/**
 * Floyd–Steinberg (serpentine) over `palette` (thread indices). Returns a thread index per pixel.
 * Error is clamped so a long run of one colour cannot blow up into noise at the edges.
 */
export function floydSteinberg(
	rgba: ArrayLike<number>,
	w: number,
	h: number,
	palette: readonly number[]
): Uint8Array {
	const out = new Uint8Array(w * h);
	const err = new Float32Array((w + 2) * 3 * 2);
	const row = (y: number) => (y & 1) * (w + 2) * 3;
	const cols: RGB[] = THREADS.map((t) => t.rgb);
	for (let y = 0; y < h; y++) {
		const cur = row(y);
		const nxt = row(y + 1);
		err.fill(0, nxt, nxt + (w + 2) * 3);
		const ltr = (y & 1) === 0;
		for (let s = 0; s < w; s++) {
			const x = ltr ? s : w - 1 - s;
			const o = (y * w + x) * 4;
			const e = cur + (x + 1) * 3;
			const r = rgba[o] + err[e];
			const g = rgba[o + 1] + err[e + 1];
			const b = rgba[o + 2] + err[e + 2];
			const t = nearestThread(r, g, b, palette);
			out[y * w + x] = t;
			const c = cols[t];
			const er = Math.max(-96, Math.min(96, r - c[0]));
			const eg = Math.max(-96, Math.min(96, g - c[1]));
			const eb = Math.max(-96, Math.min(96, b - c[2]));
			const dir = ltr ? 1 : -1;
			const add = (base: number, dx: number, f: number) => {
				const i = base + (x + 1 + dx) * 3;
				err[i] += er * f;
				err[i + 1] += eg * f;
				err[i + 2] += eb * f;
			};
			add(cur, dir, 7 / 16);
			add(nxt, -dir, 3 / 16);
			add(nxt, 0, 5 / 16);
			add(nxt, dir, 1 / 16);
		}
	}
	return out;
}

export interface Mapping {
	/** Thread index per cell (row-major). */
	thread: Uint8Array;
	/** Stitches per thread over the whole pattern (10). */
	counts: Uint32Array;
	/** cum[col * 10 + t] = stitches of thread t in columns [0, col). Length (cols + 1) × 10. */
	cum: Uint32Array;
	/** Threads actually used, palette order. */
	used: number[];
}

export function tally(thread: Uint8Array, cols: number, rows: number): Mapping {
	const T = THREADS.length;
	const counts = new Uint32Array(T);
	const cum = new Uint32Array((cols + 1) * T);
	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) counts[thread[y * cols + x]]++;
		cum.set(counts, (x + 1) * T);
	}
	const used: number[] = [];
	for (let t = 0; t < T; t++) if (counts[t] > 0) used.push(t);
	return { thread, counts, cum, used };
}

/** Full fit: k-means → snapped mapping, plus the dithered variant over the same palette. */
export function quantize(
	rgba: Uint8ClampedArray,
	cols: number,
	rows: number,
	seed?: number
): { plain: Mapping; dithered: Mapping; km: KMeans; snap: Uint8Array } {
	const km = kmeans(rgba, 10, seed);
	const snap = snapClusters(km);
	const thread = new Uint8Array(cols * rows);
	for (let i = 0; i < thread.length; i++) thread[i] = snap[km.assign[i]];
	const plain = tally(thread, cols, rows);
	const dithered = tally(floydSteinberg(rgba, cols, rows, plain.used), cols, rows);
	return { plain, dithered, km, snap };
}

