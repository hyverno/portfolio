// Damage-number glyph atlas (§S3): Martian Mono 800 at 64px, '0123456789!•' in a 768×80 strip,
// drawn at runtime. Drawn first with a fallback mono stack, then redrawn once the webfont loads.
import * as THREE from 'three';

export const GLYPHS = '0123456789!•';
export const GLYPH_BANG = 10;
export const GLYPH_DOT = 11;
export const CELL_W = 64;
export const CELL_H = 80;

const FAMILY = '"Martian Mono Variable"';
const FONT = `800 64px ${FAMILY}`;
const FALLBACK = '800 64px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const LOAD_TIMEOUT_MS = 3000;

export interface Atlas {
	texture: THREE.CanvasTexture;
	/** Digit advance as a fraction of the cell width (glyph spacing in the shader). */
	advance: number;
	/** Resolves once the final font has been drawn (or the fallback kept). */
	ready: Promise<void>;
	/** Called after every redraw (e.g. so materials can pick up the new advance). */
	onChange(fn: () => void): () => void;
}

function draw(ctx: CanvasRenderingContext2D, font: string): number {
	const { width, height } = ctx.canvas;
	ctx.clearRect(0, 0, width, height);
	ctx.font = font;
	ctx.fillStyle = '#fff';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';

	// Digits and '!' share a baseline that centres the digit box; the dot centres on its own ink.
	const zero = ctx.measureText('0');
	const digitBase = CELL_H / 2 + (zero.actualBoundingBoxAscent - zero.actualBoundingBoxDescent) / 2;
	const dot = ctx.measureText('•');
	const dotBase = CELL_H / 2 + (dot.actualBoundingBoxAscent - dot.actualBoundingBoxDescent) / 2;

	for (let i = 0; i < GLYPHS.length; i++) {
		const x = i * CELL_W + CELL_W / 2;
		ctx.fillText(GLYPHS[i], x, i === GLYPH_DOT ? dotBase : digitBase);
	}
	return Math.min(1, Math.max(0.4, zero.width / CELL_W));
}

function waitForFont(): Promise<boolean> {
	if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false);
	const loaded = document.fonts.load(FONT, '0123456789!').then(
		(faces) => faces.length > 0,
		() => false
	);
	const timeout = new Promise<boolean>((r) => setTimeout(() => r(false), LOAD_TIMEOUT_MS));
	return Promise.race([loaded, timeout]);
}

let shared: Atlas | null = null;
let users = 0;

/** Ref-counted shared atlas: every DamageNumbers instance samples the same texture. */
export function acquireAtlas(): Atlas {
	users++;
	if (shared) return shared;

	const canvas = document.createElement('canvas');
	canvas.width = CELL_W * GLYPHS.length;
	canvas.height = CELL_H;
	const ctx = canvas.getContext('2d')!;

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.NoColorSpace;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.generateMipmaps = true;
	texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

	const listeners = new Set<() => void>();
	const atlas: Atlas = {
		texture,
		advance: draw(ctx, FALLBACK),
		ready: Promise.resolve(),
		onChange(fn) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		}
	};
	atlas.ready = waitForFont().then((ok) => {
		if (!ok || shared !== atlas) return;
		atlas.advance = draw(ctx, FONT);
		texture.needsUpdate = true;
		for (const fn of listeners) fn();
	});
	shared = atlas;
	return atlas;
}

export function releaseAtlas(): void {
	users = Math.max(0, users - 1);
	if (users > 0 || !shared) return;
	shared.texture.dispose();
	shared = null;
}
