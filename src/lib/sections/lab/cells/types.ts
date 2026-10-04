// Shared contract of the six Lab cells (DESIGN.md §5 "05 · LAB", §9.2 A8).
// Canvas2D cells: `create(canvas, opts) → LabCellImpl` (their own <canvas>, z 10).
// WebGL cells (`*Scene.ts`, dynamic-imported): `create(el, engine, opts) → LabSceneImpl`, a GLView
// on the shared renderer. Both are driven by LabCell.svelte: start/stop (IntersectionObserver,
// mobile centre cell, reduced motion), rate (hovered / focused cell 1, the others 2), input.
import type { GLView } from '#lib/gl/types';

export type Rate = 1 | 2;

/** The hose's keyboard nozzle height (fraction of its viewport), shared with the DOM gizmo. */
export const HOSE_NOZZLE_Y = 0.72;

export interface PointerInfo {
	/** Viewport-local CSS px. */
	x: number;
	y: number;
	/** The pointer is over the viewport. */
	inside: boolean;
	/** A button / finger is down. */
	down: boolean;
	touch: boolean;
}

export interface LabCellImpl {
	/** Advance the simulation every frame from the shared ticker. Idempotent. */
	start(): void;
	/** Freeze it; the last frame stays on screen. Idempotent. */
	stop(): void;
	/** Viewport size in CSS px. */
	resize(w: number, h: number): void;
	/** 1 = every frame (the hovered / focused cell), 2 = every other frame. */
	setRate(r: Rate): void;
	/** Keyboard; returns true when the key was used. */
	key?(k: string, down: boolean): boolean;
	pointer?(p: PointerInfo): void;
	/** Live parameters (sliders, toggles). */
	set?(p: Record<string, number | boolean>): void;
	/** Real values for the HUD line, read at 4 Hz. */
	readonly stats: Record<string, number>;
	dispose(): void;
}

export interface LabSceneImpl extends LabCellImpl {
	view: GLView;
	/** GL content opacity (hover dimming and the reveal); DOM cells use CSS opacity. */
	setOpacity(a: number): void;
}

export interface CellLabels {
	[k: string]: string;
}
