<!--
	03 · SHIPPED · LUDOGRAM (DESIGN.md §5): his three commercial games, theme `viewport` ("we're
	in-engine now").

	Desktop (fine pointer, full motion): the panel pins for +=200% with three slots snapping at 1/2.
	While pinned the crowd is claimed ('ludogram') and blended ludo-city → ludo-shelves → ludo-d20 by
	pin progress; each slot's brief swaps in when the progress crosses its midpoint.
	Mobile / coarse / reduced: three stacked 100svh cards (stage above the text); formations blend
	on enter (1.4s `arrive`), the paint sweep auto-plays, the d20 rolls on tap.
	No WebGL: static line drawings in each stage; peon, pack and roll still work.

	Hand-over without jumps: two anchors make the section part of the scroll-anchor chain. The
	`approach` anchor scrubs the README's formation into ludo-city as the panel comes up; the `exit`
	anchor holds ludo-d20 (from ludo-d20) once the pin ends, so releasing the claim at either end
	of the pin lands on exactly what the crowd already shows.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hudLine, interact, reveal, themeSection } from '#lib/core/actions';
	import { collideWhen } from './collide';
	import { DUR, EASE, ScrollTrigger, SplitText, gsap, mm } from '#lib/core/motion';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { scroll, scrollTo } from '#lib/core/scroll.svelte';
	import { device } from '#lib/core/device.svelte';
	import { refreshColliders } from '#lib/core/colliders';
	import { formation } from '#lib/gl/actions';
	import { whenEngine } from '#lib/gl/handle';
	import type { Engine } from '#lib/gl/types';
	import type { Crowd } from '#lib/gl/crowd/Crowd';
	import { DEFAULT_PARAMS } from '#lib/gl/crowd/presets';
	import { fmtHudDate, fmtNum, i18n, loc, t } from '#lib/i18n/index.svelte';
	import { games, studio } from '#lib/content/content';
	import { releaseLabel } from '#lib/content/status';
	import type { Game } from '#lib/content/types';
	import { unlock } from '#lib/stores/achievements.svelte';
	import { sfx } from '#lib/ui/sfx';
	import Keycap from '#lib/ui/Keycap.svelte';
	import Odometer from '#lib/ui/Odometer.svelte';
	import MissionBrief from './MissionBrief.svelte';
	import PeonLabel from './PeonLabel.svelte';
	import GhostCursors from './GhostCursors.svelte';
	import DiceResult from './DiceResult.svelte';
	import LudogramFallback from './LudogramFallback.svelte';
	import {
		CITY_Z,
		LUDO_CITY,
		LUDO_D20,
		LUDO_SHELVES,
		blockCenterN,
		citySplit,
		miniTopN,
		rarePaint
	} from './formations';
	import {
		BLOCKS,
		CITY_VIEW,
		DEFAULT_RARE,
		GROUND_Y,
		MINIS_PER_BLOCK,
		MINI_COUNT,
		PEON,
		RARE
	} from './geometry';
	import {
		faceOf,
		faceQuat,
		outcomeOf,
		qAxisAngle,
		qMul,
		qNormalize,
		qSlerp,
		quatToEuler,
		type Outcome,
		type Quat,
		type Vec3
	} from './d20';
	import { RectCache, type Box } from './rect';

	/** `/projects/[slug]` pages do not exist yet; flip once they do (a dead link breaks prerender). */
	const SPEC_SHEETS = false;

	const OWNER = 'ludogram';
	const IDS = ['ludo-city', 'ludo-shelves', 'ludo-d20'] as const;
	const KINDS = ['city', 'shelves', 'd20'] as const;
	/** 15% of the city box to the right at the end of the walk: CITY_Z · sin θ = 0.3. */
	const WALK_MAX = Math.asin(0.3 / CITY_Z);
	const STRIDE_S = 1.15;
	const SCAN_DEG = 30;
	const SCAN_COS = Math.cos((SCAN_DEG * Math.PI) / 180);
	const SCAN_SIN = Math.sin((SCAN_DEG * Math.PI) / 180);
	const PEON_FIRST = 4471;
	/** Title lines park this far (yPercent) outside their mask: the masks are padded, see MissionBrief. */
	const LINE_OUT = 145;
	const IDLE_AXIS: Vec3 = [0.35, 1, 0.15];
	const REST_Q: Quat = qNormalize(qMul(qAxisAngle([1, 0, 0], 0.42), qAxisAngle([0, 1, 0], 0.5)));

	// Strings the dictionary does not carry (BUILD-NOTES: local pairs + loc()).
	const LL = {
		viewport: { en: 'VIEWPORT', fr: 'VIEWPORT' },
		city: { en: 'CITY', fr: 'VILLE' },
		horde: { en: 'HORDE', fr: 'HORDE' },
		packs: { en: 'PACKS', fr: 'BOÎTES' },
		minis: { en: 'MINIS', fr: 'FIGURINES' },
		edges: { en: 'EDGES', fr: 'ARÊTES' },
		vertices: { en: 'VERTICES', fr: 'SOMMETS' },
		faces: { en: 'FACES', fr: 'FACES' },
		paint: { en: 'PRIMER → PAINT', fr: 'SOUS-COUCHE → PEINTURE' },
		studioNewTab: { en: 'opens in a new tab', fr: 's’ouvre dans un nouvel onglet' }
	};

	// ── state ──────────────────────────────────────────────────────────────────────────────────
	let root = $state<HTMLElement>();
	let panel = $state<HTMLElement>();
	let rail = $state<HTMLElement>();
	let flash = $state<HTMLElement>();
	let scanEl = $state<HTMLElement>();
	let peonAnchor = $state<HTMLElement>();
	let rareTag = $state<HTMLElement>();
	const slotEls: HTMLElement[] = $state([]);
	const fits: HTMLElement[] = $state([]);

	let mounted = $state(false);
	let mode = $state<'pin' | 'stack'>('stack');
	let active = $state(0);
	let now = $state<Date | null>(null);
	let hasEngine = $state(false);
	let entities = $state(0);
	let still = $state(false);
	/** Pinned: the pin rests between snaps (the brief is a crowd obstacle only then). */
	let settled = $state(true);

	let peons = $state(0);
	let peonId = $state(PEON_FIRST);
	let peonGone = $state(false);
	let peonSeen = $state(false);

	let rare = $state(-1);
	let painted = $state(false);

	let dice = $state<{ value: number | null; outcome: Outcome | null; seq: number; face: number }>({
		value: null,
		outcome: null,
		seq: 0,
		face: 20
	});

	// ── derived copy ───────────────────────────────────────────────────────────────────────────
	/** Prerender (and first client render) show fixed dates; onMount swaps in the live status. */
	function staticRelease(g: Game): string {
		return g.releases
			.map((r) => `${r.label[i18n.lang]} ${fmtHudDate(r.date, r.precision)}`)
			.join(' · ');
	}
	const releases = $derived(
		games.map((g) => (now ? releaseLabel(g, i18n.lang, now) : staticRelease(g)))
	);
	const hudExtra = $derived(peons > 0 ? t().shipped.peon.deployed(fmtNum(peons)) : '');
	const counts = $derived.by(() => {
		const c = entities ? citySplit(entities) : null;
		return [
			c ? `${loc(LL.city)} ${fmtNum(c.city)} · ${loc(LL.horde)} ${fmtNum(c.horde)}` : '',
			`${BLOCKS.length} ${loc(LL.packs)} · ${fmtNum(MINI_COUNT)} ${loc(LL.minis)}`,
			`30 ${loc(LL.edges)} · 12 ${loc(LL.vertices)} · 20 ${loc(LL.faces)}`
		];
	});
	/** The RARE PULL callout: a tag above the unit and a leader down to the pulled mini's head. */
	const rarePos = $derived.by(() => {
		if (rare < 0) return null;
		const [x, y] = miniTopN(rare);
		return { left: ((x + 1) / 2) * 100, depth: ((1 - y) / 2) * 100 };
	});
	const peonStatic = { left: (PEON[0] / CITY_VIEW[0]) * 100, top: (PEON[1] / CITY_VIEW[1]) * 100 };
	const groundTop = (GROUND_Y / CITY_VIEW[1]) * 100;
	const headline = $derived(t().shipped.headline);

	// ── engine-side handles (not reactive) ─────────────────────────────────────────────────────
	let engine: Engine | null = null;
	let crowd: Crowd | null = null;
	let rects: RectCache | null = null;
	let pinST: ScrollTrigger | null = null;
	/** Stacked cards: the trigger that owns the crowd (cards 2–3). */
	let claimST: ScrollTrigger | null = null;
	let claimed = false;
	let progress = 0;
	let walk = 0;
	let presetDirty = false;
	let boosted = false;
	const timers = new Set<ReturnType<typeof setTimeout>>();
	const later = (fn: () => void, ms: number) => {
		const id = setTimeout(() => {
			timers.delete(id);
			fn();
		}, ms);
		timers.add(id);
		return id;
	};
	const clearLater = (id: ReturnType<typeof setTimeout> | null) => {
		if (id == null) return;
		clearTimeout(id);
		timers.delete(id);
	};

	const box: Box = { x: 0, y: 0, w: 0, h: 0 };
	const euler: Vec3 = [0, 0, 0];

	const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

	// ── the crowd: claim protocol ──────────────────────────────────────────────────────────────

	function applyPinBlend() {
		if (!crowd || !claimed) return;
		const p = progress;
		if (p <= 0.5) crowd.blend(IDS[0], IDS[1], ramp(p, 0.1, 0.4), { owner: OWNER });
		else crowd.blend(IDS[1], IDS[2], ramp(p, 0.6, 0.9), { owner: OWNER });
	}

	let stackTween: gsap.core.Tween | null = null;
	/** Stacked cards: 1.4s `arrive` blend toward the active card's formation (cards 2–3 are claimed). */
	function stackBlend(animate = true) {
		if (!crowd || !claimed) return;
		const to = IDS[Math.max(1, active)];
		const s = crowd.blendState;
		const from = s.mix >= 0.5 ? s.to : s.from;
		stackTween?.kill();
		stackTween = null;
		if (from === to || !animate || still) {
			crowd.blend(from === to ? to : from, to, 1, { owner: OWNER });
			return;
		}
		const m = { v: 0 };
		stackTween = gsap.to(m, {
			v: 1,
			duration: DUR.morph,
			ease: EASE.arrive,
			onUpdate: () => crowd?.blend(from, to, m.v, { owner: OWNER })
		});
	}

	function claim() {
		if (claimed) return;
		claimed = true;
		if (!crowd) return;
		crowd.claim(OWNER);
		if (mode === 'pin') applyPinBlend();
		else stackBlend();
	}

	function release() {
		if (!claimed) return;
		claimed = false;
		stackTween?.kill();
		stackTween = null;
		if (!crowd) return;
		crowd.setScan(null);
		scanState.on = false;
		// Released on the last snap the die is still on screen (exit anchor): leave a roll in
		// progress and its outcome alone; land() puts the defaults back.
		if (!shows(IDS[2])) {
			unboost();
			if (presetDirty) {
				presetDirty = false;
				crowd.preset('march', { duration: 0.6 });
			}
		}
		crowd.release(OWNER);
		refreshColliders();
	}

	/**
	 * The crowd is showing formation `id`: claimed by us, or held by one of our anchors. ScrollTrigger
	 * reports the pin inactive at exactly progress 0 and 1 (the first and last snap), so at rest on
	 * slot 1 or 3 the claim is released and the approach / exit anchor shows the same formation.
	 */
	function shows(id: string): boolean {
		if (!crowd) return false;
		const s = crowd.blendState;
		return (s.mix >= 0.5 ? s.to : s.from) === id;
	}

	/** While the die tumbles, entities track their targets tightly so it reads as a rigid body. */
	function boost() {
		if (!crowd || !shows(IDS[2])) return;
		boosted = true;
		presetDirty = true;
		crowd.set({ seek: 16, maxSpeed: 7, maxForce: 50, arrive: 0.05, wander: 0, sep: 0.3 });
	}

	function unboost() {
		if (!boosted || !crowd) return;
		boosted = false;
		// The presets do not carry these two: put the engine defaults back.
		crowd.set({ maxForce: DEFAULT_PARAMS.maxForce, arrive: DEFAULT_PARAMS.arrive });
	}

	// ── slots ──────────────────────────────────────────────────────────────────────────────────

	let titleLines: (HTMLElement[] | null)[] = [null, null, null];
	let slotTl: gsap.core.Timeline | null = null;

	function slotParts(j: number) {
		const el = slotEls[j];
		return {
			rows: el ? [...el.querySelectorAll<HTMLElement>('[data-row]')] : [],
			title: el?.querySelector<HTMLElement>('[data-title]') ?? null,
			lines: titleLines[j] ?? [],
			ui: el ? [...el.querySelectorAll<HTMLElement>('[data-ui]')] : []
		};
	}

	/** Pinned: one slot visible at a time. Rows stay focusable (opacity only), so Tab still reaches them. */
	function showSlot(i: number, prev: number, animate: boolean) {
		slotEls.forEach((el, j) => el?.classList.toggle('is-active', j === i));
		slotTl?.kill();
		slotTl = null;
		const reduced = still || !animate;
		for (let j = 0; j < slotEls.length; j++) {
			if (j === i || (j === prev && !reduced)) continue;
			const p = slotParts(j);
			gsap.set(p.rows, { opacity: 0, y: 0 });
			gsap.set(p.ui, { opacity: 0 });
			if (p.lines.length) gsap.set(p.lines, { yPercent: LINE_OUT });
			if (p.title) gsap.set(p.title, { clearProps: '--wdth' });
		}
		const inn = slotParts(i);
		if (reduced) {
			gsap.set(inn.rows, { opacity: 1, y: 0 });
			gsap.set(inn.ui, { opacity: 1 });
			if (inn.lines.length) gsap.set(inn.lines, { yPercent: 0 });
			return;
		}
		const tl = gsap.timeline();
		if (prev >= 0 && prev !== i) {
			const out = slotParts(prev);
			tl.to(
				out.rows,
				{ opacity: 0, y: -14, duration: 0.26, ease: EASE.despawn, stagger: 0.025 },
				0
			);
			if (out.lines.length)
				tl.to(
					out.lines,
					{ yPercent: -LINE_OUT, duration: 0.3, ease: EASE.despawn, stagger: 0.03 },
					0
				);
			tl.to(out.ui, { opacity: 0, duration: 0.2, ease: 'none' }, 0);
		}
		if (inn.lines.length)
			tl.fromTo(
				inn.lines,
				{ yPercent: LINE_OUT },
				{ yPercent: 0, duration: DUR.reveal, ease: EASE.steer, stagger: 0.09 },
				0.12
			);
		if (inn.title)
			tl.fromTo(
				inn.title,
				{ '--wdth': 125 },
				{ '--wdth': 70, duration: 1.1, ease: EASE.steer, clearProps: '--wdth' },
				0.12
			);
		tl.fromTo(
			inn.rows,
			{ opacity: 0, y: 22 },
			{ opacity: 1, y: 0, duration: DUR.base, ease: EASE.steer, stagger: 0.06 },
			0.2
		);
		tl.fromTo(inn.ui, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' }, 0.3);
		slotTl = tl;
	}

	/** Slot whose entrance (sweep / roll) last ran: refreshes re-sync the layout, never replay it. */
	let arrived = -1;

	function setActive(i: number, animate: boolean) {
		const prev = active;
		if (i === prev && animate) return;
		active = i;
		if (mode === 'pin') showSlot(i, prev, animate);
		else if (claimed) stackBlend();
		if (i !== arrived) {
			arrived = i;
			arrive(i);
		}
	}

	let arrival: ReturnType<typeof setTimeout> | null = null;
	/** Slot entrances: the paint sweep (slot 2) and the roll (slot 3). */
	function arrive(i: number) {
		clearLater(arrival);
		arrival = null;
		if (i === 1) {
			// Back to primer right away: the shelves must not form already painted.
			sweepTl?.kill();
			sweepTl = null;
			if (scanState.on && !still) scanState.v = -1e4;
			rare = -1;
			setRare(-1);
			arrival = later(startSweep, mode === 'pin' ? 260 : 520);
		} else if (i === 2) arrival = later(autoRoll, mode === 'pin' ? 380 : 720);
	}

	/**
	 * The entrance roll only plays for someone who is actually looking at the die: a jump straight
	 * past the section (nav link, hash, restored scroll) must not roll it, let alone toast a nat 20.
	 */
	function autoRoll() {
		// Pinned: the section is the stage. Stacked: the die's own card must be on screen.
		const el = mode === 'pin' ? root : (slotEls[2] ?? root);
		if (active !== 2 || !el) return;
		const r = el.getBoundingClientRect();
		if (r.bottom <= innerHeight * 0.25 || r.top >= innerHeight * 0.75) return;
		roll();
	}

	function setProgress(p: number, immediate = false) {
		if (!immediate && p !== progress) settled = false;
		progress = p;
		walk = still ? 0 : ramp(p, 0, 0.3);
		rail?.style.setProperty('--p', p.toFixed(4));
		const i = p < 0.25 ? 0 : p < 0.75 ? 1 : 2;
		if (i !== active || immediate) setActive(i, !immediate);
		applyPinBlend();
	}

	// ── 01 · the peon ──────────────────────────────────────────────────────────────────────────

	const peonPos = { x: 0, y: 0, init: false };

	function despawnPeon() {
		if (peonGone) return;
		peonGone = true;
		peons += 1;
		sfx('crit');
		const pn = crowd?.named('peon');
		if (crowd && engine && pn?.visible) {
			engine.numbers.burst(pn.x, pn.y, { count: 10, radius: 66, critRate: 1 });
			crowd.ping(pn.x, pn.y, 0.7);
		}
		later(
			() => {
				peonId += 1;
				peonGone = false;
			},
			still ? 350 : 1100
		);
	}

	// ── 02 · primer → paint, the pack ──────────────────────────────────────────────────────────

	const scanState = { on: false, v: -1e4, span: 0 };
	let sweepTl: gsap.core.Timeline | null = null;

	function setRare(m: number) {
		if (!crowd) return;
		const p = rarePaint(crowd.N, m);
		if (p) crowd.setPaint(IDS[1], p.paint, p.paintAlt);
	}

	function startSweep() {
		sweepTl?.kill();
		sweepTl = null;
		rare = -1;
		setRare(-1);
		if (!crowd || still) {
			// Static build / reduced motion: the CSS wipe (or nothing), then the pull.
			painted = false;
			requestAnimationFrame(() => (painted = true));
			if (crowd) {
				scanState.on = true;
				scanState.v = 1e5;
			}
			arrival = later(() => openPack(DEFAULT_RARE), still ? 0 : 1400);
			return;
		}
		const fit = fits[1];
		if (!fit || !rects) return;
		rects.get(fit, scroll.y, box);
		scanState.span = box.w * SCAN_COS + box.h * SCAN_SIN;
		scanState.on = true;
		scanState.v = -24;
		painted = true;
		const tl = gsap.timeline();
		tl.to(scanState, { v: scanState.span + 24, duration: 1.3, ease: 'none' });
		tl.call(() => openPack(DEFAULT_RARE), [], '+=0.12');
		sweepTl = tl;
	}

	function openPack(m = -1) {
		if (m < 0) {
			const current = rare >= 0 ? Math.floor(rare / MINIS_PER_BLOCK) : -1;
			let b = Math.floor(Math.random() * BLOCKS.length);
			if (b === current)
				b = (b + 1 + Math.floor(Math.random() * (BLOCKS.length - 1))) % BLOCKS.length;
			m = b * MINIS_PER_BLOCK + Math.floor(Math.random() * MINIS_PER_BLOCK);
		}
		const b = Math.floor(m / MINIS_PER_BLOCK);
		rare = -1;
		sfx('crit');
		if (crowd && engine && rects && fits[1]) {
			rects.get(fits[1], scroll.y, box);
			const [bx, by] = blockCenterN(b);
			const x = box.x + ((bx + 1) / 2) * box.w;
			const y = box.y + ((1 - by) / 2) * box.h;
			crowd.ping(x, y, 0.28);
			engine.numbers.burst(x, y, {
				count: 10,
				radius: 22,
				glyph: 'dot',
				color: [RARE[0] / 255, RARE[1] / 255, RARE[2] / 255]
			});
			setRare(m);
		}
		later(() => (rare = m), still ? 0 : 420);
	}

	// The callout draws its leader down, then the RARE PULL tag pops (spawn) each time a mini is pulled.
	$effect(() => {
		const m = rare;
		const el = rareTag;
		if (m < 0 || !el || device.reducedMotion) return;
		const tag = el.querySelector('.rare-tag');
		const line = el.querySelector('.rare-line');
		if (line)
			gsap.fromTo(
				line,
				{ scaleY: 0 },
				{ scaleY: 1, duration: 0.36, ease: EASE.steer, overwrite: true, transformOrigin: '50% 0%' }
			);
		if (tag)
			gsap.fromTo(
				tag,
				{ scale: 0.3, opacity: 0 },
				{ scale: 1, opacity: 1, duration: 0.6, ease: EASE.spawn, delay: 0.12, overwrite: true }
			);
	});

	// ── 03 · the d20 ───────────────────────────────────────────────────────────────────────────

	const die = {
		mode: 'idle' as 'idle' | 'tumble' | 'rest',
		q: REST_Q as Quat,
		q0: REST_Q as Quat,
		qf: REST_Q as Quat,
		axis: [1, 0, 0] as Vec3,
		e: 0,
		s: 0,
		restT: 0
	};
	let rollTl: gsap.core.Timeline | null = null;
	let panicTimer: ReturnType<typeof setTimeout> | null = null;

	function roll() {
		if (die.mode === 'tumble') return;
		const n = 1 + Math.floor(Math.random() * 20);
		const qf = faceQuat(faceOf(n));
		dice.value = null;
		dice.outcome = null;
		sfx('roll');
		clearLater(panicTimer);
		if (!crowd || still) {
			die.mode = 'rest';
			die.qf = die.q = qf;
			die.restT = 10;
			land(n);
			return;
		}
		const a = (Math.random() - 0.5) * 1.2;
		die.axis = [
			Math.cos(a) * (Math.random() < 0.5 ? -1 : 1),
			Math.sin(a),
			(Math.random() - 0.5) * 0.5
		];
		die.q0 = die.q;
		die.qf = qf;
		die.e = 0;
		die.s = 0;
		die.mode = 'tumble';
		boost();
		rollTl?.kill();
		rollTl = gsap
			.timeline({
				onComplete: () => {
					die.mode = 'rest';
					die.restT = 0;
					unboost();
					land(n);
				}
			})
			.to(die, { e: 1, duration: DUR.morph, ease: EASE.spawn }, 0)
			.to(die, { s: 1, duration: DUR.morph, ease: 'power3.out' }, 0);
	}

	function land(n: number) {
		const o = outcomeOf(n);
		dice.value = n;
		dice.outcome = o;
		dice.face = n;
		dice.seq += 1;
		const bad = o === 'horror' || o === 'nat1';
		// DOM side (works in the static build too): HORROR glitches the read-outs, a natural 1
		// flashes the signal twice, a natural 20 is an achievement.
		if (bad) glitch();
		if (o === 'nat1') flashTwice();
		if (o === 'nat20') {
			sfx('crit');
			unlock('crit');
		}
		// Crowd side: only while the die is what the crowd shows (never someone else's formation).
		if (!crowd || !shows(IDS[2])) return;
		presetDirty = true;
		if (!bad) {
			crowd.preset('calm', { duration: 0.6 });
			if (o === 'nat20' && rects && fits[2]) {
				rects.get(fits[2], scroll.y, box);
				const cx = box.x + box.w / 2;
				const cy = box.y + box.h / 2;
				engine?.numbers.burst(cx, cy, {
					count: 40,
					radius: Math.max(120, box.w * 0.34),
					critRate: 1
				});
				crowd.ping(cx, cy, 1.1);
			}
			return;
		}
		// HORROR: panic for 1.8s, then the die pulls itself back together.
		crowd.preset('panic', { duration: 0.25 });
		panicTimer = later(() => {
			if (shows(IDS[2])) crowd?.preset('march', { duration: 0.8 });
		}, 1800);
	}

	function glitch() {
		if (still) return;
		const els = slotEls[2]?.querySelectorAll<HTMLElement>('[data-glitch]');
		if (!els?.length) return;
		gsap.fromTo(
			els,
			{ x: (k: number) => (k % 2 ? 7 : -7), skewX: 6 },
			{ x: 0, skewX: 0, duration: 0.6, ease: EASE.glitch, overwrite: 'auto' }
		);
	}

	function flashTwice() {
		if (still || !flash) return;
		gsap
			.timeline()
			.set(flash, { opacity: 0.42 })
			.set(flash, { opacity: 0 }, 0.08)
			.set(flash, { opacity: 0.42 }, 0.2)
			.to(flash, { opacity: 0, duration: 0.2, ease: 'none' }, 0.28);
	}

	function updateDie(time: number, dt: number) {
		if (!crowd) return;
		let q: Quat;
		if (die.mode === 'tumble') {
			q = qMul(qAxisAngle(die.axis, Math.PI * 2 * (1 - die.s)), qSlerp(die.q0, die.qf, die.e));
			die.q = q;
		} else if (die.mode === 'rest') {
			die.restT += dt;
			const k = die.restT;
			const thud = still ? 0 : 0.1 * Math.exp(-5 * k) * Math.sin(k * 17);
			const sway = still ? 0 : 0.035 * Math.sin(time * 0.8);
			q = qMul(qAxisAngle([1, 0, 0], thud + sway), qMul(qAxisAngle([0, 1, 0], sway * 0.8), die.qf));
			die.q = q;
		} else {
			if (!still) die.q = qNormalize(qMul(qAxisAngle(IDLE_AXIS, 0.3 * dt), die.q));
			q = die.q;
		}
		quatToEuler(q, euler);
		crowd.setRotation(IDS[2], euler[0], euler[1], euler[2]);
	}

	// ── frame ──────────────────────────────────────────────────────────────────────────────────

	let inView = false;

	function frame(time: number, dt: number) {
		// The claim mirrors its trigger every frame: whatever moved the page (an instant jump past
		// the pin, a hash link, a reduced-motion jump, a missed toggle), the crowd is never left
		// claimed while the pin / claim band is inactive.
		const owner = pinST ?? claimST;
		const want = !!owner?.isActive;
		if (claimed !== want) {
			if (want) claim();
			else release();
		}
		if (!inView || !crowd || !rects) return;
		const y = scroll.y;
		if (crowd.N !== entities) entities = crowd.N;

		// 01: the city walks. Scroll pushes it right; the gait (bob, rock, surge) keeps it alive.
		const ph = (time / STRIDE_S) * Math.PI * 2;
		const g = still ? 0 : 1;
		crowd.setRotation(
			IDS[0],
			0.011 * Math.sin(ph * 2) * g,
			walk * WALK_MAX + 0.016 * Math.sin(ph * 0.5 + 0.8) * g,
			0.007 * Math.sin(ph) * g
		);
		updateDie(time, dt);

		// The peon label rides the named entity (readback every 3 frames, smoothed here).
		const anchor = peonAnchor;
		if (anchor && fits[0]) {
			const pn = crowd.named('peon');
			let near = false;
			let tx = 0;
			let ty = 0;
			if (pn?.visible) {
				rects.get(fits[0], y, box);
				// Offset from the peon's slot; the walk carries it up to 15% of the box to the right.
				tx = pn.x - box.x - (peonStatic.left / 100) * box.w;
				ty = pn.y - box.y - (peonStatic.top / 100) * box.h;
				const slack = peonSeen ? 90 : 36;
				near = Math.abs(ty) < slack && tx > -slack && tx < box.w * 0.17 + slack;
			}
			// Only label the peon once it stands on the city, not while it streams in from the page.
			if (near) {
				const k = peonPos.init ? 1 - Math.exp(-dt * 22) : 1;
				peonPos.x += (tx - peonPos.x) * k;
				peonPos.y += (ty - peonPos.y) * k;
				peonPos.init = true;
				anchor.style.transform = `translate(${peonPos.x.toFixed(1)}px, ${peonPos.y.toFixed(1)}px)`;
				if (!peonSeen) peonSeen = true;
			} else if (peonSeen) {
				peonSeen = false;
				peonPos.init = false;
			}
		}

		// 02: the paint scanline follows the shelves box (pinned or scrolling).
		if (scanState.on && fits[1]) {
			rects.get(fits[1], y, box);
			const base = box.x * SCAN_COS + box.y * SCAN_SIN;
			crowd.setScan({ angleDeg: SCAN_DEG, offsetPx: base + scanState.v });
			if (scanEl) {
				const sweeping = scanState.v > -20 && scanState.v < scanState.span + 20;
				scanEl.style.opacity = sweeping ? '1' : '0';
				if (sweeping) {
					// Point on the line through the box centre, slid along the scan normal.
					const cx = box.w / 2;
					const cy = box.h / 2;
					const d = scanState.v - (cx * SCAN_COS + cy * SCAN_SIN);
					scanEl.style.transform = `translate(${(cx + SCAN_COS * d).toFixed(1)}px, ${(cy + SCAN_SIN * d).toFixed(1)}px) rotate(${SCAN_DEG + 90}deg)`;
				}
			}
		}
	}

	// ── lifecycle ──────────────────────────────────────────────────────────────────────────────

	onMount(() => {
		mounted = true;
		now = new Date();
		let alive = true;
		const cache = new RectCache();
		rects = cache;
		for (const f of fits) if (f) cache.track(f);

		const io = new IntersectionObserver(
			([e]) => {
				inView = e.isIntersecting;
			},
			{ rootMargin: '25% 0px 25% 0px' }
		);
		if (root) io.observe(root);

		// Keyboard: focusing a control of another slot scrolls to that slot (pinned layout).
		const onFocus = (j: number) => () => {
			if (mode !== 'pin' || !pinST || j === active) return;
			scrollTo(pinST.start + ((pinST.end - pinST.start) * j) / 2, { duration: 0.9 });
		};
		const focusers = slotEls.map((el, j) => {
			const fn = onFocus(j);
			el?.addEventListener('focusin', fn);
			return () => el?.removeEventListener('focusin', fn);
		});

		const revert = mm(({ reduced, desktop, coarse }) => {
			still = reduced;
			if (!root || !panel) return;
			if (desktop && !reduced && !coarse) {
				// ── pinned: synchronous, refreshPriority 40 (hero 50 above, planet 30 below) ──
				root.dataset.mode = 'pin';
				mode = 'pin';
				const splits = slotEls.map((el, j) => {
					const title = el?.querySelector<HTMLElement>('[data-title]');
					if (!title) return null;
					return SplitText.create(title, {
						type: 'lines',
						mask: 'lines',
						linesClass: 'ln',
						autoSplit: true,
						onSplit: (self) => {
							titleLines[j] = self.lines as HTMLElement[];
							gsap.set(self.lines, { yPercent: j === active ? 0 : LINE_OUT });
						}
					});
				});
				const st = ScrollTrigger.create({
					trigger: panel,
					start: 'top top',
					end: '+=200%',
					pin: true,
					refreshPriority: 40,
					snap: {
						snapTo: 1 / 2,
						duration: { min: 0.3, max: 0.8 },
						ease: EASE.arrive,
						delay: 0.08
					},
					onToggle: (self) => (self.isActive ? claim() : release()),
					onUpdate: (self) => setProgress(self.progress),
					onRefresh: (self) => setProgress(self.progress, true)
				});
				pinST = st;
				cache.pin = st;
				setProgress(st.progress, true);
				if (st.isActive) claim();
				// Scrolling (and snapping) stopped: the brief may be an obstacle again.
				const onRest = () => (settled = true);
				ScrollTrigger.addEventListener('scrollEnd', onRest);
				return () => {
					ScrollTrigger.removeEventListener('scrollEnd', onRest);
					settled = true;
					release();
					slotTl?.kill();
					slotTl = null;
					pinST = null;
					cache.pin = null;
					for (const s of splits) s?.revert();
					titleLines = [null, null, null];
					for (let j = 0; j < slotEls.length; j++) {
						const p = slotParts(j);
						gsap.set([...p.rows, ...p.ui], { clearProps: 'opacity,transform' });
						if (p.title) gsap.set(p.title, { clearProps: '--wdth' });
						slotEls[j]?.classList.remove('is-active');
					}
					rail?.style.removeProperty('--p');
				};
			}

			// ── stacked cards ──
			root.dataset.mode = 'stack';
			mode = 'stack';
			cache.pin = null;
			const triggers = slotEls.map((el, j) =>
				ScrollTrigger.create({
					trigger: el,
					start: 'top 55%',
					end: 'bottom 55%',
					onToggle: (self) => self.isActive && setActive(j, true)
				})
			);
			// Cards 2–3 own the crowd; card 1 is the approach anchor's.
			const claimer = ScrollTrigger.create({
				trigger: slotEls[1],
				start: 'top 55%',
				endTrigger: slotEls[2],
				end: 'bottom 55%',
				onToggle: (self) => (self.isActive ? claim() : release())
			});
			claimST = claimer;
			if (claimer.isActive) claim();
			// The city walks as card 1 scrolls through.
			const walker = ScrollTrigger.create({
				trigger: slotEls[0],
				start: 'top 70%',
				end: 'bottom 30%',
				onUpdate: (self) => (walk = reduced ? 0 : self.progress)
			});
			if (!reduced) {
				for (const el of slotEls) {
					if (!el) continue;
					gsap.from(el.querySelectorAll('[data-row], [data-title]'), {
						opacity: 0,
						y: 24,
						duration: DUR.reveal,
						ease: EASE.steer,
						stagger: 0.06,
						scrollTrigger: { trigger: el, start: 'top 72%', once: true }
					});
				}
			}
			return () => {
				claimST = null;
				release();
				for (const s of triggers) s.kill();
				claimer.kill();
				walker.kill();
				walk = 0;
			};
		});

		const offFrame = onFrame(frame, PRIORITY.ui);

		void whenEngine().then((e) => {
			if (!alive || !e) return;
			engine = e;
			crowd = e.crowd as Crowd;
			entities = crowd.N;
			hasEngine = true;
			const region = (el: HTMLElement) => ({ el, space: 'page' as const });
			if (fits[0]) void crowd.define(IDS[0], LUDO_CITY, region(fits[0]), { preset: 'march' });
			if (fits[1]) void crowd.define(IDS[1], LUDO_SHELVES, region(fits[1]), { preset: 'march' });
			if (fits[2]) void crowd.define(IDS[2], LUDO_D20, region(fits[2]), { preset: 'march' });
			if (claimed) {
				claimed = false;
				claim();
			}
			// Arrived in a slot before the engine: replay its entrance now that there is a crowd.
			if (active === 1 || active === 2) arrive(active);
			// Dev-only inspection handle for visual checks (stripped from production builds).
			if (import.meta.env.DEV)
				(window as unknown as { __ludo?: unknown }).__ludo = {
					crowd,
					state: () => {
						const b = crowd?.blendState;
						const pn = crowd?.named('peon');
						return {
							mode,
							active,
							claimed,
							progress: +progress.toFixed(3),
							owner: crowd?.owner ?? null,
							blend: b ? `${b.from} → ${b.to} @ ${b.mix.toFixed(2)}` : null,
							peon: pn ? `${Math.round(pn.x)},${Math.round(pn.y)} ${pn.visible}` : null,
							peonSeen,
							fits: fits.map((f) => {
								const r = f?.getBoundingClientRect();
								return r
									? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`
									: null;
							}),
							scan: `${scanState.on} ${Math.round(scanState.v)}`,
							die: die.mode,
							dice: `${dice.value} ${dice.outcome}`,
							rare
						};
					}
				};
		});

		return () => {
			alive = false;
			offFrame();
			revert();
			release();
			io.disconnect();
			for (const off of focusers) off();
			for (const id of timers) clearTimeout(id);
			timers.clear();
			sweepTl?.kill();
			rollTl?.kill();
			stackTween?.kill();
			if (crowd) {
				unboost();
				crowd.setScan(null);
			}
			if (import.meta.env.DEV) delete (window as unknown as { __ludo?: unknown }).__ludo;
			cache.dispose();
			rects = null;
			crowd = null;
			engine = null;
		};
	});
</script>

<section
	id="shipped"
	class="ludo section"
	data-section="shipped"
	data-theme="viewport"
	aria-labelledby="shipped-title"
	bind:this={root}
	use:themeSection={'viewport'}
	use:hudLine={{ section: '03', label: t().shipped.hud, line: hudExtra }}
>
	<header class="intro wrap">
		<p class="index hud-text graphite">{t().shipped.index}</p>
		<!-- Re-created per language: the line reveal (SplitText) rewrites this DOM, so in-place
		     text updates would never reach it after an EN ⇄ FR switch. -->
		{#key i18n.lang}
			<h2
				id="shipped-title"
				class="headline"
				use:reveal={{ mode: 'lines', widthMarch: true }}
				use:collideWhen={{ pad: 10 }}
			>
				{headline.pre}<em class="serif">{headline.em}</em>{headline.post}
			</h2>
		{/key}
		<p class="studio hud-text">
			<a href={studio.url} target="_blank" rel="noopener external"
				>{t().shipped.studio}<span aria-hidden="true"> ↗</span><span class="visually-hidden">
					({loc(LL.studioNewTab)})</span
				></a
			>
		</p>
	</header>

	{#if mounted && fits[0]}
		<div
			class="anchor"
			aria-hidden="true"
			use:formation={{ id: IDS[0], source: LUDO_CITY, preset: 'march', region: fits[0] }}
		></div>
	{/if}

	<div class="panel" bind:this={panel}>
		<div class="slots wrap">
			<div class="rail micro" bind:this={rail} aria-hidden="true">
				<span class="rail-count"
					><Odometer value={active + 1} digits={2} /><span class="graphite">/03</span></span
				>
				<span class="rail-bar">
					{#each games as g, j (g.slug)}
						<span class="seg"></span>
					{/each}
					<span class="rail-fill"></span>
				</span>
			</div>

			{#each games as game, i (game.slug)}
				{@const kind = KINDS[i]}
				<article class="slot slot-{kind}" bind:this={slotEls[i]} aria-labelledby="ludo-title-{i}">
					<div class="stage">
						<div class="bar top micro" data-ui aria-hidden="true">
							<span class="bar-id"
								>{loc(LL.viewport)}
								{String(i + 1).padStart(2, '0')} ·
								<span class="ink">{IDS[i].toUpperCase()}</span></span
							>
							<span class="bar-counts" data-glitch>{counts[i]}</span>
						</div>

						<div class="view" data-ui>
							<div class="fit fit-{kind}" bind:this={fits[i]}>
								<LudogramFallback
									{kind}
									rare={i === 1 ? rare : -1}
									painted={i === 1 && painted}
									face={dice.face}
									peonGone={i === 0 && peonGone}
								/>

								{#if kind === 'city'}
									<div class="ground" style:top="{groundTop}%" aria-hidden="true">
										<span></span>
									</div>
									<div
										class="peon-anchor"
										class:live={hasEngine}
										class:seen={peonSeen}
										style:left="{peonStatic.left}%"
										style:top="{peonStatic.top}%"
										bind:this={peonAnchor}
									>
										<PeonLabel id={peonId} gone={peonGone} ondespawn={despawnPeon} />
									</div>
								{:else if kind === 'shelves'}
									<div class="scanwrap" aria-hidden="true">
										<span class="scanline" bind:this={scanEl}
											><span class="scan-tag micro">{loc(LL.paint)}</span></span
										>
									</div>
									{#if rarePos}
										<div
											class="rare-call"
											style:left="{rarePos.left}%"
											style:height="{rarePos.depth}%"
											bind:this={rareTag}
										>
											<span class="rare-line" aria-hidden="true"></span>
											<p class="rare-tag micro">{t().shipped.pack.rare}</p>
										</div>
									{/if}
								{:else}
									<button
										class="die-hit"
										type="button"
										tabindex="-1"
										aria-label={t().shipped.dice.aria}
										onclick={roll}
									></button>
									<div class="die-result">
										<DiceResult value={dice.value} outcome={dice.outcome} seq={dice.seq} />
									</div>
								{/if}
							</div>

							{#if kind === 'd20'}
								<GhostCursors active={active === 2} {still} />
							{/if}

							<span class="corner tl" aria-hidden="true"></span>
							<span class="corner tr" aria-hidden="true"></span>
							<span class="corner bl" aria-hidden="true"></span>
							<span class="corner br" aria-hidden="true"></span>
						</div>

						<div class="bar bottom micro" data-ui>
							<span class="bar-action">
								{#if kind === 'shelves'}
									<button
										class="act"
										type="button"
										use:interact={{ verb: t().cursor.verbs.openPack }}
										onclick={() => openPack()}
										aria-label={t().shipped.pack.aria}
									>
										<span class="key"><Keycap key="E" size="micro" active /></span>
										<span>{t().cursor.verbs.openPack}</span>
									</button>
								{:else if kind === 'd20'}
									<button
										class="act"
										type="button"
										use:interact={{ verb: t().cursor.verbs.roll }}
										onclick={roll}
										aria-label={t().shipped.dice.aria}
									>
										<span class="key"><Keycap key="E" size="micro" active /></span>
										<span class="verb">{t().cursor.verbs.roll}</span>
										<span class="tap">{t().shipped.dice.tapHint}</span>
									</button>
								{/if}
							</span>
							<span class="bar-hud" data-glitch>{loc(game.hud)}</span>
						</div>

						<p class="visually-hidden gl-only">{t().shipped.canvas[game.slug]}</p>
					</div>

					<div class="brief-col">
						<MissionBrief
							{game}
							index={i}
							total={games.length}
							release={releases[i]}
							titleId="ludo-title-{i}"
							specSheets={SPEC_SHEETS}
							colliding={mode === 'stack' || (settled && active === i)}
						/>
					</div>
				</article>
			{/each}
		</div>
		<div class="flash" bind:this={flash} aria-hidden="true"></div>
	</div>

	{#if mounted && fits[2]}
		<div
			class="anchor exit"
			aria-hidden="true"
			use:formation={{
				id: IDS[2],
				source: LUDO_D20,
				from: IDS[2],
				preset: 'march',
				region: fits[2],
				start: 'top bottom',
				end: 'top 90%'
			}}
		></div>
	{/if}
</section>

<style>
	.ludo {
		position: relative;
		padding-bottom: clamp(48px, 8vh, 96px);
	}

	/* ── intro ───────────────────────────────────────────────────────────────────────────── */
	.intro {
		position: relative;
		z-index: var(--z-content);
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		column-gap: var(--gutter);
		row-gap: var(--s-3);
		padding-bottom: clamp(48px, 9vh, 120px);
	}

	.index,
	.headline,
	.studio {
		grid-column: 1 / -1;
	}

	.headline {
		--wdth: var(--wdth-h1);
		font-size: var(--fs-h1);
		line-height: var(--lh-h1);
		letter-spacing: var(--tr-h1);
		font-weight: var(--fw-h1);
		max-width: 18ch;
	}

	.studio a {
		color: var(--graphite);
		transition: color var(--t-micro) steps(2);
	}

	.studio a:hover {
		color: var(--ink);
	}

	@media (min-width: 1024px) {
		.headline {
			grid-column: 1 / 11;
		}
	}

	/* ── anchors (zero-size scroll sentinels for the crowd hand-over) ────────────────────────── */
	.anchor {
		height: 0;
		pointer-events: none;
	}

	.anchor.exit {
		position: absolute;
		left: 0;
		bottom: 50vh;
		width: 1px;
	}

	/* ── panel & slots (default = stacked cards; the pinned layout is opted into by JS) ──────── */
	.panel {
		position: relative;
	}

	.rail {
		display: none;
	}

	/* Stacked card: stage on top (clear of the mobile HUD), then the brief; it may outgrow 100svh. */
	.slot {
		position: relative;
		z-index: var(--z-content);
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		column-gap: var(--gutter);
		align-content: start;
		min-height: 100vh;
		min-height: 100svh;
		padding-block: 64px 48px;
	}

	.brief-col {
		grid-column: 1 / -1;
		align-self: center;
		min-width: 0;
	}

	.stage {
		position: relative;
		grid-column: 1 / -1;
		order: -1;
		display: flex;
		flex-direction: column;
		height: clamp(300px, 48svh, 520px);
		margin-bottom: var(--s-4);
	}

	@media (min-width: 1024px) {
		/* Side-by-side card (reduced motion / coarse pointer on a wide screen): resting with its top
		   at the top of the viewport, nothing sits under the HUD corners. */
		.slot {
			row-gap: 0;
			align-content: center;
			padding-block: clamp(80px, 10svh, 112px) clamp(124px, 15.5svh, 164px);
		}

		.brief-col {
			grid-column: 1 / 6;
			grid-row: 1;
		}

		.stage {
			grid-column: 6 / 13;
			grid-row: 1;
			order: 0;
			height: min(72svh, 740px);
			margin: 0;
		}
	}

	/* Pinned: one viewport-tall panel; the three slots share one cell and swap. */
	:global(.ludo[data-mode='pin']) .panel {
		height: 100vh;
		height: 100svh;
	}

	:global(.ludo[data-mode='pin']) .slots {
		position: relative;
		height: 100%;
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		grid-template-rows: minmax(0, 1fr);
		column-gap: var(--gutter);
		/* Clear the HUD: wordmark / nav on top, keycaps + context and the stats stack below. */
		padding-top: clamp(72px, 9.5svh, 104px);
		padding-bottom: clamp(124px, 15.5svh, 164px);
	}

	:global(.ludo[data-mode='pin']) .slot {
		grid-column: 1 / -1;
		grid-row: 1;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		grid-template-rows: minmax(0, 1fr);
		align-content: stretch;
		height: 100%;
		min-height: 0;
		padding: 0;
		pointer-events: none;
	}

	:global(.ludo[data-mode='pin']) .slot:global(.is-active) {
		pointer-events: auto;
		z-index: calc(var(--z-content) + 1);
	}

	:global(.ludo[data-mode='pin']) .stage {
		height: 100%;
	}

	:global(.ludo[data-mode='pin']) .rail {
		grid-column: 6 / 13;
		grid-row: 1;
		align-self: start;
		position: relative;
		z-index: calc(var(--z-content) + 2);
		display: flex;
		align-items: center;
		gap: 14px;
		height: 28px;
		pointer-events: none;
	}

	.rail-count {
		display: inline-flex;
		align-items: baseline;
		color: var(--ink);
	}

	.rail-bar {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, 34px);
		gap: 5px;
		height: 3px;
	}

	.seg {
		background: var(--hairline);
	}

	.rail-fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: calc(3 * 34px + 2 * 5px);
		background: var(--ink);
		transform-origin: 0 50%;
		transform: scaleX(calc(0.06 + var(--p, 0) * 0.94));
		mask-image: linear-gradient(
			90deg,
			#000 0 34px,
			transparent 34px 39px,
			#000 39px 73px,
			transparent 73px 78px,
			#000 78px
		);
	}

	/* ── stage: an in-engine viewport ────────────────────────────────────────────────────────── */
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		min-height: 28px;
		color: var(--graphite);
	}

	.bar span {
		white-space: nowrap;
	}

	.bar .ink {
		color: var(--ink);
	}

	:global(.ludo[data-mode='pin']) .bar-id {
		visibility: hidden;
	}

	.bar-counts {
		margin-left: auto;
	}

	.bar.bottom {
		min-height: 40px;
		align-items: flex-end;
	}

	.bar-hud {
		margin-left: auto;
		text-align: right;
	}

	.view {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		container-type: size;
	}

	.corner {
		position: absolute;
		width: 12px;
		height: 12px;
		border: 0 solid var(--graphite);
		pointer-events: none;
	}

	.corner.tl {
		left: 0;
		top: 0;
		border-width: 1.5px 0 0 1.5px;
	}

	.corner.tr {
		right: 0;
		top: 0;
		border-width: 1.5px 1.5px 0 0;
	}

	.corner.bl {
		left: 0;
		bottom: 0;
		border-width: 0 0 1.5px 1.5px;
	}

	.corner.br {
		right: 0;
		bottom: 0;
		border-width: 0 1.5px 1.5px 0;
	}

	.fit {
		position: absolute;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
	}

	.fit-city {
		width: min(100cqw, calc(100cqh * 10 / 7));
		aspect-ratio: 10 / 7;
	}

	.fit-shelves {
		width: min(90cqw, 90cqh);
		aspect-ratio: 1;
	}

	.fit-d20 {
		width: min(84cqw, 84cqh);
		aspect-ratio: 1;
	}

	/* 01 · the treadmill ground under the stilts: dashes slide left while the city walks right. */
	.ground {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		overflow: hidden;
		pointer-events: none;
	}

	.ground span {
		position: absolute;
		inset: 0 -40px 0 0;
		background: repeating-linear-gradient(90deg, var(--graphite) 0 10px, transparent 10px 20px);
		animation: ground 0.9s linear infinite;
	}

	@keyframes ground {
		to {
			transform: translateX(-20px);
		}
	}

	.peon-anchor {
		position: absolute;
		width: 0;
		height: 0;
		z-index: 2;
	}

	/* With the engine, the label waits for the first readback of the peon. */
	.peon-anchor.live:not(.seen) {
		opacity: 0;
		visibility: hidden;
	}

	/* 02 · scanline + rare pull */
	.scanwrap {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.scanline {
		position: absolute;
		left: 0;
		top: 0;
		width: 160%;
		height: 1px;
		margin-left: -80%;
		background: linear-gradient(90deg, transparent, var(--ink) 18% 82%, transparent);
		opacity: 0;
		transform-origin: 50% 50%;
	}

	.scan-tag {
		position: absolute;
		left: 50%;
		top: -18px;
		color: var(--ink);
		white-space: nowrap;
	}

	/* Callout: a dashed leader from above the unit down to the pulled mini, tag on top. */
	.rare-call {
		position: absolute;
		top: 0;
		z-index: 2;
		width: 1px;
		margin-left: -0.5px;
		pointer-events: none;
	}

	.rare-line {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(to bottom, var(--signal) 0 3px, transparent 3px 6px);
	}

	.rare-tag {
		position: absolute;
		left: 50%;
		bottom: 100%;
		translate: -50% -4px;
		max-width: none;
		padding: 5px 8px 4px;
		color: var(--paper);
		background: var(--signal);
		font-weight: 600;
		white-space: nowrap;
	}

	/* 03 · die */
	.die-hit {
		position: absolute;
		inset: 8%;
		border-radius: 50%;
		cursor: pointer;
	}

	/* Above the ghost cursors: the number on the face is the point of the roll. */
	.die-result {
		position: absolute;
		inset: 0;
		z-index: 3;
		pointer-events: none;
	}

	.act {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 4px 12px 4px 4px;
		color: var(--ink);
		border: 1px solid var(--graphite);
		text-transform: uppercase;
		letter-spacing: var(--tr-micro);
		transition:
			border-color var(--t-micro) steps(2),
			background-color var(--t-micro) steps(2);
	}

	.act:hover {
		border-color: var(--ink);
	}

	.act:active {
		transform: translateY(1px);
	}

	.tap {
		display: none;
	}

	@media (pointer: coarse) {
		.act .key {
			display: none;
		}

		.act {
			padding-left: 12px;
		}

		.slot-d20 .act .verb {
			display: none;
		}

		.slot-d20 .act .tap {
			display: inline;
		}
	}

	.flash {
		position: absolute;
		inset: 0;
		z-index: calc(var(--z-content) + 3);
		background: var(--signal);
		opacity: 0;
		pointer-events: none;
	}

	@media (max-width: 1023px) {
		.bar.top {
			min-height: 22px;
		}

		.bar-hud {
			white-space: normal !important;
			max-width: 26ch;
		}
	}

	@media (max-width: 639px) {
		.bar-id {
			display: none;
		}

		.bar-counts {
			margin-left: 0;
		}
	}
</style>
