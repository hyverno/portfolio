// Global input (§S3, §3.5): the pointer is an invisible obstacle in the sim; a click on empty space
// pings (shockwave + damage numbers); a mouse drag on empty space is an RTS marquee; keys 1–4
// switch view modes; Esc deselects. Touch: tap = ping, nothing ever blocks native scrolling.
import type { DamageNumbers, ViewMode } from './types';
import type { Crowd } from './crowd/Crowd';
import type { Selection } from './select';
import { device } from '#lib/core/device.svelte';
import { FLAGS } from '#lib/core/flags';
import { onKey } from '#lib/core/keys';
import { unlock } from '#lib/stores/achievements.svelte';
import { sfx } from '#lib/ui/sfx';

/** Window event for the marquee visual (A4's cursor): detail = MarqueeDetail, viewport px. */
export const MARQUEE_EVENT = 'hyv:marquee';
export interface MarqueeDetail {
	x: number;
	y: number;
	w: number;
	h: number;
	active: boolean;
}

/** Clicks here are the page's, never the crowd's. */
const INTERACTIVE =
	'a, button, input, textarea, select, label, summary, details, iframe, video, audio, [data-interact], [contenteditable], [role="button"], [role="link"], [role="tab"], [role="slider"], [data-no-ping]';
/** Drags starting on copy select text instead of units. */
const TEXTUAL = '[data-collider], p, h1, h2, h3, h4, h5, h6, li, dd, dt, td, th, blockquote, pre, code, figcaption';
const DRAG_PX = 6;

export interface InputOptions {
	crowd: Crowd;
	numbers: DamageNumbers;
	selection: Selection;
	setViewMode(m: ViewMode): void;
}

function closest(target: EventTarget | null, selector: string): Element | null {
	return target instanceof Element ? target.closest(selector) : null;
}

export function initInput(o: InputOptions): () => void {
	const { crowd, numbers, selection } = o;
	let drag: { id: number; x0: number; y0: number; x: number; y: number; active: boolean } | null = null;
	let suppressClick = false;
	let userSelect = '';

	const emit = (d: MarqueeDetail) => window.dispatchEvent(new CustomEvent<MarqueeDetail>(MARQUEE_EVENT, { detail: d }));
	const rect = (d: NonNullable<typeof drag>) => ({
		x: Math.min(d.x0, d.x),
		y: Math.min(d.y0, d.y),
		w: Math.abs(d.x - d.x0),
		h: Math.abs(d.y - d.y0)
	});

	function onMove(e: PointerEvent) {
		if (e.pointerType === 'touch') {
			// A finger only parts the crowd while it is down.
			if (e.buttons) crowd.setPointerPx(e.clientX, e.clientY, true);
			return;
		}
		crowd.setPointerPx(e.clientX, e.clientY, true);
		if (!drag || e.pointerId !== drag.id) return;
		drag.x = e.clientX;
		drag.y = e.clientY;
		if (!drag.active && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > DRAG_PX) {
			drag.active = true;
			window.getSelection()?.removeAllRanges();
			userSelect = document.documentElement.style.userSelect;
			document.documentElement.style.userSelect = 'none';
		}
		if (drag.active) emit({ ...rect(drag), active: true });
	}

	function onDown(e: PointerEvent) {
		if (e.pointerType === 'touch') {
			crowd.setPointerPx(e.clientX, e.clientY, true);
			return;
		}
		if (e.button !== 0 || !FLAGS.rts || device.reducedMotion) return;
		if (closest(e.target, INTERACTIVE) || closest(e.target, TEXTUAL)) return;
		drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, active: false };
	}

	function endDrag(e: PointerEvent, cancelled: boolean) {
		if (!drag || e.pointerId !== drag.id) return;
		const d = drag;
		drag = null;
		if (!d.active) return;
		document.documentElement.style.userSelect = userSelect;
		emit({ ...rect(d), active: false });
		suppressClick = true;
		if (cancelled) return;
		const r = rect(d);
		if (r.w > 2 && r.h > 2) void selection.select(new DOMRectReadOnly(r.x, r.y, r.w, r.h));
	}

	function onUp(e: PointerEvent) {
		if (e.pointerType === 'touch') crowd.setPointerPx(e.clientX, e.clientY, false);
		endDrag(e, false);
	}

	function onCancel(e: PointerEvent) {
		if (e.pointerType === 'touch') crowd.setPointerPx(e.clientX, e.clientY, false);
		endDrag(e, true);
	}

	function onLeave(e: PointerEvent) {
		if (!e.relatedTarget) crowd.setPointerPx(e.clientX, e.clientY, false);
	}

	function onBlur() {
		crowd.setPointerPx(0, 0, false);
	}

	function onClick(e: MouseEvent) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		if (e.button !== 0 || e.defaultPrevented) return;
		if (closest(e.target, INTERACTIVE)) return;
		// The user just selected some text: not a ping.
		const sel = window.getSelection();
		if (sel && !sel.isCollapsed && sel.toString().trim()) return;
		if (selection.click(e.clientX, e.clientY)) return;
		if (device.reducedMotion) return;
		crowd.ping(e.clientX, e.clientY);
		if (FLAGS.numbers) {
			numbers.burst(e.clientX, e.clientY, { count: 12 + Math.floor(Math.random() * 29), radius: 54, critRate: 0.1 });
		}
		sfx('ping');
		unlock('first-blood');
	}

	const opts: AddEventListenerOptions = { passive: true };
	window.addEventListener('pointermove', onMove, opts);
	window.addEventListener('pointerdown', onDown, opts);
	window.addEventListener('pointerup', onUp, opts);
	window.addEventListener('pointercancel', onCancel, opts);
	document.documentElement.addEventListener('pointerleave', onLeave, opts);
	window.addEventListener('blur', onBlur);
	window.addEventListener('click', onClick);

	const offKeys = [
		onKey('Escape', () => selection.clear()),
		...([1, 2, 3, 4] as const).map((m) => onKey(String(m), () => FLAGS.viewModes && o.setViewMode(m)))
	];

	return () => {
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerdown', onDown);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onCancel);
		document.documentElement.removeEventListener('pointerleave', onLeave);
		window.removeEventListener('blur', onBlur);
		window.removeEventListener('click', onClick);
		for (const off of offKeys) off();
		if (drag?.active) document.documentElement.style.userSelect = userSelect;
	};
}
