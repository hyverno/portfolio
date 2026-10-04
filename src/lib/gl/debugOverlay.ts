// [3] DEBUG view, DOM half (§S4): AABB brackets labelled 'p.copy · 512×184' on every
// [data-collider], a cursor readout with the dashed aggro ring, and a `stat unit` panel.
// Collider rects are measured in page space only when something can have moved them (show,
// ResizeObserver, window resize, ScrollTrigger refresh, a 1 Hz rescan for new/pinned colliders);
// each frame moves one layer by the scroll offset. No getBoundingClientRect in the frame loop.
import type * as THREE from 'three';
import { ScrollTrigger } from '#lib/core/motion';
import { scroll } from '#lib/core/scroll.svelte';
import { stats } from '#lib/core/stats.svelte';
import { DARK_THEMES, theme } from '#lib/core/theme.svelte';

export interface DebugOverlay {
	readonly el: HTMLElement;
	readonly visible: boolean;
	show(): void;
	hide(): void;
	/** Only the band [top, bottom) of the viewport shows (fractions, top → bottom); used by the mode sweep. */
	setBand(top: number, bottom: number): void;
	update(dt: number): void;
	dispose(): void;
}

export interface DebugOverlayOptions {
	/** Cursor aggro radius in CSS px (default: the sim's mouseR .22 world units). */
	aggroPx?: () => number;
}

const STYLE_ID = 'hyv-debug-style';
const RESCAN_MS = 1000;
const PANEL_MS = 250;
const SPARK_SAMPLES = 48;

const CSS = /* css */ `
.hyv-debug {
	position: fixed; inset: 0; z-index: var(--z-debug, 30); pointer-events: none; overflow: hidden;
	color: var(--debug-cobalt); font-family: 'Martian Mono Variable', ui-monospace, monospace;
	font-size: var(--fs-micro, 0.625rem); letter-spacing: 0.08em; line-height: 1.2;
	font-variant-numeric: tabular-nums; contain: strict;
}
.hyv-debug[hidden] { display: none; }
.hyv-debug__page { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; }
.hyv-debug__box {
	--c: var(--debug-cobalt); --l: var(--bracket, 10px); --w: var(--bracket-w, 1.5px);
	position: absolute; left: 0; top: 0;
	background:
		linear-gradient(var(--c) 0 0) 0 0 / var(--l) var(--w) no-repeat,
		linear-gradient(var(--c) 0 0) 0 0 / var(--w) var(--l) no-repeat,
		linear-gradient(var(--c) 0 0) 100% 0 / var(--l) var(--w) no-repeat,
		linear-gradient(var(--c) 0 0) 100% 0 / var(--w) var(--l) no-repeat,
		linear-gradient(var(--c) 0 0) 0 100% / var(--l) var(--w) no-repeat,
		linear-gradient(var(--c) 0 0) 0 100% / var(--w) var(--l) no-repeat,
		linear-gradient(var(--c) 0 0) 100% 100% / var(--l) var(--w) no-repeat,
		linear-gradient(var(--c) 0 0) 100% 100% / var(--w) var(--l) no-repeat;
}
.hyv-debug__label {
	position: absolute; left: 0; bottom: 100%; margin-bottom: 3px; padding: 1px 4px;
	white-space: nowrap; background: var(--paper); box-shadow: inset 0 0 0 1px var(--debug-cobalt);
}
.hyv-debug__ring {
	position: absolute; left: 0; top: 0; border-radius: 50%;
	border: 1px dashed var(--debug-cobalt); will-change: transform; visibility: hidden;
}
.hyv-debug__cross {
	position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px;
	background:
		linear-gradient(var(--debug-cobalt) 0 0) 50% 0 / 1px 100% no-repeat,
		linear-gradient(var(--debug-cobalt) 0 0) 0 50% / 100% 1px no-repeat;
}
.hyv-debug__readout {
	position: absolute; left: 0; top: 0; padding: 1px 4px; white-space: nowrap;
	background: var(--paper); will-change: transform; visibility: hidden;
}
.hyv-debug__stats {
	position: absolute; top: 64px; right: 28px; width: 188px; padding: 10px 12px 12px;
	background: var(--paper); box-shadow: inset 0 0 0 1px var(--debug-cobalt); text-transform: uppercase;
}
.hyv-debug__stats h2 {
	margin: 0 0 8px; font: inherit; font-weight: 600; letter-spacing: inherit;
	display: flex; justify-content: space-between; gap: 8px; white-space: nowrap;
}
.hyv-debug__row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
.hyv-debug__row span:first-child { opacity: 0.72; }
.hyv-debug__spark { display: block; width: 100%; height: 28px; margin: 4px 0 6px; }
@media (max-width: 639px) {
	.hyv-debug__stats { top: 56px; right: 16px; width: 172px; padding: 8px 10px 10px; }
}
`;

