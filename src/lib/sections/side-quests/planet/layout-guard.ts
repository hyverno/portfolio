// Layout guard (workaround, see the S-planet report): headings with a width march render wide (more
// lines) until revealed, then shrink, which shifts everything below them without resizing it. Region
// rects, colliders and pin positions cached by ScrollTrigger go stale by that shift, and a pin that
// engages late jumps. This watches the page height and runs one debounced ScrollTrigger.refresh()
// (which re-measures regions and colliders too) after it settles, never while a pin is active.
import { ScrollTrigger } from '#lib/core/motion';

let refs = 0;
let ro: ResizeObserver | null = null;
let timer = 0;
let lastH = -1;

function pinned(): boolean {
	return ScrollTrigger.getAll().some((st) => !!st.pin && st.isActive);
}

function schedule(): void {
	clearTimeout(timer);
	timer = window.setTimeout(() => {
		if (pinned()) return schedule();
		ScrollTrigger.refresh();
	}, 320);
}

/** Starts the shared guard (ref-counted). Returns the release function. */
export function guardLayout(): () => void {
	if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return () => {};
	refs++;
	if (!ro) {
		ro = new ResizeObserver((records) => {
			const h = records[records.length - 1]?.contentRect.height ?? 0;
			if (lastH < 0) {
				lastH = h;
				return;
			}
			if (Math.abs(h - lastH) < 2) return;
			lastH = h;
			schedule();
		});
		ro.observe(document.body);
	}
	let released = false;
	return () => {
		if (released) return;
		released = true;
		if (--refs > 0) return;
		ro?.disconnect();
		ro = null;
		lastH = -1;
		clearTimeout(timer);
	};
}
