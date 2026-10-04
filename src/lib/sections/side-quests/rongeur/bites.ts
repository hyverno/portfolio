// Le Rongeur's "bitten" geometry (DESIGN.md §5 04c), seeded per visit: the section's top and
// bottom edges (5–7 semicircular bites), the price's mask bites (a main circle plus two incisor
// satellites) and the divider blobs (a superellipse with 1–3 circular bites). Pure, no DOM.

export type Rand = () => number;

export function mulberry32(seed: number): Rand {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Server render and first paint use this; the client re-rolls once per visit. */
export const SSR_SEED = 0x7a7e;

let visit: number | null = null;

/** One seed per page visit (shared by every bitten shape on the page). */
export function visitSeed(): number {
	if (typeof window === 'undefined') return SSR_SEED;
	if (visit === null) {
		const buf = new Uint32Array(1);
		globalThis.crypto?.getRandomValues?.(buf);
		visit = buf[0] || Math.floor(Math.random() * 2 ** 32);
	}
	return visit;
}

/** A sub-stream for one consumer (`salt`), so the edge and the blobs do not share draws. */
export function stream(seed: number, salt: number): Rand {
	return mulberry32((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0);
}

// ── edges ────────────────────────────────────────────────────────────────────────────────────

export interface EdgeBite {
	/** Centre on the edge line, px. */
	x: number;
	/** Radius, px. */
	r: number;
}

/**
 * 5–7 non-overlapping semicircular bites along an edge `width` px long, sorted by x. The largest
 * one stays away from the ends (it hosts Pépite).
 */
export function edgeBites(rand: Rand, width: number, maxR: number): EdgeBite[] {
	const count = 5 + Math.floor(rand() * 3);
	const rMax = Math.max(18, Math.min(maxR, width * 0.06));
	const rMin = Math.max(12, rMax * 0.38);
	const out: EdgeBite[] = [];
	for (let tries = 0; out.length < count && tries < 400; tries++) {
		const r = rMin + (rMax - rMin) * rand() ** 1.6;
		const x = r + 6 + rand() * Math.max(1, width - 2 * (r + 6));
		if (out.some((b) => Math.abs(b.x - x) < b.r + r + 10)) continue;
		out.push({ x, r });
	}
	// The host bite: the largest, nudged inside 22%–78% of the width, and made the clear winner.
	if (out.length) {
		let host = out[0];
		for (const b of out) if (b.r > host.r) host = b;
		host.r = Math.max(host.r, rMax);
		const lo = width * 0.22;
		const hi = width * 0.78;
		if (host.x < lo || host.x > hi) {
			const x = lo + rand() * (hi - lo);
			const others = out.filter((b) => b !== host && Math.abs(b.x - x) < b.r + host.r + 10);
			for (const o of others) out.splice(out.indexOf(o), 1);
			host.x = x;
		}
	}
	return out.sort((a, b) => a.x - b.x);
}

export function largest(bites: EdgeBite[]): EdgeBite | null {
	let best: EdgeBite | null = null;
	for (const b of bites) if (!best || b.r > best.r) best = b;
	return best;
}

const f = (n: number) => Math.round(n * 10) / 10;

/**
 * The cream area of an edge band `w × h`, with its straight edge at `line` and the bites cut out
 * of it. `side: 'top'` = the cream lies below the line (section top); `'bottom'` = above it.
 * `scale` (0..1 per bite) lets the bites grow in.
 */
export function edgePath(
	w: number,
	h: number,
	line: number,
	bites: EdgeBite[],
	side: 'top' | 'bottom',
	scale: (i: number) => number = () => 1
): string {
	const parts: string[] = [];
	if (side === 'top') {
		parts.push(`M0 ${f(h)} L0 ${f(line)}`);
		bites.forEach((b, i) => {
			const r = b.r * scale(i);
			if (r < 0.5) return;
			parts.push(`L${f(b.x - r)} ${f(line)} A${f(r)} ${f(r)} 0 0 0 ${f(b.x + r)} ${f(line)}`);
		});
		parts.push(`L${f(w)} ${f(line)} L${f(w)} ${f(h)} Z`);
	} else {
		parts.push(`M0 0 L${f(w)} 0 L${f(w)} ${f(line)}`);
		for (let i = bites.length - 1; i >= 0; i--) {
			const b = bites[i];
			const r = b.r * scale(i);
			if (r < 0.5) continue;
			parts.push(`L${f(b.x + r)} ${f(line)} A${f(r)} ${f(r)} 0 0 0 ${f(b.x - r)} ${f(line)}`);
		}
		parts.push(`L0 ${f(line)} Z`);
	}
	return parts.join(' ');
}

/** Just the bitten outline (no closing sides), for the hairline stroke along the edge. */
export function edgeOutline(
	w: number,
	line: number,
	bites: EdgeBite[],
	side: 'top' | 'bottom',
	scale: (i: number) => number = () => 1
): string {
	const parts: string[] = [`M0 ${f(line)}`];
	for (let i = 0; i < bites.length; i++) {
		const b = bites[i];
		const r = b.r * scale(i);
		if (r < 0.5) continue;
		const sweep = side === 'top' ? 0 : 1;
		parts.push(`L${f(b.x - r)} ${f(line)} A${f(r)} ${f(r)} 0 0 ${sweep} ${f(b.x + r)} ${f(line)}`);
	}
	parts.push(`L${f(w)} ${f(line)}`);
	return parts.join(' ');
}

// ── price bites (CSS mask circles) ───────────────────────────────────────────────────────────

export interface Circle {
	/** Element-local px. */
	x: number;
	y: number;
	r: number;
}

/**
 * A bite at (x, y) of radius r inside a `w × h` box: the main circle plus two small "incisor"
 * satellites on its rim, on either side of the direction pointing into the box.
 */
export function biteCircles(x: number, y: number, r: number, w: number, h: number, rand: Rand): Circle[] {
	// Into the box: from the bite centre toward the box centre (a top-edge bite points down).
	let dx = w / 2 - x;
	let dy = h / 2 - y;
	const l = Math.hypot(dx, dy) || 1;
	dx /= l;
	dy /= l;
	const spread = 0.34 + rand() * 0.12;
	const tooth = r * (0.27 + rand() * 0.06);
	const out: Circle[] = [{ x, y, r }];
	for (const s of [-1, 1]) {
		const a = Math.atan2(dy, dx) + s * spread;
		out.push({ x: x + Math.cos(a) * r * 0.93, y: y + Math.sin(a) * r * 0.93, r: tooth });
	}
	return out;
}

/** A point on the box edge for an automatic bite (keyboard / scroll), plus a fitting radius. */
export function edgePoint(rand: Rand, w: number, h: number, edge: 'top' | 'bottom' | 'right' | 'left', t?: number): { x: number; y: number } {
	const u = t ?? 0.15 + rand() * 0.7;
	switch (edge) {
		case 'top':
			return { x: u * w, y: h * 0.04 };
		case 'bottom':
			return { x: u * w, y: h * 0.96 };
		case 'left':
			return { x: w * 0.01, y: u * h };
		default:
			return { x: w * 0.99, y: u * h };
	}
}

/** `mask-image` layers: every circle is transparent (bitten away); intersect them all. */
export function maskImage(circles: Circle[]): string {
	return circles
		.filter((c) => c.r > 0.3)
		.map(
			(c) =>
				`radial-gradient(circle at ${f(c.x)}px ${f(c.y)}px, transparent ${f(Math.max(0, c.r - 0.6))}px, #000 ${f(c.r + 0.6)}px)`
		)
		.join(', ');
}

// ── divider blobs ────────────────────────────────────────────────────────────────────────────

export interface Blob {
	/** Superellipse outline path in a `w × h` box. */
	d: string;
	/** Bites (circles) to subtract, in the same box. */
	bites: Circle[];
}

/** A superellipse (|x|ⁿ + |y|ⁿ = 1, n ∈ [2.4, 4]) with 1–3 circular bites on its rim. */
export function blob(rand: Rand, w: number, h: number): Blob {
	const n = 2.4 + rand() * 1.6;
	const a = w / 2 - 1;
	const b = h / 2 - 1;
	const pts: string[] = [];
	const steps = 72;
	for (let i = 0; i < steps; i++) {
		const t = (i / steps) * Math.PI * 2;
		const c = Math.cos(t);
		const s = Math.sin(t);
		const x = w / 2 + a * Math.sign(c) * Math.abs(c) ** (2 / n);
		const y = h / 2 + b * Math.sign(s) * Math.abs(s) ** (2 / n);
		pts.push(`${i ? 'L' : 'M'}${f(x)} ${f(y)}`);
	}
	const count = 1 + Math.floor(rand() * 3);
	const bites: Circle[] = [];
	const base = rand() * Math.PI * 2;
	for (let k = 0; k < count; k++) {
		const t = base + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.8;
		const c = Math.cos(t);
		const s = Math.sin(t);
		const r = Math.min(w, h) * (0.16 + rand() * 0.14);
		bites.push({
			x: w / 2 + a * Math.sign(c) * Math.abs(c) ** (2 / n),
			y: h / 2 + b * Math.sign(s) * Math.abs(s) ** (2 / n),
			r
		});
	}
	return { d: pts.join(' ') + ' Z', bites };
}