interface Box {
	el: HTMLElement;
	node: HTMLDivElement;
	label: HTMLSpanElement;
	fixed: boolean;
	key: string;
}

function ensureStyle() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = CSS;
	document.head.append(style);
}

function div(cls: string, parent: HTMLElement): HTMLDivElement {
	const d = document.createElement('div');
	d.className = cls;
	parent.append(d);
	return d;
}

/** 'p.copy': tag plus the first authored class (Svelte's scoping hashes are skipped). */
function describe(el: HTMLElement): string {
	const tag = el.tagName.toLowerCase();
	const cls = [...el.classList].find((c) => !c.startsWith('svelte-'));
	return cls ? `${tag}.${cls}` : tag;
}

const pad4 = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, '0');

export function createDebugOverlay(
	renderer: THREE.WebGLRenderer,
	o: DebugOverlayOptions = {}
): DebugOverlay {
	ensureStyle();
	const aggroPx = o.aggroPx ?? (() => 0.22 * (window.innerHeight / 2));

	const root = document.createElement('div');
	root.className = 'hyv-debug';
	root.hidden = true;
	root.setAttribute('aria-hidden', 'true');
	const page = div('hyv-debug__page', root);
	const fixedLayer = div('hyv-debug__page', root);
	const ring = div('hyv-debug__ring', root);
	div('hyv-debug__cross', ring);
	const readout = div('hyv-debug__readout', root);

	// ── Stats panel ─────────────────────────────────────────────────────────────────────────
	const panel = div('hyv-debug__stats', root);
	const title = document.createElement('h2');
	// SIM / RENDER come from CPU timings (no GPU timer query here), hence the tag.
	title.innerHTML = '<span>STAT UNIT · CPU</span><span>[3]</span>';
	panel.append(title);
	const rows = new Map<string, HTMLSpanElement>();
	const row = (key: string, label: string) => {
		const r = div('hyv-debug__row', panel);
		const l = document.createElement('span');
		l.textContent = label;
		const v = document.createElement('span');
		r.append(l, v);
		rows.set(key, v);
	};
	row('fps', 'FPS');
	const spark = document.createElement('canvas');
	spark.className = 'hyv-debug__spark';
	panel.append(spark);
	row('frame', 'FRAME MS');
	row('sim', 'SIM MS');
	row('render', 'RENDER MS');
	row('calls', 'DRAW CALLS');
	row('programs', 'PROGRAMS');
	row('textures', 'TEXTURES');
	row('entities', 'ENTITIES');
	row('numbers', 'NUMBERS');
	row('colliders', 'COLLIDERS');

	document.body.append(root);

	// ── Collider brackets ───────────────────────────────────────────────────────────────────
	const boxes = new Map<HTMLElement, Box>();
	let ro: ResizeObserver | null = null;
	let rescanTimer = 0;
	let visible = false;
	let lastY = Number.NaN;

	function measure(b: Box) {
		const r = b.el.getBoundingClientRect();
		const off = b.fixed ? 0 : 1;
		const x = r.left + window.scrollX * off - 4;
		const y = r.top + window.scrollY * off - 4;
		b.node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		b.node.style.width = `${r.width + 8}px`;
		b.node.style.height = `${r.height + 8}px`;
		const key = `${describe(b.el)} · ${Math.round(r.width)}×${Math.round(r.height)}`;
		if (key !== b.key) b.label.textContent = b.key = key;
		b.node.style.display = r.width > 0 && r.height > 0 ? '' : 'none';
	}

	function measureAll() {
		for (const b of boxes.values()) measure(b);
	}

	function rescan() {
		const found = new Set(document.querySelectorAll<HTMLElement>('[data-collider]'));
		for (const [el, b] of boxes) {
			if (found.has(el)) continue;
			b.node.remove();
			ro?.unobserve(el);
			boxes.delete(el);
		}
		for (const el of found) {
			if (boxes.has(el) || root.contains(el)) continue;
			const fixed = getComputedStyle(el).position === 'fixed';
			const node = div('hyv-debug__box', fixed ? fixedLayer : page);
			const label = document.createElement('span');
			label.className = 'hyv-debug__label';
			node.append(label);
			boxes.set(el, { el, node, label, fixed, key: '' });
			ro?.observe(el);
		}
		measureAll();
	}

	const onResize = () => measureAll();

	// ── Cursor ──────────────────────────────────────────────────────────────────────────────
	let mouseX = 0;
	let mouseY = 0;
	let mouseSeen = false;
	let mouseDirty = false;
	const onPointer = (e: PointerEvent) => {
		mouseX = e.clientX;
		mouseY = e.clientY;
		mouseDirty = true;
		if (!mouseSeen) {
			mouseSeen = true;
			ring.style.visibility = readout.style.visibility = 'visible';
		}
	};
	// Tracked from creation (coordinates only) so the ring is already in place when [3] opens.
	window.addEventListener('pointermove', onPointer, { passive: true });

	function placeCursor() {
		const r = aggroPx();
		ring.style.width = ring.style.height = `${r * 2}px`;
		ring.style.transform = `translate3d(${mouseX - r}px, ${mouseY - r}px, 0)`;
		readout.textContent = `X ${pad4(mouseX)} Y ${pad4(mouseY)}`;
		readout.style.transform = `translate3d(${mouseX + 14}px, ${mouseY + 14}px, 0)`;
	}

	// ── Panel + sparkline ───────────────────────────────────────────────────────────────────
	const samples = new Float32Array(SPARK_SAMPLES);
	let sampleCount = 0;
	let frames = 0;
	let elapsed = 0;
	const sparkCtx = spark.getContext('2d');

	function cssVar(name: string): string {
		return getComputedStyle(root).getPropertyValue(name).trim();
	}

	function drawSpark(fps: number) {
		if (!sparkCtx) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const w = Math.max(1, Math.round(spark.clientWidth * dpr));
		const h = Math.max(1, Math.round(spark.clientHeight * dpr));
		if (spark.width !== w || spark.height !== h) {
			spark.width = w;
			spark.height = h;
		}
		const ctx = sparkCtx;
		ctx.clearRect(0, 0, w, h);
		const cobalt = cssVar('--debug-cobalt') || '#2440ff';
		// 60 fps budget line.
		ctx.fillStyle = cobalt;
		ctx.globalAlpha = 0.3;
		for (let x = 0; x < w; x += 4 * dpr)
			ctx.fillRect(x, Math.round(h * (1 - 60 / 75)), 2 * dpr, dpr);
		ctx.globalAlpha = 1;
		const n = Math.min(sampleCount, SPARK_SAMPLES);
		if (n < 2) return;
		ctx.strokeStyle = cobalt;
		ctx.lineWidth = dpr;
		ctx.beginPath();
		for (let i = 0; i < n; i++) {
			const v = samples[(sampleCount - n + i) % SPARK_SAMPLES];
			const x = (i / (SPARK_SAMPLES - 1)) * (w - 3 * dpr);
			const y = h - Math.min(1, v / 75) * (h - dpr) - dpr / 2;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		// Head marker in the budget colour: lime (dark only) / cobalt ≥ 58, amber 45–57, signal below.
		const dark = DARK_THEMES.has(theme.name);
		ctx.fillStyle =
			fps >= 58
				? dark
					? cssVar('--debug-lime') || '#b8ff3d'
					: cobalt
				: fps >= 45
					? cssVar('--debug-amber') || '#ffb020'
					: cssVar('--signal') || '#ff4a1c';
		const hx = ((n - 1) / (SPARK_SAMPLES - 1)) * (w - 3 * dpr);
		const hy = h - Math.min(1, fps / 75) * (h - dpr) - dpr / 2;
		ctx.fillRect(hx - 1.5 * dpr, hy - 1.5 * dpr, 3 * dpr, 3 * dpr);
	}

	const set = (key: string, v: string) => {
		const el = rows.get(key)!;
		if (el.textContent !== v) el.textContent = v;
	};
	const fmt = (n: number) => n.toLocaleString('en-US');

	function publishPanel(fps: number) {
		const info = renderer.info;
		set('fps', String(fps));
		set('frame', stats.frameMs.toFixed(1));
		set('sim', stats.simMs.toFixed(2));
		set('render', stats.renderMs.toFixed(2));
		set('calls', String(stats.drawCalls || info.render.calls));
		set('programs', String(info.programs?.length ?? 0));
		set('textures', String(info.memory.textures));
		set('entities', fmt(stats.entities));
		set('numbers', `${fmt(stats.onScreen)} / ${fmt(stats.numbersDrawn)}`);
		set('colliders', String(boxes.size));
		drawSpark(fps);
	}

	return {
		el: root,
		get visible() {
			return visible;
		},
		show() {
			if (visible) return;
			visible = true;
			root.hidden = false;
			ro = new ResizeObserver(onResize);
			rescan();
			for (const el of boxes.keys()) ro.observe(el);
			rescanTimer = window.setInterval(rescan, RESCAN_MS);
			window.addEventListener('resize', onResize);
			ScrollTrigger.addEventListener('refresh', onResize);
			mouseDirty = mouseSeen;
			lastY = Number.NaN;
			elapsed = frames = 0;
			publishPanel(stats.fps);
		},
		hide() {
			if (!visible) return;
			visible = false;
			root.hidden = true;
			ro?.disconnect();
			ro = null;
			clearInterval(rescanTimer);
			window.removeEventListener('resize', onResize);
			ScrollTrigger.removeEventListener('refresh', onResize);
		},
		setBand(top, bottom) {
			root.style.clipPath =
				top <= 0 && bottom >= 1
					? ''
					: `inset(${(top * 100).toFixed(2)}% 0 ${((1 - bottom) * 100).toFixed(2)}% 0)`;
		},
		update(dt) {
			if (!visible) return;
			const y = scroll.y || window.scrollY;
			if (y !== lastY) {
				lastY = y;
				page.style.transform = `translate3d(0, ${-y}px, 0)`;
			}
			if (mouseDirty) {
				mouseDirty = false;
				placeCursor();
			}
			frames++;
			elapsed += dt * 1000;
			if (elapsed >= PANEL_MS) {
				const fps = Math.round((frames * 1000) / elapsed);
				samples[sampleCount % SPARK_SAMPLES] = fps;
				sampleCount++;
				frames = 0;
				elapsed = 0;
				publishPanel(fps);
			}
		},
		dispose() {
			this.hide();
			window.removeEventListener('pointermove', onPointer);
			root.remove();
			boxes.clear();
		}
	};
}
