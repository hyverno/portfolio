// The hero's side of the crowd (§S1): the landing, the Width March and the idle stadium wave.
//
//  · Landing: once booted and baked, claim('hero') and blend spawn → hero-wide (march) or
//    spawn → hero-tall (everywhere else) over 1.4s `arrive`; the Hilbert order lands it left → right.
//  · March (desktop pin): while the pin progress p < .45 the hero holds the claim and writes
//    hero-wide → hero-tall (p / .45). From .45 it lets go, and the README anchor (declared
//    `from: 'hero-tall'`) takes the crowd: same shape at mix 0, then the flock as it scrolls in.
//  · Tall mode (mobile, coarse, reduced): the hero only owns the landing, then hands over.
//  · Reduced motion: no landing; hero-tall is set at once (the engine snaps it) and handed over.
//
// Single-writer protocol: blend() is only ever called with { owner: 'hero' } while claimed, and
// every exit path releases. The hero also holds the crowd from boot until its bakes are in: when
// nobody owns the crowd right after boot and its blend is still spawn → spawn, the engine spreads
// it to 'ambient' with a tween of its own that would overwrite the anchors for 1.4s. Every
// handover therefore leaves a non-spawn blend behind before releasing.
import { gsap } from '#lib/core/motion';
import { scroll } from '#lib/core/scroll.svelte';
import { PRIORITY, onFrame } from '#lib/core/ticker';
import type { Crowd } from '#lib/gl/types';
import { HERO_OWNER, HERO_TALL_ID, HERO_WIDE_ID, MARCH_SPLIT } from './formations';
import type { HeroMode } from './mode';

/** Engine extras the hero uses (Crowd.ts implements them; types.ts lists only the contract). */
export type HeroCrowd = Crowd & {
	sendWave?(o?: { duration?: number; amplitude?: number }): void;
	readonly blendState?: { from: string; to: string; mix: number };
};

const LAND_S = 1.4;
/**
 * A bake that never lands must not keep the crowd parked on the spawner forever. The hero's bakes
 * are queued first, so this only trips on a stalled or failed bake.
 */
const HOLD_LIMIT_MS = 6000;
/** Desktop: first wave once the lede has risen, then every 7s (§5 "Idle stadium wave"). */
const WAVE_FIRST_S = 2.6;
const WAVE_EVERY_S = 7;
/** Mobile: the wave plays once, shortly after the landing. */
const WAVE_ONCE_S = 1.1;

export interface DirectorHooks {
	/** The landing finished (or was skipped because the visitor is elsewhere on the page). */
	landed(o: { skipped: boolean }): void;
}

export class HeroDirector {
	private crowd: HeroCrowd | null = null;
	private baked = false;
	private booted = false;
	private started = false;
	private mode: HeroMode = 'tall';
	private reduced = false;
	private p = 0;
	private land = { v: 0 };
	private landing: gsap.core.Tween | null = null;
	private landed = false;
	private claimed = false;
	/** Top owner last frame (to notice the crowd coming back after someone borrowed it). */
	private lastOwner: string | null = null;
	private holdTimer = 0;
	/** The bake was late and the crowd was handed over meanwhile: land from where it is now. */
	private gaveUp = false;
	private landFrom = 'spawn';
	private waveClock = 0;
	private waves = 0;
	private offFrame: (() => void) | null = null;
	private disposed = false;

	constructor(private hooks: DirectorHooks) {}

	/** The engine is up (the hero can hold the crowd from now on). */
	setCrowd(crowd: HeroCrowd): void {
		this.crowd = crowd;
		this.offFrame ??= onFrame(this.frame, PRIORITY.input);
		this.sync();
	}

	/** Both hero formations are baked. */
	ready(): void {
		performance.mark('hyv:hero-baked');
		this.baked = true;
		this.sync();
	}

	/** `whenBooted()` resolved (the preloader has left). */
	boot(): void {
		this.booted = true;
		this.sync();
	}

	setMode(mode: HeroMode, reduced: boolean): void {
		const changed = mode !== this.mode || reduced !== this.reduced;
		this.mode = mode;
		this.reduced = reduced;
		if (mode !== 'march') this.p = 0;
		if (!changed) return;
		// A new layout mid-landing: settle into the new mode's steady state instead.
		if (this.landing) this.finishLanding(false);
		this.waveClock = 0;
		this.write();
	}

	/** Smoothed pin progress, 0..1 (march mode only). */
	setProgress(p: number): void {
		this.p = p;
		// Scrolling during the landing retargets: the physics absorbs the jump.
		if (this.landing && p > 0.002) this.finishLanding(false);
		this.write();
	}

	dispose(): void {
		this.disposed = true;
		clearTimeout(this.holdTimer);
		this.landing?.kill();
		this.landing = null;
		this.offFrame?.();
		this.offFrame = null;
		this.setClaim(false);
		this.crowd = null;
	}

	// ── internals ────────────────────────────────────────────────────────────────────────────

