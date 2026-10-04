// The #1,445 payoff (S4), loaded on demand by `konami.ts`: a 120ms global hitch, the crowd
// spells `1,445` for 2.4s, the trophy odometer rolls 1,444 → 1,445. The [4] keycap's gold rim is
// derived from the unlock in the HUD.
import { DUR, EASE, gsap } from '#lib/core/motion';
import { device } from '#lib/core/device.svelte';
import { getEngine } from '#lib/gl/handle';
import { unlock } from '#lib/stores/achievements.svelte';
import { chrome } from './chrome.svelte';
import { sfx } from './sfx';

const FORMATION = 'konami-1445';
const OWNER = 'konami';
const HITCH_MS = 120;
const HOLD_MS = 2400;
const DEFINE_TIMEOUT_MS = 2000;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let running = false;
let region: HTMLElement | null = null;

/**
 * Fixed region the glyphs are baked into. The spec names `document.body`, but in 'fixed' space the
 * body rect is the whole (scrolled) page; a dedicated centred viewport box keeps `1,445` on screen.
 */
function konamiRegion(): HTMLElement {
	if (region?.isConnected) return region;
	region = document.createElement('div');
	region.dataset.formationRegion = FORMATION;
	region.setAttribute('aria-hidden', 'true');
	Object.assign(region.style, {
		position: 'fixed',
		left: '12vw',
		right: '12vw',
		top: '28vh',
		bottom: '28vh',
		pointerEvents: 'none',
		visibility: 'hidden'
	});
	document.body.appendChild(region);
	return region;
}

/** All tweens stop for one beat, like a frame hitch on a big hit. */
function hitch() {
	if (device.reducedMotion) return;
	gsap.globalTimeline.pause();
	setTimeout(() => gsap.globalTimeline.resume(), HITCH_MS);
}

async function rollOdometer() {
	// First appearance shows 1,444 instantly; a replay rolls back first. Then the last digit rolls.
	chrome.devRoll = 1444;
	await delay(device.reducedMotion ? 0 : 320);
	chrome.devRoll = 1445;
}

async function formCrowd() {
	const crowd = getEngine()?.crowd;
	if (!crowd) return;
	await Promise.race([
		crowd.define(
			FORMATION,
			{ kind: 'glyphs', key: '1445' },
			{ el: konamiRegion(), space: 'fixed' }
		),
		delay(DEFINE_TIMEOUT_MS)
	]);
	if (!crowd.has(FORMATION)) return;
	crowd.claim(OWNER);
	try {
		const s = { m: 0 };
		const apply = () => crowd.blend('ambient', FORMATION, s.m, { owner: OWNER });
		if (device.reducedMotion) {
			s.m = 1;
			apply();
		} else {
			await gsap.to(s, { m: 1, duration: DUR.morph, ease: EASE.arrive, onUpdate: apply });
		}
		await delay(HOLD_MS);
	} finally {
		crowd.release(OWNER);
	}
}

/** Plays the #1,445 payoff. Re-entrant calls while it runs are ignored; replays never re-toast. */
export async function developerMode(): Promise<void> {
	if (running) return;
	running = true;
	try {
		unlock('dev-mode');
		sfx('crit');
		hitch();
		await delay(HITCH_MS);
		await Promise.all([rollOdometer(), formCrowd()]);
	} catch {
		/* the payoff is decoration: never let it surface an error */
	} finally {
		running = false;
	}
}
