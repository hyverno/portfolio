// Lab cell 06 · REPLICATION (web recreation of multiplayer inventory + lobby netcode). Canvas2D.
// A server simulates a player and ticks snapshots at 20 Hz; every packet crosses the wire with the
// slider's one-way latency plus jitter (so packets can arrive out of order). INTERP OFF: the client
// snaps to the newest snapshot it has (visible stutter). INTERP ON: it renders one tick plus the
// worst jitter in the past and interpolates between buffered snapshots (smooth, honestly later).
// Lobby (4 slots) and inventory (3×4) changes are reliable, ordered RPCs: the client mirrors them
// when they land. Everything on screen is that simulation, nothing is keyframed.
import { createLoop } from './loop';
import { fitCanvas, monoFont, pal, rgba, usePalette } from './palette';
import type { LabCellImpl } from './types';

export const TICK_HZ = 20;
const TICK = 1 / TICK_HZ;
const SLOTS = 4;
const INV_COLS = 4;
const INV_ROWS = 3;
const ITEMS = 5;

export interface ReplicationLabels {
	server: string;
	client: string;
	lobby: string;
	inventory: string;
}

interface Snapshot {
	seq: number;
	sent: number;
	arrive: number;
	u: number;
	v: number;
}

interface Rpc {
	seq: number;
	sent: number;
	arrive: number;
	kind: 'lobby' | 'inv';
	apply: () => void;
	/** Client-side slot to flash when applied. */
	slot: number;
}

interface LobbySlot {
	present: boolean;
	ready: boolean;
}

