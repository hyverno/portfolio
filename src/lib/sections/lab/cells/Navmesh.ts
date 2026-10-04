// Lab cell 04 · NAVMESH × MASS (web recreation of UE5 Mass agents on a navmesh). Canvas2D.
// A precomputed conforming triangulation (navmesh.json: 131 tris around 5 obstacles) drawn in
// cobalt; a 48×27 grid BFS integration field is recomputed whenever the target cell changes and
// turned into a flow field; 300 agents follow it (bilinear flow + separation from a cell hash) to
// the cursor, or to a wandering target on touch. The BFS wavefront ripples out on big moves and
// one agent's route is traced to the target.
import mesh from './navmesh.json';
import { createLoop } from './loop';
import { fitCanvas, pal, rgba, usePalette } from './palette';
import type { LabCellImpl, PointerInfo } from './types';

export const AGENTS = 300;
export const GW = 48;
export const GH = 27;
export const TRIS = mesh.tris.length / 3;

/** Domain units (16:10). */
const DW = mesh.w;
const DH = mesh.h;
const CW = DW / GW;
const CH = DH / GH;
/** Agent clearance from obstacle edges, domain units. */
const CLEAR = 1.5;
const SEP_R = 2.1;
const WAVE_SPEED = 52; // cells per second

function inside(poly: number[], x: number, y: number): boolean {
	let c = false;
	for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
		const xi = poly[i];
		const yi = poly[i + 1];
		const xj = poly[j];
		const yj = poly[j + 1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
}

function edgeDist(poly: number[], x: number, y: number): number {
	let d = Infinity;
	for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
		const ax = poly[j];
		const ay = poly[j + 1];
		const dx = poly[i] - ax;
		const dy = poly[i + 1] - ay;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
		d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t));
	}
	return d;
}

export interface NavmeshOptions {
	reducedMotion?: () => boolean;
}

