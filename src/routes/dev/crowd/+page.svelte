<script lang="ts">
	// /dev/crowd: the engine bench (§8 risk 1). Every CrowdParams uniform on lil-gui, presets,
	// a formation switcher over every baker kind, ping / wave / select / scan / view modes, and a
	// live owner + A/B readout. Dev only: production builds 404 here and tree-shake all of it.
	import { onMount } from 'svelte';
	import { whenEngine } from '#lib/gl/handle';
	import { collider } from '#lib/core/actions';
	import { gsap } from '#lib/core/motion';
	import { stats } from '#lib/core/stats.svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import type { Crowd } from '#lib/gl/crowd/Crowd';
	import type { FormationSource, Glyph, Preset, ViewMode } from '#lib/gl/types';
	import { circle, d20, house, stream } from './bench';

	const DEV = import.meta.env.DEV;
	const OWNER = 'dev';

	let heroEl = $state<HTMLElement>();
	let stageEl = $state<HTMLElement>();
	let labelEl = $state<HTMLElement>();
	let readout = $state('');
	let noEngine = $state(false);

	onMount(() => {
		if (!DEV) return;
		let alive = true;
		const cleanups: (() => void)[] = [];

		(async () => {
			const engine = await whenEngine();
			if (!alive) return;
			if (!engine) {
				noEngine = true;
				return;
			}
			const crowd = engine.crowd as Crowd;
			(window as unknown as { __hyv: unknown }).__hyv = { engine, crowd };

			const hero = { el: heroEl!, space: 'page' as const };
			const stage = { el: stageEl!, space: 'page' as const };
			const defs: Record<string, [FormationSource, { el: HTMLElement; space: 'page' | 'fixed' }, { preset?: Preset; glyph?: Glyph }?]> = {
				'hero-wide': [{ kind: 'glyphs', key: 'HYVERNO_W125' }, hero],
				'hero-tall': [{ kind: 'glyphs', key: 'HYVERNO_W62' }, hero],
				'dev-1445': [{ kind: 'glyphs', key: '1445' }, { el: document.body, space: 'fixed' }],
				'dev-circle': [circle, stage],
				'dev-d20': [d20, stage, { preset: 'march' }],
				'dev-stream': [stream, stage, { glyph: 'dot' }],
				'dev-house': [house, stage]
			};
			for (const [id, [src, region, o]] of Object.entries(defs)) void crowd.define(id, src, region, o);

			const { default: GUI } = await import('lil-gui');
			if (!alive) return;
			const gui = new GUI({ title: 'HEADCOUNT · /dev/crowd', width: 300 });
			cleanups.push(() => gui.destroy());

			// ── formations ────────────────────────────────────────────────────────────────────
			const ids = ['hero-wide', 'hero-tall', 'dev-circle', 'dev-d20', 'dev-stream', 'dev-house', 'dev-1445', 'ambient', 'fill', 'spawn'];
			const ctl = { formation: 'hero-wide', duration: 1.4, mix: 1, claimed: true, rotate: true };
			let current = crowd.current;
			let tween: gsap.core.Tween | null = null;
			const go = (to: string) => {
				tween?.kill();
				const from = current === to ? crowd.blendState.from : current;
				current = to;
				const m = { v: 0 };
				tween = gsap.to(m, {
					v: 1,
					duration: ctl.duration,
					ease: 'arrive',
					onUpdate: () => {
						ctl.mix = m.v;
						crowd.blend(from, to, m.v, { owner: OWNER });
					}
				});
			};
			crowd.claim(OWNER);
			cleanups.push(() => crowd.release(OWNER));
			const fF = gui.addFolder('Formation');
			fF.add(ctl, 'formation', ids).onChange(go);
			fF.add(ctl, 'duration', 0.2, 4, 0.1);
			fF.add(ctl, 'mix', 0, 1, 0.001)
				.listen()
				.onChange((v: number) => {
					tween?.kill();
					const s = crowd.blendState;
					crowd.blend(s.from, s.to, v, { owner: OWNER });
				});
			fF.add(ctl, 'claimed').onChange((v: boolean) => (v ? crowd.claim(OWNER) : crowd.release(OWNER)));
			fF.add(ctl, 'rotate').name('rotate d20');
			go('hero-wide');

			// ── params ────────────────────────────────────────────────────────────────────────
			const p = crowd.params;
			const fP = gui.addFolder('CrowdParams');
			fP.add(p, 'seek', 0, 20, 0.1).listen();
			fP.add(p, 'maxSpeed', 0.05, 3, 0.01).listen();
			fP.add(p, 'maxForce', 0.1, 20, 0.1).listen();
			fP.add(p, 'arrive', 0.01, 1, 0.01).listen();
			fP.add(p, 'sep', 0, 4, 0.01).listen();
			fP.add(p, 'wander', 0, 3, 0.01).listen();
			fP.add(p, 'noiseScale', 0.1, 8, 0.05).listen();
			fP.add(p, 'mouseR', 0, 1, 0.01).listen();
			fP.add(p, 'mouseF', 0, 40, 0.1).listen();
			fP.add(p, 'scrollCarry', 0, 1, 0.01).listen();
			fP.add(p, 'panic', 0, 1, 0.01).listen();
			fP.add(p, 'paintMix', 0, 1, 0.01).listen();
			fP.add(p, 'size', 2, 20, 0.1).listen();
			fP.add(p, 'mixSpread', 0, 0.95, 0.01).listen();
			fP.add(p, 'glyph', ['dot', 'dart', 'xstitch']).listen();
			fP.add(p, 'glyphAlt', ['dot', 'dart', 'xstitch']).listen();

			const U = crowd.U;
			const fI = gui.addFolder('Internals').close();
			fI.add(U.uObstacleF, 'value', 0, 30, 0.1).name('obstacle force');
			fI.add(U.uPingF, 'value', 0, 80, 0.5).name('ping force');
			fI.add(U.uAttractRange, 'value', 0, 2, 0.01).name('attract range');

			const fPre = gui.addFolder('Presets');
			for (const name of ['calm', 'march', 'panic', 'still'] as Preset[]) fPre.add({ [name]: () => crowd.preset(name) }, name);

			// ── actions ───────────────────────────────────────────────────────────────────────
			const scan = { angle: 0, offset: -1 };
			const actions = {
				ping: () => crowd.ping(innerWidth / 2, innerHeight / 2),
				burst: () => engine.numbers.burst(innerWidth / 2, innerHeight / 2, { count: 32, radius: 60, critRate: 0.1 }),
				wave: () => crowd.sendWave(),
				selectAll: async () => {
					const n = await crowd.select(new DOMRectReadOnly(0, 0, innerWidth, innerHeight));
					stats.selected = n;
				},
				deselect: () => {
					void crowd.select(null);
					stats.selected = 0;
				},
				command: () => crowd.command(innerWidth * 0.25, innerHeight * 0.5),
				alphaOut: () => crowd.setAlpha(0, { duration: 0.4 }),
				alphaIn: () => crowd.setAlpha(1, { duration: 0.4 }),
				scanSweep: () => {
					crowd.set({ glyphAlt: 'xstitch' });
					gsap.fromTo(scan, { offset: 0 }, { offset: innerWidth * 1.2, duration: 3, ease: 'none', onUpdate: () => crowd.setScan({ angleDeg: scan.angle, offsetPx: scan.offset }), onComplete: () => crowd.setScan(null) });
				},
				attractStage: () => crowd.attract(0, stageEl!.getBoundingClientRect(), { mode: 'perimeter' }),
				attractOff: () => crowd.attract(0, null)
			};
			const fA = gui.addFolder('Actions');
			for (const k of Object.keys(actions) as (keyof typeof actions)[]) fA.add(actions, k);
			fA.add(scan, 'angle', -90, 90, 1).name('scan angle');

			const modes = { mode: engine.viewMode as ViewMode };
			gui.add(modes, 'mode', { '[1] LIT': 1, '[2] DENSITY': 2, '[3] DEBUG': 3, '[4] IDS': 4 })
				.name('view mode')
				.listen()
				.onChange((m: ViewMode) => engine.setViewMode(Number(m) as ViewMode));

			// ── live readout ──────────────────────────────────────────────────────────────────
			let spin = 0;
			cleanups.push(
				onFrame((_, dt) => {
					modes.mode = engine.viewMode;
					if (ctl.rotate) {
						spin += dt;
						crowd.setRotation('dev-d20', spin * 0.4, spin * 0.7, 0);
					}
					const peon = crowd.named('peon');
					if (labelEl) {
						labelEl.style.opacity = peon?.visible ? '1' : '0';
						if (peon) labelEl.style.transform = `translate(${peon.x + 10}px, ${peon.y - 22}px)`;
					}
					const s = crowd.blendState;
					readout = `OWNER ${crowd.owner ?? '—'} · A ${s.from} → B ${s.to} · MIX ${s.mix.toFixed(2)} · ${stats.entities} ENT · ${stats.fps} FPS · SIM ${stats.simMs}MS · RENDER ${stats.renderMs}MS · ${stats.drawCalls} CALLS${stats.selected ? ` · ${stats.selected} SELECTED` : ''}`;
				}, PRIORITY.ui)
			);
			cleanups.push(() => tween?.kill());
		})();

		return () => {
			alive = false;
			for (const c of cleanups) c();
			delete (window as unknown as { __hyv?: unknown }).__hyv;
		};
	});