export function create(
	canvas: HTMLCanvasElement,
	opts: { labels: () => ReplicationLabels }
): LabCellImpl {
	const ctx = canvas.getContext('2d', { alpha: true })!;
	const releasePalette = usePalette();

	let W = 400;
	let H = 250;
	let dpr = 1;
	let time = 0;
	let latency = 0.12;
	let interp = false;

	// ── server state ─────────────────────────────────────────────────────────────────────────
	const pathAt = (t: number) => ({
		u: 0.5 + 0.38 * Math.sin(t * 0.92),
		v: 0.52 + 0.3 * Math.sin(t * 1.71 + 0.4)
	});
	const server = { u: 0.5, v: 0.5 };
	const serverLobby: LobbySlot[] = [
		{ present: true, ready: true },
		{ present: true, ready: false },
		{ present: false, ready: false },
		{ present: false, ready: false }
	];
	const clientLobby: LobbySlot[] = serverLobby.map((s) => ({ ...s }));
	/** inv[slot] = item id (0..ITEMS-1) or -1. */
	const serverInv = new Int8Array(INV_COLS * INV_ROWS).fill(-1);
	[0, 5, 6, 9, 11].forEach((s, i) => (serverInv[s] = i));
	const clientInv = Int8Array.from(serverInv);
	const serverFlash = { lobby: new Float32Array(SLOTS).fill(-9), inv: new Float32Array(INV_COLS * INV_ROWS).fill(-9) };
	const clientFlash = { lobby: new Float32Array(SLOTS).fill(-9), inv: new Float32Array(INV_COLS * INV_ROWS).fill(-9) };

	// ── network ──────────────────────────────────────────────────────────────────────────────
	let seq = 0;
	let nextTick = 0;
	let nextLobby = 1.2;
	let nextInv = 0.7;
	let lastRpcArrive = 0;
	const inflight: Snapshot[] = [];
	const buffer: Snapshot[] = [];
	const rpcs: Rpc[] = [];
	let newest: Snapshot | null = null;
	const client = { u: 0.5, v: 0.5, hu: 0, hv: -1 };

	const jitter = () => Math.random() * (0.008 + latency * 0.38);

	function sendSnapshot() {
		const sent = time;
		inflight.push({ seq: seq++, sent, arrive: sent + latency + jitter(), u: server.u, v: server.v });
	}

	function sendRpc(kind: Rpc['kind'], slot: number, apply: () => void) {
		const sent = time;
		// Reliable + ordered: never lands before the previous RPC.
		const arrive = Math.max(lastRpcArrive + 0.001, sent + latency + jitter());
		lastRpcArrive = arrive;
		rpcs.push({ seq: seq++, sent, arrive, kind, apply, slot });
	}

	function lobbyEvent() {
		const free = serverLobby.map((s, i) => (!s.present ? i : -1)).filter((i) => i > 0);
		const guests = serverLobby.map((s, i) => (s.present && i > 0 ? i : -1)).filter((i) => i > 0);
		const r = Math.random();
		let slot: number;
		let next: LobbySlot;
		if ((r < 0.4 && free.length) || !guests.length) {
			slot = free[(Math.random() * free.length) | 0];
			next = { present: true, ready: false };
		} else if (r < 0.62 && guests.length > 1) {
			slot = guests[(Math.random() * guests.length) | 0];
			next = { present: false, ready: false };
		} else {
			const pool = [0, ...guests];
			slot = pool[(Math.random() * pool.length) | 0];
			next = { present: true, ready: !serverLobby[slot].ready };
		}
		if (slot === undefined) return;
		serverLobby[slot] = next;
		serverFlash.lobby[slot] = time;
		const copy = { ...next };
		sendRpc('lobby', slot, () => {
			clientLobby[slot] = copy;
			clientFlash.lobby[slot] = time;
		});
	}

	function invEvent() {
		const filled: number[] = [];
		const empty: number[] = [];
		serverInv.forEach((it, s) => (it >= 0 ? filled : empty).push(s));
		if (!filled.length || !empty.length) return;
		const from = filled[(Math.random() * filled.length) | 0];
		const to = empty[(Math.random() * empty.length) | 0];
		const item = serverInv[from];
		serverInv[from] = -1;
		serverInv[to] = item;
		serverFlash.inv[to] = time;
		sendRpc('inv', to, () => {
			// Mirror the move: wherever the client still has the item, it leaves that slot.
			for (let s = 0; s < clientInv.length; s++) if (clientInv[s] === item) clientInv[s] = -1;
			clientInv[to] = item;
			clientFlash.inv[to] = time;
		});
	}

	// ── client trail (rendered positions) and server trail ───────────────────────────────────
	const TRAIL = 36;
	const sTrail = new Float32Array(TRAIL * 2);
	const cTrail = new Float32Array(TRAIL * 2);
	let trailHead = 0;
	let trailAcc = 0;

	function step(dt: number) {
		time += dt;
		const p = pathAt(time);
		server.u = p.u;
		server.v = p.v;
		while (time >= nextTick) {
			sendSnapshot();
			nextTick += TICK;
		}
		if (time >= nextLobby) {
			lobbyEvent();
			nextLobby = time + 1.3 + Math.random() * 1.2;
		}
		if (time >= nextInv) {
			invEvent();
			nextInv = time + 0.9 + Math.random() * 0.9;
		}

		// Deliveries.
		for (let i = inflight.length - 1; i >= 0; i--) {
			const s = inflight[i];
			if (s.arrive > time) continue;
			inflight.splice(i, 1);
			buffer.push(s);
			if (!newest || s.seq > newest.seq) newest = s;
		}
		buffer.sort((a, b) => a.sent - b.sent);
		// Keep a second of history for interpolation.
		while (buffer.length > 2 && buffer[1].sent < time - 1.2) buffer.shift();
		rpcs.sort((a, b) => a.arrive - b.arrive);
		while (rpcs.length && rpcs[0].arrive <= time) rpcs.shift()!.apply();

		// Client presentation.
		const prevU = client.u;
		const prevV = client.v;
		if (!interp) {
			if (newest) {
				client.u = newest.u;
				client.v = newest.v;
			}
		} else {
			// Render one tick plus the worst-case jitter behind the newest possible server time.
			const renderT = time - latency - (0.008 + latency * 0.38) - TICK;
			let a: Snapshot | null = null;
			let b: Snapshot | null = null;
			for (const s of buffer) {
				if (s.sent <= renderT) a = s;
				else {
					b = s;
					break;
				}
			}
			if (a && b) {
				const k = (renderT - a.sent) / Math.max(1e-4, b.sent - a.sent);
				client.u = a.u + (b.u - a.u) * k;
				client.v = a.v + (b.v - a.v) * k;
			} else if (a) {
				client.u = a.u;
				client.v = a.v;
			}
		}
		const du = client.u - prevU;
		const dv = client.v - prevV;
		if (Math.hypot(du, dv) > 1e-4) {
			client.hu = du;
			client.hv = dv;
		}

		trailAcc += dt;
		if (trailAcc >= 1 / 30) {
			trailAcc = 0;
			trailHead = (trailHead + 1) % TRAIL;
			sTrail[trailHead * 2] = server.u;
			sTrail[trailHead * 2 + 1] = server.v;
			cTrail[trailHead * 2] = client.u;
			cTrail[trailHead * 2 + 1] = client.v;
		}
		if (warm) draw();
		if (time - publishedAt > 0.25) publish();
	}

	// ── drawing ──────────────────────────────────────────────────────────────────────────────
	function layout() {
		const pad = Math.max(6, Math.round(W * 0.02));
		const half = W / 2;
		const netH = Math.round(H * 0.56);
		const stateY = netH + Math.round(H * 0.07);
		const stateH = H - stateY - pad;
		const cell = Math.max(9, Math.min(20, Math.floor((stateH - 14) / INV_ROWS) - 2));
		return { pad, half, netH, stateY, stateH, cell };
	}

	function arena(side: 0 | 1, L: ReturnType<typeof layout>) {
		const x0 = side * L.half + L.pad;
		const y0 = L.pad + 16;
		return { x0, y0, w: L.half - L.pad * 2, h: L.netH - y0 - L.pad };
	}

	function dartAt(x: number, y: number, hx: number, hy: number, s: number) {
		const l = Math.hypot(hx, hy) || 1;
		const ux = hx / l;
		const uy = hy / l;
		ctx.beginPath();
		ctx.moveTo(x + ux * 6 * s, y + uy * 6 * s);
		ctx.lineTo(x - ux * 4 * s - uy * 3.6 * s, y - uy * 4 * s + ux * 3.6 * s);
		ctx.lineTo(x - ux * 1.6 * s, y - uy * 1.6 * s);
		ctx.lineTo(x - ux * 4 * s + uy * 3.6 * s, y - uy * 4 * s - ux * 3.6 * s);
		ctx.closePath();
		ctx.fill();
	}

	function drawItem(item: number, cx: number, cy: number, s: number) {
		ctx.beginPath();
		switch (item) {
			case 0: // sword
				ctx.moveTo(cx - s * 0.42, cy + s * 0.42);
				ctx.lineTo(cx + s * 0.42, cy - s * 0.42);
				ctx.moveTo(cx - s * 0.36, cy + s * 0.06);
				ctx.lineTo(cx - s * 0.06, cy + s * 0.36);
				ctx.stroke();
				return;
			case 1: // shield
				ctx.moveTo(cx - s * 0.36, cy - s * 0.38);
				ctx.lineTo(cx + s * 0.36, cy - s * 0.38);
				ctx.lineTo(cx + s * 0.36, cy + s * 0.02);
				ctx.lineTo(cx, cy + s * 0.42);
				ctx.lineTo(cx - s * 0.36, cy + s * 0.02);
				ctx.closePath();
				ctx.stroke();
				return;
			case 2: // potion
				ctx.arc(cx, cy + s * 0.1, s * 0.28, 0, Math.PI * 2);
				ctx.moveTo(cx - s * 0.1, cy - s * 0.18);
				ctx.lineTo(cx - s * 0.1, cy - s * 0.42);
				ctx.lineTo(cx + s * 0.1, cy - s * 0.42);
				ctx.lineTo(cx + s * 0.1, cy - s * 0.18);
				ctx.stroke();
				return;
			case 3: // gem
				ctx.moveTo(cx, cy - s * 0.42);
				ctx.lineTo(cx + s * 0.34, cy);
				ctx.lineTo(cx, cy + s * 0.42);
				ctx.lineTo(cx - s * 0.34, cy);
				ctx.closePath();
				ctx.fill();
				return;
			default: // key
				ctx.arc(cx - s * 0.2, cy - s * 0.2, s * 0.16, 0, Math.PI * 2);
				ctx.moveTo(cx - s * 0.08, cy - s * 0.08);
				ctx.lineTo(cx + s * 0.4, cy + s * 0.4);
				ctx.moveTo(cx + s * 0.22, cy + s * 0.22);
				ctx.lineTo(cx + s * 0.32, cy + s * 0.12);
				ctx.stroke();
		}
	}

	function drawState(side: 0 | 1, L: ReturnType<typeof layout>, labels: ReplicationLabels) {
		const lobby = side ? clientLobby : serverLobby;
		const inv = side ? clientInv : serverInv;
		const flash = side ? clientFlash : serverFlash;
		const x0 = side * L.half + L.pad;
		const top = L.stateY;
		const c = L.cell;
		const gap = 2;
		const invW = INV_COLS * (c + gap) - gap;
		const lobbyW = Math.min(96, L.half - L.pad * 2 - invW - 12);
		const rowH = Math.max(9, Math.floor((INV_ROWS * (c + gap) - gap - 3 * 3) / SLOTS));

		ctx.font = monoFont(Math.max(7, Math.min(9, c * 0.5)), 500);
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = pal.graphite;
		ctx.fillText(labels.lobby, x0, top + 7);
		ctx.fillText(labels.inventory, x0 + lobbyW + 12, top + 7);

		const y1 = top + 12;
		// Lobby: four rows.
		for (let s = 0; s < SLOTS; s++) {
			const y = y1 + s * (rowH + 3);
			const f = Math.max(0, 1 - (time - flash.lobby[s]) / 0.7);
			ctx.strokeStyle = f > 0 ? rgba('signal', 0.4 + 0.6 * f) : rgba('graphite', 0.55);
			ctx.lineWidth = 1;
			ctx.strokeRect(x0 + 0.5, y + 0.5, lobbyW - 1, rowH - 1);
			const sl = lobby[s];
			ctx.fillStyle = sl.present ? pal.ink : rgba('graphite', 0.6);
			const label = sl.present ? `P${s + 1}${s === 0 ? ' ★' : ''}` : `P${s + 1} —`;
			ctx.fillText(label, x0 + 4, y + rowH - 3);
			if (sl.present && sl.ready) {
				ctx.strokeStyle = pal.ink;
				ctx.beginPath();
				const cx = x0 + lobbyW - 9;
				const cy = y + rowH / 2;
				ctx.moveTo(cx - 3, cy);
				ctx.lineTo(cx - 1, cy + 2.5);
				ctx.lineTo(cx + 3.5, cy - 3);
				ctx.stroke();
			}
		}
		// Inventory: 4 × 3.
		const ix = x0 + lobbyW + 12;
		ctx.lineWidth = 1;
		for (let s = 0; s < INV_COLS * INV_ROWS; s++) {
			const x = ix + (s % INV_COLS) * (c + gap);
			const y = y1 + Math.floor(s / INV_COLS) * (c + gap);
			const f = Math.max(0, 1 - (time - flash.inv[s]) / 0.7);
			ctx.strokeStyle = f > 0 ? rgba('signal', 0.4 + 0.6 * f) : rgba('graphite', 0.45);
			ctx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
			if (inv[s] >= 0) {
				ctx.strokeStyle = pal.ink;
				ctx.fillStyle = pal.ink;
				drawItem(inv[s], x + c / 2, y + c / 2, c * 0.78);
			}
		}
	}

	function draw() {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const L = layout();
		const labels = opts.labels();

		// Split.
		ctx.strokeStyle = rgba('graphite', 0.5);
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 3]);
		ctx.beginPath();
		ctx.moveTo(Math.round(L.half) + 0.5, 0);
		ctx.lineTo(Math.round(L.half) + 0.5, H);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.font = monoFont(9, 500);
		ctx.fillStyle = pal.graphite;
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(labels.server, L.pad, L.pad + 8);
		ctx.fillText(labels.client, L.half + L.pad, L.pad + 8);

		for (const side of [0, 1] as const) {
			const a = arena(side, L);
			ctx.strokeStyle = rgba('graphite', 0.35);
			ctx.strokeRect(a.x0 + 0.5, a.y0 + 0.5, a.w - 1, a.h - 1);
			const trail = side ? cTrail : sTrail;
			ctx.fillStyle = rgba('graphite', 0.9);
			for (let k = 1; k < TRAIL; k++) {
				const i = (trailHead - k + TRAIL) % TRAIL;
				const u = trail[i * 2];
				const v = trail[i * 2 + 1];
				if (!u && !v) continue;
				const s = 1.6 * (1 - k / TRAIL) + 0.4;
				ctx.fillRect(a.x0 + u * a.w - s / 2, a.y0 + v * a.h - s / 2, s, s);
			}
		}

		// Server player.
		const sa = arena(0, L);
		const ca = arena(1, L);
		const t2 = pathAt(time + 0.01);
		ctx.fillStyle = pal.ink;
		dartAt(sa.x0 + server.u * sa.w, sa.y0 + server.v * sa.h, (t2.u - server.u) * sa.w, (t2.v - server.v) * sa.h, 1);

		// Client: every snapshot it has received (the 20 Hz samples it actually knows), fading out.
		ctx.lineWidth = 1;
		for (const sn of buffer) {
			const age = time - sn.arrive;
			if (age < 0 || age > 0.9) continue;
			ctx.strokeStyle = rgba('graphite', 0.95 * (1 - age / 0.9));
			ctx.strokeRect(Math.round(ca.x0 + sn.u * ca.w) - 1.5, Math.round(ca.y0 + sn.v * ca.h) - 1.5, 3, 3);
		}

		// Where the server really is (ghost), then the replicated player.
		ctx.strokeStyle = rgba('cobalt', 0.9);
		ctx.setLineDash([2, 2]);
		ctx.beginPath();
		ctx.arc(ca.x0 + server.u * ca.w, ca.y0 + server.v * ca.h, 6.5, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = pal.ink;
		dartAt(ca.x0 + client.u * ca.w, ca.y0 + client.v * ca.h, client.hu * ca.w, client.hv * ca.h, 1);

		// The wire: snapshots (squares) and RPCs (diamonds) in flight, server → client.
		const wy = L.netH + Math.round(H * 0.035);
		const wx0 = L.half * 0.5;
		const wx1 = L.half * 1.5;
		ctx.strokeStyle = rgba('graphite', 0.45);
		ctx.beginPath();
		ctx.moveTo(wx0, wy + 0.5);
		ctx.lineTo(wx1, wy + 0.5);
		ctx.stroke();
		ctx.fillStyle = pal.signal;
		for (const s of inflight) {
			const k = Math.min(1, Math.max(0, (time - s.sent) / Math.max(1e-4, s.arrive - s.sent)));
			ctx.fillRect(wx0 + (wx1 - wx0) * k - 1.5, wy - 1, 3, 3);
		}
		for (const r of rpcs) {
			const k = Math.min(1, Math.max(0, (time - r.sent) / Math.max(1e-4, r.arrive - r.sent)));
			const x = wx0 + (wx1 - wx0) * k;
			ctx.beginPath();
			ctx.moveTo(x, wy - 4);
			ctx.lineTo(x + 4, wy + 0.5);
			ctx.lineTo(x, wy + 5);
			ctx.lineTo(x - 4, wy + 0.5);
			ctx.closePath();
			ctx.fill();
		}

		drawState(0, L, labels);
		drawState(1, L, labels);
	}

	// ── lifecycle ────────────────────────────────────────────────────────────────────────────
	const loop = createLoop((_t, dt) => step(dt));
	const stats = { tick: TICK_HZ, latency: 120, rtt: 240, inflight: 0, interp: 0 };
	let publishedAt = -1;
	function publish() {
		publishedAt = time;
		stats.latency = Math.round(latency * 1000);
		stats.rtt = Math.round(latency * 2000);
		stats.inflight = inflight.length + rpcs.length;
		stats.interp = interp ? 1 : 0;
	}

	// Warm up a second of simulated traffic so the first frame already has packets in the air.
	let warm = false;
	for (let i = 0; i < 60; i++) step(1 / 60);
	warm = true;

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
			dpr = fitCanvas(canvas, W, H);
			draw();
		},
		set(p) {
			if (typeof p.latency === 'number') latency = Math.max(0, Math.min(0.3, p.latency / 1000));
			if (typeof p.interp === 'boolean') interp = p.interp;
			publish();
			if (!loop.running) draw();
		},
		dispose() {
			loop.stop();
			releasePalette();
		}
	};
}