export function create(canvas: HTMLCanvasElement, opts: NavmeshOptions = {}): LabCellImpl {
	const ctx = canvas.getContext('2d', { alpha: true })!;
	const releasePalette = usePalette();
	const staticLayer = document.createElement('canvas');
	const flowLayer = document.createElement('canvas');
	const sctx = staticLayer.getContext('2d')!;
	const fctx = flowLayer.getContext('2d')!;

	let W = 400;
	let H = 250;
	let dpr = 1;
	let sx = W / DW;
	let sy = H / DH;
	let time = 0;
	let paletteVersion = -1;

	// ── grid: blocked cells and an escape direction for each blocked cell ─────────────────────
	const cells = GW * GH;
	const blocked = new Uint8Array(cells);
	for (let gy = 0; gy < GH; gy++) {
		for (let gx = 0; gx < GW; gx++) {
			const x = (gx + 0.5) * CW;
			const y = (gy + 0.5) * CH;
			for (const poly of mesh.obstacles) {
				if (inside(poly, x, y) || edgeDist(poly, x, y) < CLEAR) {
					blocked[gy * GW + gx] = 1;
					break;
				}
			}
		}
	}
	const escX = new Float32Array(cells);
	const escY = new Float32Array(cells);
	for (let c = 0; c < cells; c++) {
		if (!blocked[c]) continue;
		const cx = c % GW;
		const cy = (c / GW) | 0;
		let best = Infinity;
		for (let r = 1; r < 8 && best === Infinity; r++) {
			for (let dy = -r; dy <= r; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					const x = cx + dx;
					const y = cy + dy;
					if (x < 0 || y < 0 || x >= GW || y >= GH || blocked[y * GW + x]) continue;
					const d = dx * dx + dy * dy;
					if (d < best) {
						best = d;
						const l = Math.hypot(dx, dy);
						escX[c] = dx / l;
						escY[c] = dy / l;
					}
				}
			}
		}
	}

	// ── BFS integration field → flow field ───────────────────────────────────────────────────
	const dist = new Int16Array(cells);
	const queue = new Int16Array(cells);
	const flowX = new Float32Array(cells);
	const flowY = new Float32Array(cells);
	let targetCell = -1;
	let reached = 0;
	let maxDist = 1;
	let bfsMs = 0;
	let waveT0 = -10;

	function nearestFree(c: number): number {
		if (!blocked[c]) return c;
		const cx = c % GW;
		const cy = (c / GW) | 0;
		for (let r = 1; r < 12; r++) {
			for (let dy = -r; dy <= r; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
					const x = cx + dx;
					const y = cy + dy;
					if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
					if (!blocked[y * GW + x]) return y * GW + x;
				}
			}
		}
		return c;
	}

	function bfs(target: number) {
		const t0 = performance.now();
		dist.fill(-1);
		let head = 0;
		let tail = 0;
		dist[target] = 0;
		queue[tail++] = target;
		maxDist = 1;
		const visit = (n: number, d: number) => {
			if (blocked[n] || dist[n] >= 0) return;
			dist[n] = d;
			queue[tail++] = n;
		};
		while (head < tail) {
			const c = queue[head++];
			const x = c % GW;
			const y = (c / GW) | 0;
			const d = dist[c] + 1;
			if (x > 0) visit(c - 1, d);
			if (x < GW - 1) visit(c + 1, d);
			if (y > 0) visit(c - GW, d);
			if (y < GH - 1) visit(c + GW, d);
			if (d > maxDist) maxDist = d;
		}
		reached = tail;
		// Flow: weighted descent over the 8 neighbours (no corner cutting past blocked cells).
		for (let c = 0; c < cells; c++) {
			flowX[c] = 0;
			flowY[c] = 0;
			const dc = dist[c];
			if (dc <= 0) continue;
			const x = c % GW;
			const y = (c / GW) | 0;
			let fx = 0;
			let fy = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (!dx && !dy) continue;
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
					const n = ny * GW + nx;
					const dn = dist[n];
					if (dn < 0 || dn >= dc) continue;
					if (dx && dy && (blocked[y * GW + nx] || blocked[ny * GW + x])) continue;
					const w = (dc - dn) / (dx && dy ? 1.4142 : 1);
					const l = dx && dy ? 1.4142 : 1;
					fx += (dx / l) * w;
					fy += (dy / l) * w;
				}
			}
			const l = Math.hypot(fx, fy);
			if (l > 1e-6) {
				flowX[c] = fx / l;
				flowY[c] = fy / l;
			}
		}
		bfsMs = performance.now() - t0;
		drawFlowLayer();
	}

	// ── target ───────────────────────────────────────────────────────────────────────────────
	const target = { x: DW * 0.72, y: DH * 0.5 };
	let manualUntil = -1;
	let pointerTarget = false;

	function setTarget(x: number, y: number, ripple = false) {
		target.x = Math.min(DW - 0.5, Math.max(0.5, x));
		target.y = Math.min(DH - 0.5, Math.max(0.5, y));
		const gx = Math.min(GW - 1, Math.max(0, Math.floor(target.x / CW)));
		const gy = Math.min(GH - 1, Math.max(0, Math.floor(target.y / CH)));
		const c = nearestFree(gy * GW + gx);
		if (c === targetCell) return;
		const jump =
			targetCell < 0
				? 99
				: Math.max(Math.abs((c % GW) - (targetCell % GW)), Math.abs(((c / GW) | 0) - ((targetCell / GW) | 0)));
		targetCell = c;
		if (ripple || jump > 3) waveT0 = time;
		bfs(c);
	}

	function wander(t: number) {
		setTarget(DW * 0.5 + DW * 0.39 * Math.sin(t * 0.23), DH * 0.5 + DH * 0.36 * Math.sin(t * 0.31 + 1.3));
	}

	// ── agents ───────────────────────────────────────────────────────────────────────────────
	const ax = new Float32Array(AGENTS);
	const ay = new Float32Array(AGENTS);
	const avx = new Float32Array(AGENTS);
	const avy = new Float32Array(AGENTS);
	const aspd = new Float32Array(AGENTS);
	const bucket = new Int16Array(cells);
	const next = new Int16Array(AGENTS);
	for (let i = 0; i < AGENTS; i++) {
		let x = 0;
		let y = 0;
		do {
			x = Math.random() * DW;
			y = Math.random() * DH;
		} while (blocked[Math.floor(y / CH) * GW + Math.floor(x / CW)]);
		ax[i] = x;
		ay[i] = y;
		aspd[i] = 11 + Math.random() * 8;
	}

	function cellOf(x: number, y: number): number {
		const gx = Math.min(GW - 1, Math.max(0, Math.floor(x / CW)));
		const gy = Math.min(GH - 1, Math.max(0, Math.floor(y / CH)));
		return gy * GW + gx;
	}

	/** Bilinear flow at a domain point (ignores unreached and blocked samples). */
	let fX = 0;
	let fY = 0;
	function flowAt(x: number, y: number) {
		const u = x / CW - 0.5;
		const v = y / CH - 0.5;
		const x0 = Math.floor(u);
		const y0 = Math.floor(v);
		const tx = u - x0;
		const ty = v - y0;
		fX = 0;
		fY = 0;
		for (let k = 0; k < 4; k++) {
			const gx = x0 + (k & 1);
			const gy = y0 + (k >> 1);
			if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
			const c = gy * GW + gx;
			if (blocked[c] || dist[c] < 0) continue;
			const w = (k & 1 ? tx : 1 - tx) * (k >> 1 ? ty : 1 - ty);
			fX += flowX[c] * w;
			fY += flowY[c] * w;
		}
		const l = Math.hypot(fX, fY);
		if (l > 1e-5) {
			fX /= l;
			fY /= l;
		}
	}

	function step(dt: number) {
		time += dt;
		if (!pointerTarget && time > manualUntil) wander(time);

		bucket.fill(-1);
		for (let i = 0; i < AGENTS; i++) {
			const c = cellOf(ax[i], ay[i]);
			next[i] = bucket[c];
			bucket[c] = i;
		}

		const blend = 1 - Math.exp(-dt * 5);
		for (let i = 0; i < AGENTS; i++) {
			const x = ax[i];
			const y = ay[i];
			const c = cellOf(x, y);
			let dx: number;
			let dy: number;
			const tx = target.x - x;
			const ty = target.y - y;
			const td = Math.hypot(tx, ty);
			if (blocked[c]) {
				dx = escX[c] * aspd[i];
				dy = escY[c] * aspd[i];
			} else if (td < 7) {
				// Arrived: mill on a ring round the waypoint instead of piling onto one cell.
				const nx = tx / (td || 1);
				const ny = ty / (td || 1);
				const side = i & 1 ? 0.6 : -0.6;
				const radial = (td - 4) / 3;
				dx = (-ny * side + nx * radial) * aspd[i];
				dy = (nx * side + ny * radial) * aspd[i];
			} else {
				flowAt(x, y);
				dx = fX * aspd[i];
				dy = fY * aspd[i];
			}
			// Separation from the 3×3 hashed cells around.
			let px = 0;
			let py = 0;
			const gx = c % GW;
			const gy = (c / GW) | 0;
			for (let oy = -1; oy <= 1; oy++) {
				const yy = gy + oy;
				if (yy < 0 || yy >= GH) continue;
				for (let ox = -1; ox <= 1; ox++) {
					const xx = gx + ox;
					if (xx < 0 || xx >= GW) continue;
					for (let j = bucket[yy * GW + xx]; j >= 0; j = next[j]) {
						if (j === i) continue;
						const ex = x - ax[j];
						const ey = y - ay[j];
						const d2 = ex * ex + ey * ey;
						if (d2 > SEP_R * SEP_R || d2 < 1e-6) continue;
						const d = Math.sqrt(d2);
						const k = (SEP_R - d) / SEP_R;
						px += (ex / d) * k;
						py += (ey / d) * k;
					}
				}
			}
			dx += px * 22;
			dy += py * 22;
			avx[i] += (dx - avx[i]) * blend;
			avy[i] += (dy - avy[i]) * blend;
		}
		for (let i = 0; i < AGENTS; i++) {
			let x = ax[i] + avx[i] * dt;
			let y = ay[i] + avy[i] * dt;
			// Never step into a blocked cell: slide along whichever axis stays free.
			if (blocked[cellOf(x, y)] && !blocked[cellOf(ax[i], ay[i])]) {
				if (!blocked[cellOf(x, ay[i])]) y = ay[i];
				else if (!blocked[cellOf(ax[i], y)]) x = ax[i];
				else {
					x = ax[i];
					y = ay[i];
				}
			}
			ax[i] = Math.min(DW - 0.2, Math.max(0.2, x));
			ay[i] = Math.min(DH - 0.2, Math.max(0.2, y));
		}
		draw();
		if (time - publishedAt > 0.25) publish();
	}

	// ── drawing ──────────────────────────────────────────────────────────────────────────────
	const X = (x: number) => x * sx;
	const Y = (y: number) => y * sy;

	function drawStaticLayer() {
		staticLayer.width = canvas.width;
		staticLayer.height = canvas.height;
		const c = sctx;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, W, H);
		const v = mesh.verts;
		const t = mesh.tris;
		// Polygons: a faint cobalt fill, alternating so the triangles read as tiles.
		for (let k = 0; k < t.length; k += 3) {
			c.beginPath();
			c.moveTo(X(v[t[k] * 2]), Y(v[t[k] * 2 + 1]));
			c.lineTo(X(v[t[k + 1] * 2]), Y(v[t[k + 1] * 2 + 1]));
			c.lineTo(X(v[t[k + 2] * 2]), Y(v[t[k + 2] * 2 + 1]));
			c.closePath();
			c.fillStyle = rgba('cobalt', (k / 3) % 2 ? 0.05 : 0.085);
			c.fill();
		}
		c.strokeStyle = rgba('cobalt', 0.6);
		c.lineWidth = 1 / dpr;
		c.lineJoin = 'round';
		c.beginPath();
		for (let k = 0; k < t.length; k += 3) {
			c.moveTo(X(v[t[k] * 2]), Y(v[t[k] * 2 + 1]));
			c.lineTo(X(v[t[k + 1] * 2]), Y(v[t[k + 1] * 2 + 1]));
			c.lineTo(X(v[t[k + 2] * 2]), Y(v[t[k + 2] * 2 + 1]));
			c.closePath();
		}
		c.stroke();
		// Obstacles: holes in the mesh, hatched.
		for (const poly of mesh.obstacles) {
			c.save();
			c.beginPath();
			for (let i = 0; i < poly.length; i += 2) c.lineTo(X(poly[i]), Y(poly[i + 1]));
			c.closePath();
			c.clip();
			c.strokeStyle = rgba('graphite', 0.4);
			c.lineWidth = 1;
			c.beginPath();
			for (let k = -H; k < W + H; k += 4) {
				c.moveTo(k, 0);
				c.lineTo(k + H, H);
			}
			c.stroke();
			c.restore();
			c.strokeStyle = rgba('graphite', 0.95);
			c.lineWidth = 1;
			c.beginPath();
			for (let i = 0; i < poly.length; i += 2) c.lineTo(X(poly[i]), Y(poly[i + 1]));
			c.closePath();
			c.stroke();
		}
	}

	function drawFlowLayer() {
		if (flowLayer.width !== canvas.width || flowLayer.height !== canvas.height) {
			flowLayer.width = canvas.width;
			flowLayer.height = canvas.height;
		}
		const c = fctx;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, W, H);
		const len = Math.min(CW * sx, CH * sy) * 0.36;
		c.strokeStyle = rgba('graphite', 0.62);
		c.lineWidth = 1;
		c.beginPath();
		for (let k = 0; k < cells; k++) {
			if (dist[k] <= 0) continue;
			const cx = ((k % GW) + 0.5) * CW * sx;
			const cy = (((k / GW) | 0) + 0.5) * CH * sy;
			c.moveTo(cx - flowX[k] * len * 0.5, cy - flowY[k] * len * 0.5);
			c.lineTo(cx + flowX[k] * len, cy + flowY[k] * len);
		}
		c.stroke();
	}

	function draw() {
		if (paletteVersion !== pal.version) {
			paletteVersion = pal.version;
			drawStaticLayer();
			drawFlowLayer();
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(staticLayer, 0, 0);
		ctx.drawImage(flowLayer, 0, 0);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// BFS wavefront: the ring of cells the search reached `age` ago.
		const front = (time - waveT0) * WAVE_SPEED;
		if (front < maxDist + 3) {
			const cw = CW * sx;
			const ch = CH * sy;
			for (let k = 0; k < cells; k++) {
				const d = dist[k];
				if (d < 0) continue;
				const e = front - d;
				if (e < 0 || e > 3) continue;
				ctx.fillStyle = rgba('cobalt', 0.34 * (1 - e / 3));
				ctx.fillRect((k % GW) * cw + 0.5, ((k / GW) | 0) * ch + 0.5, cw - 1, ch - 1);
			}
		}

		// One agent's route: descend the flow field from agent 0 to the waypoint.
		ctx.strokeStyle = rgba('signal', 0.85);
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 3]);
		ctx.beginPath();
		let x = ax[0];
		let y = ay[0];
		ctx.moveTo(X(x), Y(y));
		for (let s = 0; s < 160; s++) {
			const c = cellOf(x, y);
			if (dist[c] <= 0) break;
			flowAt(x, y);
			if (!fX && !fY) break;
			x += fX * 1.6;
			y += fY * 1.6;
			ctx.lineTo(X(x), Y(y));
		}
		ctx.lineTo(X(target.x), Y(target.y));
		ctx.stroke();
		ctx.setLineDash([]);

		// Agents.
		ctx.fillStyle = pal.ink;
		ctx.beginPath();
		for (let i = 1; i < AGENTS; i++) dart(X(ax[i]), Y(ay[i]), avx[i], avy[i], 1);
		ctx.fill();
		ctx.fillStyle = pal.signal;
		ctx.beginPath();
		dart(X(ax[0]), Y(ay[0]), avx[0], avy[0], 1.5);
		ctx.fill();

		// Waypoint diamond ◆ with a ring.
		const tx = X(target.x);
		const ty = Y(target.y);
		const r = 4.5;
		ctx.fillStyle = pal.signal;
		ctx.beginPath();
		ctx.moveTo(tx, ty - r);
		ctx.lineTo(tx + r, ty);
		ctx.lineTo(tx, ty + r);
		ctx.lineTo(tx - r, ty);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = rgba('signal', 0.7);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(tx, ty, 9 + 2 * Math.sin(time * 4), 0, Math.PI * 2);
		ctx.stroke();
	}

	function dart(x: number, y: number, vx: number, vy: number, s: number) {
		const v = Math.hypot(vx, vy) || 1;
		const hx = vx / v;
		const hy = vy / v;
		const L = 3.4 * s;
		const B = 2.2 * s;
		const Wd = 1.8 * s;
		ctx.moveTo(x + hx * L, y + hy * L);
		ctx.lineTo(x - hx * B - hy * Wd, y - hy * B + hx * Wd);
		ctx.lineTo(x - hx * B * 0.4, y - hy * B * 0.4);
		ctx.lineTo(x - hx * B + hy * Wd, y - hy * B - hx * Wd);
		ctx.closePath();
	}

	// ── lifecycle ────────────────────────────────────────────────────────────────────────────
	const loop = createLoop((_t, dt) => step(dt));
	const stats = { agents: AGENTS, tris: TRIS, cells, reached: 0, bfsMs: 0 };
	let publishedAt = -1;
	function publish() {
		publishedAt = time;
		stats.reached = reached;
		stats.bfsMs = bfsMs;
	}

	wander(0);
	waveT0 = -10;

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
			W = Math.max(1, w);
			H = Math.max(1, h);
			sx = W / DW;
			sy = H / DH;
			dpr = fitCanvas(canvas, W, H);
			paletteVersion = -1;
			draw();
			publish();
		},
		key(k, down) {
			if (!down) return false;
			const d: Record<string, [number, number]> = {
				ArrowLeft: [-1, 0],
				ArrowRight: [1, 0],
				ArrowUp: [0, -1],
				ArrowDown: [0, 1]
			};
			const m = d[k];
			if (!m) return false;
			manualUntil = time + 6;
			setTarget(target.x + m[0] * CW * 2, target.y + m[1] * CH * 2);
			if (!loop.running) draw();
			return true;
		},
		pointer(p: PointerInfo) {
			const active = p.inside && (!p.touch || p.down);
			if (active) {
				const wasPointer = pointerTarget;
				pointerTarget = true;
				setTarget(p.x / sx, p.y / sy, !wasPointer || (p.down && p.touch));
			} else if (pointerTarget) {
				pointerTarget = false;
				// Let the wander resume from where the pointer left the waypoint.
				manualUntil = time + (p.touch ? 2.5 : 1.2);
			}
			if (!loop.running) draw();
		},
		dispose() {
			loop.stop();
			releasePalette();
			staticLayer.width = staticLayer.height = 0;
			flowLayer.width = flowLayer.height = 0;
		}
	};
}