	private sync(): void {
		const c = this.crowd;
		if (this.disposed || this.started || !c || !this.booted) return;
		if (!this.baked) {
			// Keep the crowd on the spawner until the name is ready (see the header), but never
			// freeze the page on a late bake: hand over, let the copy in, land when it arrives.
			if (!this.gaveUp) this.setClaim(true);
			if (!this.holdTimer)
				this.holdTimer = window.setTimeout(() => {
					if (this.started || this.disposed) return;
					this.gaveUp = true;
					this.handOver(0);
					this.hooks.landed({ skipped: false });
				}, HOLD_LIMIT_MS);
			return;
		}
		clearTimeout(this.holdTimer);
		this.started = true;
		const atTop = this.mode === 'march' ? this.p < 0.002 : scroll.y < innerHeight * 0.35;
		if (!atTop || this.reduced) {
			// Mid-page arrival (restored scroll): the anchors take the crowd from the spawner.
			// Reduced motion: hero-tall at once (snapped), then the README anchor holds it.
			this.handOver(this.reduced && atTop ? 1 : 0);
			this.landed = true;
			this.hooks.landed({ skipped: !atTop });
			this.write();
			return;
		}
		const s = this.crowd?.blendState;
		this.landFrom = this.gaveUp && s ? (s.mix >= 0.5 ? s.to : s.from) : 'spawn';
		this.land.v = 0;
		performance.mark('hyv:hero-land');
		this.landing = gsap.to(this.land, {
			v: 1,
			duration: LAND_S,
			ease: 'arrive',
			onUpdate: () => this.write(),
			onComplete: () => this.finishLanding(true)
		});
		this.write();
	}

	/** Leaves a non-spawn blend behind (the engine then keeps its hands off) and lets go. */
	private handOver(mix: number): void {
		const c = this.crowd;
		if (!c) return;
		this.setClaim(true);
		c.blend('spawn', HERO_TALL_ID, mix, { owner: HERO_OWNER });
		this.setClaim(false);
	}

	private finishLanding(complete: boolean): void {
		const tween = this.landing;
		this.landing = null;
		tween?.kill();
		if (this.landed) return;
		this.landed = true;
		if (complete) this.land.v = 1;
		this.hooks.landed({ skipped: false });
		this.write();
	}

	/** Claims and writes, or releases, according to the current state. */
	private write(): void {
		const c = this.crowd;
		if (!c || this.disposed || !this.started) return;
		const march = this.mode === 'march';
		if (this.landing) {
			this.setClaim(true);
			c.blend(this.landFrom, march ? HERO_WIDE_ID : HERO_TALL_ID, this.land.v, { owner: HERO_OWNER });
			return;
		}
		if (march && this.landed && this.p < MARCH_SPLIT) {
			this.setClaim(true);
			c.blend(HERO_WIDE_ID, HERO_TALL_ID, this.p / MARCH_SPLIT, { owner: HERO_OWNER });
			return;
		}
		this.setClaim(false);
	}

	private setClaim(on: boolean): void {
		const c = this.crowd;
		if (!c || on === this.claimed) return;
		this.claimed = on;
		if (on) c.claim(HERO_OWNER);
		else c.release(HERO_OWNER);
	}

	/**
	 * Per frame: a borrowed crowd coming back (the Ink Swarm language switch, #1,445 claim on top of
	 * ours and leave a blend of their own behind) is re-asserted; on mobile a scroll during the
	 * landing hands the crowd to the anchors at once; and the idle wave.
	 */
	private frame = (_t: number, dt: number): void => {
		const c = this.crowd;
		if (this.disposed || !c) return;
		const owner = c.owner;
		if (owner !== this.lastOwner) {
			const back = this.claimed && owner === HERO_OWNER;
			this.lastOwner = owner;
			if (back) this.write();
		}
		if (this.landing && this.mode !== 'march' && scroll.y > 24) this.finishLanding(false);
		// Safety net: far below the hero (its pin spans one viewport) the march is over whatever
		// the progress callbacks said; never keep the crowd parked up here.
		if (this.claimed && !this.landing && this.mode === 'march' && scroll.y > innerHeight * 1.5) {
			this.p = 1;
			this.write();
		}
		this.tickWave(dt);
	};

	private tickWave(dt: number): void {
		const c = this.crowd;
		if (!c?.sendWave || !this.landed || this.reduced || document.hidden) return;
		const march = this.mode === 'march';
		const atRest = march ? this.p < 0.01 && this.claimed : scroll.y < innerHeight * 0.25;
		if (!atRest) {
			// Out of view or mid-march: count again from zero once the hero is back at rest.
			this.waveClock = 0;
			return;
		}
		if (!march && this.waves > 0) return;
		this.waveClock += dt;
		const due = march ? (this.waves === 0 ? WAVE_FIRST_S : WAVE_EVERY_S) : WAVE_ONCE_S;
		if (this.waveClock < due) return;
		this.waveClock = 0;
		this.waves++;
		c.sendWave({ duration: 1.2, amplitude: 0.03 });
	}
}