</script>

<svelte:head>
	<title>/dev/crowd</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if DEV}
	<section class="bench">
		<p class="hud-text graphite top">/DEV/CROWD · ENGINE BENCH · DRAG TO SELECT · CLICK TO PING · [1–4] VIEW MODES</p>
		<div class="hero" bind:this={heroEl} aria-hidden="true"></div>
		<p class="copy" use:collider={{ pad: 8 }}>
			A paragraph registered as a collider. The crowd should flow around this block like water around a stone, and the
			formation entities whose targets sit inside it keep their shape.
		</p>
		<div class="stage" bind:this={stageEl} aria-hidden="true"></div>
		<p class="hud-text graphite readout">{noEngine ? 'NO ENGINE (STATIC BUILD)' : readout}</p>
		<div class="tall"></div>
		<p class="copy lower" use:collider={{ pad: 8 }}>Lower collider, to check page-space formations and scroll carry.</p>
	</section>
	<span class="peon mono micro" bind:this={labelEl}>PEON #4471 (DISPENSABLE)</span>
{/if}

<style>
	.bench {
		position: relative;
		min-height: 260vh;
		padding: 64px var(--margin, 48px);
	}

	.top {
		position: relative;
		z-index: var(--z-content);
	}

	/* Same proportions as the hero twin: wide ink box, 10 of 12 columns. */
	.hero {
		position: absolute;
		left: 8vw;
		top: 30vh;
		width: 62vw;
		aspect-ratio: 6592 / 712;
		outline: 1px dashed var(--hairline);
	}

	.stage {
		position: absolute;
		right: 4vw;
		top: 52vh;
		width: 30vw;
		aspect-ratio: 1;
		outline: 1px dashed var(--hairline);
	}

	.copy {
		position: absolute;
		left: 10vw;
		top: 62vh;
		max-width: 34ch;
		z-index: var(--z-content);
	}

	.copy.lower {
		top: 160vh;
	}

	.readout {
		position: fixed;
		left: 24px;
		bottom: 24px;
		z-index: var(--z-hud);
		max-width: calc(100vw - 360px);
	}

	.peon {
		position: fixed;
		left: 0;
		top: 0;
		z-index: var(--z-hud);
		color: var(--signal-text);
		pointer-events: none;
		opacity: 0;
		white-space: nowrap;
	}

	@media (max-width: 767px) {
		.hero {
			left: 4vw;
			width: 92vw;
			aspect-ratio: 3437 / 712;
		}
		.stage {
			left: 10vw;
			right: auto;
			width: 80vw;
			top: 70vh;
		}
		.copy {
			top: 48vh;
		}
		.readout {
			max-width: calc(100vw - 48px);
		}
	}
</style>
