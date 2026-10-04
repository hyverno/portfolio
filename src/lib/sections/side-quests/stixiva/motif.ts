// The "image in": a procedural polar rose r = cos(5θ) with radial gradients, rasterised at the
// stitch grid's resolution (72×48 desktop, 48×32 mobile) into an RGBA ImageData buffer. It is
// computed analytically with 4×4 supersampling instead of being painted by a browser canvas, so
// the crowd's paint, the k-means fit and the Canvas2D chart all see the exact same pixels on
// every engine (and the fit is unit-testable under Node). No imports, no DOM.

type C3 = [number, number, number];

const LIN: C3 = [233, 223, 201];
const LILAS: C3 = [169, 154, 201];
const PRUSSE: C3 = [34, 64, 107];
const GARANCE: C3 = [183, 51, 44];
const CORAIL: C3 = [240, 117, 97];
const ROSE: C3 = [232, 160, 166];
const BOUTEILLE: C3 = [47, 93, 70];
const SAUGE: C3 = [143, 169, 139];
const OCRE: C3 = [217, 164, 65];
const ENCRE: C3 = [27, 27, 27];

/** Petal length, leaf length, heart radius, ink rim: in half grid heights. */
const PETAL_R = 0.97;
const LEAF_R = 0.82;
const HEART_R = 0.27;
const RIM = 0.1;
const SS = 4;
/** Flank distances count this many times over: the outline stays thin along the slim lobes. */
const FLANK = 3;

function mix(a: C3, b: C3, t: number, out: C3): C3 {
	const k = t < 0 ? 0 : t > 1 ? 1 : t;
	out[0] = a[0] + (b[0] - a[0]) * k;
	out[1] = a[1] + (b[1] - a[1]) * k;
	out[2] = a[2] + (b[2] - a[2]) * k;
	return out;
}

function set(c: C3, out: C3): C3 {
	out[0] = c[0];
	out[1] = c[1];
	out[2] = c[2];
	return out;
}

/** GLSL smoothstep. */
function ss(e0: number, e1: number, x: number): number {
	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
}

/**
 * Colour at a point; `u`, `v` centred, in half grid heights, v down.
 * Back to front: concentric vignette (linen halo, lilac ring, prussian corners), five leaves (the
 * rose turned 36°: bottle green → sage), five petals (r = cos 5θ, madder → coral → pink, inked
 * rim as a backstitch would be), an ochre heart.
 */
const LOBE = (2 * Math.PI) / 5;

/**
 * One lobe family of the rose ρ = R·cos(5θ): returns the distance inside the nearest lobe's outline
 * (≥ 0 inside, -1 outside). The tip is measured radially, the flanks across the lobe, so the ink
 * rim follows the whole outline like a backstitch.
 */
function lobe(rho: number, theta: number, R: number, turn: number): number {
	let phi = (theta + turn) % LOBE;
	if (phi < -LOBE / 2) phi += LOBE;
	else if (phi >= LOBE / 2) phi -= LOBE;
	const c = Math.cos(5 * phi);
	if (c <= 0 || rho >= R * c) return -1;
	const tip = R * c - rho;
	const flank = rho * Math.sin(Math.acos(Math.min(1, rho / R)) / 5 - Math.abs(phi));
	return Math.min(tip, Math.max(0, flank) * FLANK);
}

function shade(u: number, v: number, out: C3): C3 {
	const rho = Math.hypot(u, v);
	// θ = 0 points straight up, so the rose stands on its stem axis.
	const theta = Math.atan2(-v, u) - Math.PI / 2;

	if (rho < 1.1) set(LIN, out);
	else if (rho < 1.42) mix(LIN, LILAS, ss(1.1, 1.13, rho), out);
	else mix(LILAS, PRUSSE, ss(1.42, 1.45, rho), out);

	// Leaves: the same rose turned by π/5, so they sit in the gaps between the petals.
	const leaf = lobe(rho, theta, LEAF_R, Math.PI / 5);
	if (leaf >= 0) {
		mix(BOUTEILLE, SAUGE, ss(0.42, 0.56, rho / LEAF_R), out);
		if (leaf < RIM * 0.75) set(ENCRE, out);
	}

	// Petals: r = cos(5θ), a radial gradient from a madder heart to pink tips.
	const petal = lobe(rho, theta, PETAL_R, 0);
	if (petal >= 0) {
		const t = rho / PETAL_R;
		if (t < 0.5) mix(GARANCE, CORAIL, ss(0.3, 0.4, t), out);
		else mix(CORAIL, ROSE, ss(0.6, 0.7, t), out);
		if (petal < RIM && rho > HEART_R) set(ENCRE, out);
	}

	if (rho < HEART_R) {
		set(OCRE, out);
		if (rho > HEART_R - 0.05) set(ENCRE, out);
	}
	return out;
}

/** RGBA, row-major, `cols × rows`. Pure and deterministic. */
export function roseMotif(cols: number, rows: number): Uint8ClampedArray {
	const data = new Uint8ClampedArray(cols * rows * 4);
	const half = rows / 2;
	const acc: C3 = [0, 0, 0];
	const c: C3 = [0, 0, 0];
	const n = SS * SS;
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			acc[0] = acc[1] = acc[2] = 0;
			for (let sy = 0; sy < SS; sy++) {
				for (let sx = 0; sx < SS; sx++) {
					shade((x + (sx + 0.5) / SS - cols / 2) / half, (y + (sy + 0.5) / SS - half) / half, c);
					acc[0] += c[0];
					acc[1] += c[1];
					acc[2] += c[2];
				}
			}
			const o = (y * cols + x) * 4;
			data[o] = acc[0] / n;
			data[o + 1] = acc[1] / n;
			data[o + 2] = acc[2] / n;
			data[o + 3] = 255;
		}
	}
	return data;
}
