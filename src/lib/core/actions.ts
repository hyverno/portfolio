// Svelte actions shared by every section (§9.1).
import type { ActionReturn } from 'svelte/action';
import { DUR, EASE, ScrollTrigger, gsap, mm, registerMotion, revealSplit } from './motion';
import { setTheme, type ThemeName } from './theme.svelte';
import { registerCollider } from './colliders';
import { onKey } from './keys';
import { hud } from './stats.svelte';
import { getLocked, setLocked } from './lock.svelte';
import { onLangChange } from '#lib/i18n/index.svelte';

export { getLocked, setLocked };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A trigger band around the middle of the viewport. Refreshes after pins (lower priority). */
function middleBand(node: HTMLElement, onToggle: (active: boolean) => void): ScrollTrigger {
	registerMotion();
	return ScrollTrigger.create({
		trigger: node,
		start: 'top 50%',
		end: 'bottom 50%',
		refreshPriority: -1,
		onToggle: (self) => onToggle(self.isActive)
	});
}

/**
 * Section theme: when the section's top crosses 50% of the viewport, the page tweens to `name`.
 * Also mirrors `data-theme` on the node (the CSS fallback used when JS is off).
 */
export function themeSection(node: HTMLElement, name: ThemeName): ActionReturn<ThemeName> {
	let current = name;
	node.dataset.theme = name;
	const st = middleBand(node, (active) => active && setTheme(current));
	return {
		update(next) {
			current = next;
			node.dataset.theme = next;
			if (st.isActive) setTheme(next);
		},
		destroy() {
			st.kill();
		}
	};
}

export interface RevealParams {
	mode?: 'lines' | 'words' | 'fade';
	scrub?: boolean;
	delay?: number;
	widthMarch?: boolean;
}

function revealFade(node: HTMLElement, o: RevealParams): () => void {
	return mm(({ reduced }) => {
		gsap.from(node, {
			autoAlpha: 0,
			y: reduced ? 0 : 16,
			duration: reduced ? 0.2 : DUR.reveal,
			ease: reduced ? 'none' : EASE.steer,
			delay: o.delay ?? 0,
			scrollTrigger: { trigger: node, start: 'top 85%', ...(o.scrub ? { scrub: 1 } : { once: true }) }
		});
	});
}

/** Default line reveal (§3.3); 'words' staggers words; 'fade' (and reduced motion) fades in. */
export function reveal(node: HTMLElement, o: RevealParams = {}): ActionReturn<RevealParams | undefined> {
	const run = (p: RevealParams) =>
		p.mode === 'fade'
			? revealFade(node, p)
			: revealSplit(node, p.mode ?? 'lines', { scrub: p.scrub, delay: p.delay, widthMarch: p.widthMarch });
	// SplitText rebuilds the node from an HTML string, so Svelte's own text nodes end up detached and
	// keep receiving updates off-DOM. On a language switch, put Svelte's (already updated) nodes
	// back and split again: in-place EN ⇄ FR then works for every revealed element.
	const svelteNodes = [...node.childNodes];
	let opts = o;
	let cleanup = run(opts);
	const offLang = onLangChange(() => {
		cleanup();
		node.replaceChildren(...svelteNodes);
		cleanup = run(opts);
	});
	return {
		update(next = {}) {
			if (same(next, opts)) return;
			opts = next;
			cleanup();
			cleanup = run(opts);
		},
		destroy() {
			offLang();
			cleanup();
		}
	};
}

/** Registers the node as a crowd obstacle (cached rect) and sets `data-collider`. */
export function collider(node: HTMLElement, o: { pad?: number } = {}): ActionReturn<{ pad?: number } | undefined> {
	node.dataset.collider = '';
	let pad = o.pad ?? 0;
	let off = registerCollider(node, pad);
	return {
		update(next = {}) {
			if ((next.pad ?? 0) === pad) return;
			pad = next.pad ?? 0;
			off();
			off = registerCollider(node, pad);
		},
		destroy() {
			off();
			delete node.dataset.collider;
		}
	};
}

// ── interact ────────────────────────────────────────────────────────────────

let interactables = 0;
let offE: (() => void) | null = null;

function focusedInteractable(): HTMLElement | null {
	const el = document.activeElement;
	return el instanceof HTMLElement ? el.closest<HTMLElement>('[data-interact]') : null;
}

/** Visual acknowledgement within one frame (§3.1.6): `data-pressed` for 120ms. */
function press(el: HTMLElement) {
	el.dataset.pressed = '';
	setTimeout(() => delete el.dataset.pressed, 120);
	el.click();
}

function onE(e: KeyboardEvent) {
	if (e.repeat) return;
	const focused = focusedInteractable();
	const keyboardFocus = focused?.matches(':focus-visible') ? focused : null;
	const target = keyboardFocus ?? getLocked() ?? focused;
	if (!target?.isConnected) return;
	e.preventDefault();
	press(target);
}

/**
 * Lock-on target: sets `data-interact="VERB"`, makes the node focusable if it is not, and lets
 * E (or Enter / Space on non-native controls) click the locked or focused element.
 */
export function interact(node: HTMLElement, o: { verb: string }): ActionReturn<{ verb: string }> {
	node.dataset.interact = o.verb.toUpperCase();
	const native = node.tabIndex >= 0 || node.hasAttribute('tabindex');
	const addedRole = !native && !node.hasAttribute('role');
	if (!native) node.tabIndex = 0;
	if (addedRole) node.setAttribute('role', 'button');

	const onKeydown = (e: KeyboardEvent) => {
		if (e.target !== node || e.repeat) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			press(node);
		}
	};
	if (!native) node.addEventListener('keydown', onKeydown);

	interactables++;
	offE ??= onKey('e', onE);

	return {
		update(next) {
			node.dataset.interact = next.verb.toUpperCase();
			if (getLocked() === node) setLocked(node);
		},
		destroy() {
			if (!native) {
				node.removeEventListener('keydown', onKeydown);
				node.removeAttribute('tabindex');
			}
			if (addedRole) node.removeAttribute('role');
			delete node.dataset.interact;
			if (getLocked() === node) setLocked(null);
			if (--interactables === 0) {
				offE?.();
				offE = null;
			}
		}
	};
}

/** Writes the HUD section context line while the node crosses the middle of the viewport. */
export function hudLine(
	node: HTMLElement,
	o: { section: string; label: string; line?: string }
): ActionReturn<{ section: string; label: string; line?: string }> {
	let opts = o;
	const write = () => {
		hud.section = opts.section;
		hud.label = opts.label;
		hud.line = opts.line ?? '';
	};
	const st = middleBand(node, (active) => active && write());
	return {
		update(next) {
			opts = next;
			if (st.isActive) write();
		},
		destroy() {
			if (st.isActive && hud.section === opts.section) {
				hud.section = hud.label = hud.line = '';
			}
			st.kill();
		}
	};
}
