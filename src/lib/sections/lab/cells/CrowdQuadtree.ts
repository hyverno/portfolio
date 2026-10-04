// Lab cell 01 · CROWD SIM (web recreation of the UE4 + Flecs crowd). Canvas2D.
// 2,048 agents steer through a drifting flow field around three pillars; a point quadtree is
// rebuilt from scratch every step (in-place partition, zero allocations) and answers every
// neighbour query for separation. [Q] draws it in cobalt; the pointer runs a live range query
// (visited leaves tinted, hits in signal); a press shoves the agents around it.
// The HUD depth is the deepest leaf of the tree actually built this frame.
import { createLoop } from './loop';
import { fitCanvas, pal, rgba, usePalette } from './palette';
import type { LabCellImpl, PointerInfo } from './types';

export const AGENTS = 2048;
/** Points per leaf before it splits. */
const CAP = 6;
const MAX_DEPTH = 9;
const MAX_NODES = 8192;
/** Separation radius, CSS px. */
const SEP_R = 6.5;
const QUERY_R = 34;
const PING_R = 72;

export interface CrowdOptions {
	reducedMotion?: () => boolean;
}

export function create(canvas: HTMLCanvasElement, opts: CrowdOptions = {}): LabCellImpl & {
	toggleQuadtree(on?: boolean): boolean;
} {
	const ctx = canvas.getContext('2d', { alpha: true })!;
	const releasePalette = usePalette();

	let W = 400;
	let H = 250;
	let dpr = 1;
	let time = Math.random() * 100;
	let showTree = true;

	// ── agents ───────────────────────────────────────────────────────────────────────────────
	const px = new Float32Array(AGENTS);
	const py = new Float32Array(AGENTS);
	const vx = new Float32Array(AGENTS);
	const vy = new Float32Array(AGENTS);
	const nvx = new Float32Array(AGENTS);
	const nvy = new Float32Array(AGENTS);
	const speed = new Float32Array(AGENTS);
	const hit = new Uint8Array(AGENTS);
	for (let i = 0; i < AGENTS; i++) {
		px[i] = Math.random() * W;
		py[i] = Math.random() * H;
		speed[i] = 16 + Math.random() * 18;
		const a = Math.random() * Math.PI * 2;
		vx[i] = Math.cos(a) * speed[i];
		vy[i] = Math.sin(a) * speed[i];
	}

	// Pillars in viewport fractions (x, y, r × H): "recoded collision" against static colliders.
	const PILLARS = [
		[0.27, 0.42, 0.11],
		[0.6, 0.7, 0.13],
		[0.79, 0.3, 0.085]
	] as const;

	/** Pillars in px for the current size (x, y, r), rewritten every step: no allocation. */
	const pillarsPx = new Float32Array(PILLARS.length * 3);

	// ── quadtree (flat arrays) ───────────────────────────────────────────────────────────────
	const nx0 = new Float32Array(MAX_NODES);
	const ny0 = new Float32Array(MAX_NODES);
	const nx1 = new Float32Array(MAX_NODES);
	const ny1 = new Float32Array(MAX_NODES);
	const nChild = new Int32Array(MAX_NODES);
	const nStart = new Int32Array(MAX_NODES);
	const nCount = new Int32Array(MAX_NODES);
	const nDepth = new Uint8Array(MAX_NODES);
	const idx = new Int32Array(AGENTS);
	const tmp = new Int32Array(AGENTS);
	const quadOf = new Uint8Array(AGENTS);
	const stack = new Int32Array(MAX_DEPTH * 4 + 8);
	const visited = new Int32Array(MAX_NODES);
	let nodes = 0;
	let leaves = 0;
	let depth = 0;
	let visitedN = 0;

	function alloc(x0: number, y0: number, x1: number, y1: number, d: number): number {
		const n = nodes++;
		nx0[n] = x0;
		ny0[n] = y0;
		nx1[n] = x1;
		ny1[n] = y1;
		nDepth[n] = d;
		nChild[n] = -1;
		return n;
	}

	function split(node: number, start: number, end: number) {
		const count = end - start;
		const d = nDepth[node];
		nStart[node] = start;
		nCount[node] = count;
		if (count <= CAP || d >= MAX_DEPTH || nodes + 4 > MAX_NODES) {
			leaves++;
			if (d > depth) depth = d;
			return;
		}
		const x0 = nx0[node];
		const y0 = ny0[node];
		const x1 = nx1[node];
		const y1 = ny1[node];
		const mx = (x0 + x1) * 0.5;
		const my = (y0 + y1) * 0.5;
		let c0 = 0;
		let c1 = 0;
		let c2 = 0;
		for (let k = start; k < end; k++) {
			const i = idx[k];
			const q = (px[i] >= mx ? 1 : 0) + (py[i] >= my ? 2 : 0);
			quadOf[k - start] = q;
			if (q === 0) c0++;
			else if (q === 1) c1++;
			else if (q === 2) c2++;
		}
		// Counting sort of the node's range into quadrant order.
		let o0 = start;
		let o1 = start + c0;
		let o2 = o1 + c1;
		let o3 = o2 + c2;
		const s1 = o1;
		const s2 = o2;
		const s3 = o3;
		for (let k = start; k < end; k++) {
			const q = quadOf[k - start];
			const i = idx[k];
			if (q === 0) tmp[o0++] = i;
			else if (q === 1) tmp[o1++] = i;
			else if (q === 2) tmp[o2++] = i;
			else tmp[o3++] = i;
		}
		for (let k = start; k < end; k++) idx[k] = tmp[k];
		const first = nodes;
		nChild[node] = first;
		alloc(x0, y0, mx, my, d + 1);
		alloc(mx, y0, x1, my, d + 1);
		alloc(x0, my, mx, y1, d + 1);
		alloc(mx, my, x1, y1, d + 1);
		split(first, start, s1);
		split(first + 1, s1, s2);
		split(first + 2, s2, s3);
		split(first + 3, s3, end);
	}

	let buildMs = 0;
	let publishedAt = -1;
	function build() {
		const t0 = performance.now();
		nodes = 0;
		leaves = 0;
		depth = 0;
		for (let i = 0; i < AGENTS; i++) idx[i] = i;
		alloc(0, 0, W, H, 0);
		split(0, 0, AGENTS);
		buildMs = performance.now() - t0;
	}

	/** Circle vs node AABB. */
	function touches(n: number, x: number, y: number, r: number): boolean {
		const cx = x < nx0[n] ? nx0[n] : x > nx1[n] ? nx1[n] : x;
		const cy = y < ny0[n] ? ny0[n] : y > ny1[n] ? ny1[n] : y;
		const dx = x - cx;
		const dy = y - cy;
		return dx * dx + dy * dy <= r * r;
	}

	let sepX = 0;
	let sepY = 0;
	/** Separation push for agent i from its neighbours inside SEP_R (quadtree query). */
	function separation(i: number) {
		const x = px[i];
		const y = py[i];
		const r2 = SEP_R * SEP_R;
		sepX = 0;
		sepY = 0;
		let found = 0;
		let sp = 0;
		stack[sp++] = 0;
		while (sp > 0 && found < 10) {
			const n = stack[--sp];
			if (!touches(n, x, y, SEP_R)) continue;
			const c = nChild[n];
			if (c >= 0) {
				stack[sp++] = c;
				stack[sp++] = c + 1;
				stack[sp++] = c + 2;
				stack[sp++] = c + 3;
				continue;
			}
			const end = nStart[n] + nCount[n];
			for (let k = nStart[n]; k < end; k++) {
				const j = idx[k];
				if (j === i) continue;
				const dx = x - px[j];
				const dy = y - py[j];
				const d2 = dx * dx + dy * dy;
				if (d2 >= r2 || d2 < 1e-6) continue;
				const d = Math.sqrt(d2);
				const k2 = (SEP_R - d) / SEP_R;
				sepX += (dx / d) * k2;
				sepY += (dy / d) * k2;
				found++;
			}
		}
	}

	// ── pointer query ────────────────────────────────────────────────────────────────────────
	const ptr = { x: 0, y: 0, inside: false, down: false };
	let hits = 0;
	function query() {
		hit.fill(0);
		hits = 0;
		visitedN = 0;
		if (!ptr.inside) return;
		const r = QUERY_R;
		const r2 = r * r;
		let sp = 0;
		stack[sp++] = 0;
		while (sp > 0) {
			const n = stack[--sp];
			if (!touches(n, ptr.x, ptr.y, r)) continue;
			visited[visitedN++] = n;
			const c = nChild[n];
			if (c >= 0) {
				stack[sp++] = c;
				stack[sp++] = c + 1;
				stack[sp++] = c + 2;
				stack[sp++] = c + 3;
				continue;
			}
			const end = nStart[n] + nCount[n];
			for (let k = nStart[n]; k < end; k++) {
				const j = idx[k];
				const dx = ptr.x - px[j];
				const dy = ptr.y - py[j];
				if (dx * dx + dy * dy <= r2) {
					hit[j] = 1;
					hits++;
				}
			}
		}
	}

	function ping(x: number, y: number) {
		for (let i = 0; i < AGENTS; i++) {
			const dx = px[i] - x;
			const dy = py[i] - y;
			const d2 = dx * dx + dy * dy;
			if (d2 > PING_R * PING_R || d2 < 1e-4) continue;
			const d = Math.sqrt(d2);
			const k = (1 - d / PING_R) * 150;
			vx[i] += (dx / d) * k;
			vy[i] += (dy / d) * k;
		}
	}

	// ── simulation ───────────────────────────────────────────────────────────────────────────
	/** A drifting, swirling heading field: three sine layers, so streams form, merge and split. */
	function heading(x: number, y: number, t: number): number {
		return (
			2.1 * Math.sin(x * 0.0105 + t * 0.21) +
			1.6 * Math.cos(y * 0.0155 - t * 0.17) +
			1.2 * Math.sin((x - y) * 0.0062 + t * 0.09)
		);
	}

	function step(dt: number) {
		time += dt;
		build();
		const blend = 1 - Math.exp(-dt * 2.6);
		for (let p = 0; p < PILLARS.length; p++) {
			pillarsPx[p * 3] = PILLARS[p][0] * W;
			pillarsPx[p * 3 + 1] = PILLARS[p][1] * H;
			pillarsPx[p * 3 + 2] = PILLARS[p][2] * H;
		}
		for (let i = 0; i < AGENTS; i++) {
			const x = px[i];
			const y = py[i];
			const a = heading(x, y, time);
			let dx = Math.cos(a) * speed[i];
			let dy = Math.sin(a) * speed[i];
			separation(i);
			dx += sepX * 34;
			dy += sepY * 34;
			// Pillars: push out of the margin and turn the flow tangent, so streams split round them.
			for (let p = 0; p < pillarsPx.length; p += 3) {
				const ox = x - pillarsPx[p];
				const oy = y - pillarsPx[p + 1];
				const R = pillarsPx[p + 2];
				const d = Math.hypot(ox, oy);
				const margin = R + 9;
				if (d >= margin || d < 1e-4) continue;
				const nx = ox / d;
				const ny = oy / d;
				const k = (margin - d) / 9;
				const into = dx * nx + dy * ny;
				if (into < 0) {
					dx -= nx * into;
					dy -= ny * into;
				}
				dx += nx * k * 40;
				dy += ny * k * 40;
			}
			nvx[i] = vx[i] + (dx - vx[i]) * blend;
			nvy[i] = vy[i] + (dy - vy[i]) * blend;
		}
		for (let i = 0; i < AGENTS; i++) {
			vx[i] = nvx[i];
			vy[i] = nvy[i];
			let x = px[i] + vx[i] * dt;
			let y = py[i] + vy[i] * dt;
			// Toroidal world: what leaves one edge re-enters the opposite one.
			if (x < 0) x += W;
			else if (x >= W) x -= W;
			if (y < 0) y += H;
			else if (y >= H) y -= H;
			px[i] = x;
			py[i] = y;
		}
		// The tree built at the top of the step still holds (agents moved < 1px since).
		query();
		draw();
		if (time - publishedAt > 0.25) publish();
	}

	// ── drawing ──────────────────────────────────────────────────────────────────────────────
	const snap = (v: number) => (Math.round(v * dpr) + 0.5) / dpr;

	function draw() {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);

		// Pillars: hatched discs with a graphite rim.
		ctx.lineWidth = 1;
		for (const [fx, fy, fr] of PILLARS) {
			const cx = fx * W;
			const cy = fy * H;
			const r = fr * H;
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.clip();
			ctx.strokeStyle = rgba('graphite', 0.35);
			ctx.beginPath();
			for (let k = -r * 2; k < r * 2; k += 4) {
				ctx.moveTo(cx + k - r, cy - r);
				ctx.lineTo(cx + k + r, cy + r);
			}
			ctx.stroke();
			ctx.restore();
			ctx.strokeStyle = rgba('graphite', 0.9);
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Query: visited leaves tinted, the probe ring.
		if (ptr.inside) {
			ctx.fillStyle = rgba('cobalt', 0.16);
			for (let k = 0; k < visitedN; k++) {
				const n = visited[k];
				if (nChild[n] >= 0) continue;
				ctx.fillRect(nx0[n], ny0[n], nx1[n] - nx0[n], ny1[n] - ny0[n]);
			}
		}

		if (showTree) {
			ctx.strokeStyle = rgba('cobalt', 0.62);
			ctx.lineWidth = 1 / dpr;
			ctx.beginPath();
			for (let n = 0; n < nodes; n++) {
				if (nChild[n] < 0) continue;
				const mx = snap((nx0[n] + nx1[n]) * 0.5);
				const my = snap((ny0[n] + ny1[n]) * 0.5);
				ctx.moveTo(mx, ny0[n]);
				ctx.lineTo(mx, ny1[n]);
				ctx.moveTo(nx0[n], my);
				ctx.lineTo(nx1[n], my);
			}
			ctx.stroke();
		}

		// Agents: darts along their velocity. One path per colour.
		ctx.fillStyle = pal.ink;
		ctx.beginPath();
		for (let i = 0; i < AGENTS; i++) if (!hit[i]) dart(i, 1);
		ctx.fill();
		if (hits) {
			ctx.fillStyle = pal.signal;
			ctx.beginPath();
			for (let i = 0; i < AGENTS; i++) if (hit[i]) dart(i, 1.35);
			ctx.fill();
		}

		if (ptr.inside) {
			ctx.strokeStyle = rgba('cobalt', 0.95);
			ctx.lineWidth = 1;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.arc(ptr.x, ptr.y, QUERY_R, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	function dart(i: number, s: number) {
		const x = px[i];
		const y = py[i];
		const v = Math.hypot(vx[i], vy[i]) || 1;
		const hx = vx[i] / v;
		const hy = vy[i] / v;
		const L = 2.6 * s;
		const B = 1.7 * s;
		const Wd = 1.35 * s;
		ctx.moveTo(x + hx * L, y + hy * L);
		ctx.lineTo(x - hx * B - hy * Wd, y - hy * B + hx * Wd);
		ctx.lineTo(x - hx * B * 0.45, y - hy * B * 0.45);
		ctx.lineTo(x - hx * B + hy * Wd, y - hy * B - hx * Wd);
		ctx.closePath();
	}

	// ── lifecycle ────────────────────────────────────────────────────────────────────────────
	const loop = createLoop((_t, dt) => step(dt));
	const stats = { agents: AGENTS, depth: 0, nodes: 0, leaves: 0, hits: 0, visited: 0, buildMs: 0, quadtree: 1 };
	function publish() {
		publishedAt = time;
		stats.depth = depth;
		stats.nodes = nodes;
		stats.leaves = leaves;
		stats.hits = hits;
		stats.visited = visitedN;
		stats.buildMs = buildMs;
		stats.quadtree = showTree ? 1 : 0;
	}

	// First frame so a paused cell is never blank.
	build();
	query();
	draw();
	publish();

	return {
		stats,
		start() {
			loop.start();
		},
		stop() {
			loop.stop();
		},
		setRate(r) {
			loop.setRate(r);
		},
		resize(w, h) {
			const sx = w / W;
			const sy = h / H;
			for (let i = 0; i < AGENTS; i++) {
				px[i] = Math.min(w - 0.01, px[i] * sx);
				py[i] = Math.min(h - 0.01, py[i] * sy);
			}
			W = Math.max(1, w);
			H = Math.max(1, h);
			dpr = fitCanvas(canvas, W, H);
			build();
			query();
			draw();
			publish();
		},
		key(k, down) {
			if (!down || k.toLowerCase() !== 'q') return false;
			showTree = !showTree;
			if (!loop.running) draw();
			publish();
			return true;
		},
		toggleQuadtree(on) {
			showTree = on ?? !showTree;
			if (!loop.running) draw();
			publish();
			return showTree;
		},
		set(p) {
			if (typeof p.quadtree === 'boolean') {
				showTree = p.quadtree;
				if (!loop.running) draw();
				publish();
			}
		},
		pointer(p: PointerInfo) {
			const wasDown = ptr.down;
			ptr.x = p.x;
			ptr.y = p.y;
			// Touch has no hover: the probe only follows a finger that is down.
			ptr.inside = p.inside && (!p.touch || p.down);
			ptr.down = p.down;
			if (p.down && !wasDown && p.inside && !opts.reducedMotion?.()) ping(p.x, p.y);
			if (!loop.running) {
				query();
				draw();
			}
		},
		dispose() {
			loop.stop();
			releasePalette();
		}
	};
}
