// Hilbert ordering (§S2): the most important trick in the engine. Every formation's slots are
// sorted along the same order-8 Hilbert curve, so entity i is "left-ish" in every formation:
// neighbours stay neighbours through every transition and paths never cross the whole screen.

export const HILBERT_ORDER = 8;
const SIDE = 1 << HILBERT_ORDER; // 256 cells per axis, 65,536 keys

/** Distance along the Hilbert curve of cell (x, y), both in [0, 256). */
export function hilbertIndex(x: number, y: number): number {
	let d = 0;
	for (let s = SIDE >> 1; s > 0; s >>= 1) {
		const rx = (x & s) > 0 ? 1 : 0;
		const ry = (y & s) > 0 ? 1 : 0;
		d += s * s * ((3 * rx) ^ ry);
		// Rotate the quadrant so the sub-curve keeps its orientation.
		if (ry === 0) {
			if (rx === 1) {
				x = s - 1 - x;
				y = s - 1 - y;
			}
			const t = x;
			x = y;
			y = t;
		}
	}
	return d;
}

/**
 * Returns the slot permutation that sorts `targets` (N × vec4, xy used) along the curve:
 * `order[i]` is the original slot that becomes entity i. Positions are normalised to the slots'
 * own bounding box, so two bakes of the same shape at different widths (hero-wide / hero-tall)
 * map letter onto letter. Counting sort over the 65,536 keys: O(N), stable.
 */
export function hilbertOrder(targets: Float32Array, N: number): Uint32Array {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (let i = 0; i < N; i++) {
		const x = targets[i * 4];
		const y = targets[i * 4 + 1];
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
	const sx = (SIDE - 1) / Math.max(1e-6, maxX - minX);
	const sy = (SIDE - 1) / Math.max(1e-6, maxY - minY);

	const keys = new Uint32Array(N);
	const counts = new Uint32Array(SIDE * SIDE + 1);
	for (let i = 0; i < N; i++) {
		const cx = Math.min(SIDE - 1, Math.max(0, Math.round((targets[i * 4] - minX) * sx)));
		const cy = Math.min(SIDE - 1, Math.max(0, Math.round((targets[i * 4 + 1] - minY) * sy)));
		const k = hilbertIndex(cx, cy);
		keys[i] = k;
		counts[k + 1]++;
	}
	for (let k = 1; k < counts.length; k++) counts[k] += counts[k - 1];
	const order = new Uint32Array(N);
	for (let i = 0; i < N; i++) order[counts[keys[i]]++] = i;
	return order;
}

/** Applies `order` to an N × `stride` array (returns a new array of the same type). */
export function permute<T extends Float32Array | Uint8Array>(src: T, order: Uint32Array, stride: number): T {
	const out = new (src.constructor as { new (n: number): T })(src.length);
	for (let i = 0; i < order.length; i++) {
		const from = order[i] * stride;
		const to = i * stride;
		for (let c = 0; c < stride; c++) out[to + c] = src[from + c];
	}
	return out;
}
