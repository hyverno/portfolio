<!--
	The netcode nod (Invokyr): three AI ghost cursors, P2–P4, wander over the stage labelled
	`P3 · RTT 48MS`. Each one is drawn the way a client sees a remote player: its "server"
	position only updates once per round trip and the cursor interpolates toward it, so the laggy
	P4 visibly steps while P2 glides. RTT values are simulated and change every 2s.
	Decorative (aria-hidden); still under reduced motion.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { PRIORITY, onFrame } from '#lib/core/ticker';
	import { t } from '#lib/i18n/index.svelte';

	interface Props {
		/** Only animates while its slot is on screen. */
		active: boolean;
		/** Reduced motion: parked, no wander. */
		still: boolean;
	}

	let { active, still }: Props = $props();

	interface Ghost {
		name: string;
		/** Simulated round trip (ms) and its jitter. */
		base: number;
		spread: number;
		/** Lissajous wander (cycles / s, phases, amplitudes as a share of the box). */
		fx: number;
		fy: number;
		px: number;
		py: number;
		ax: number;
		ay: number;
	}

	// Amplitudes keep cursor + label (≈ 120px to the right) inside the stage.
	const GHOSTS: Ghost[] = [
		{ name: 'P2', base: 24, spread: 10, fx: 0.061, fy: 0.083, px: 0.4, py: 1.9, ax: 0.3, ay: 0.34 },
		{
			name: 'P3',
			base: 48,
			spread: 16,
			fx: 0.047,
			fy: 0.071,
			px: 2.6,
			py: 0.2,
			ax: 0.32,
			ay: 0.36
		},
		{
			name: 'P4',
			base: 116,
			spread: 44,
			fx: 0.077,
			fy: 0.053,
			px: 4.4,
			py: 3.1,
			ax: 0.28,
			ay: 0.38
		}
	];
	const CX = 0.42;
	const PARK: [number, number][] = [
		[0.14, 0.22],
		[0.7, 0.3],
		[0.64, 0.8]
	];

	let rtt = $state(GHOSTS.map((g) => g.base));
	let box: HTMLDivElement;
	const els: HTMLDivElement[] = $state([]);

	onMount(() => {
		let w = box.clientWidth;
		let h = box.clientHeight;
		const server = GHOSTS.map((_, i) => ({ x: PARK[i][0], y: PARK[i][1], at: -1 }));
		const shown = GHOSTS.map((_, i) => ({ x: PARK[i][0], y: PARK[i][1] }));
		let clock = 0;
		let sinceRtt = 0;

		const wander = (g: Ghost, i: number, time: number) => ({
			x: CX + g.ax * Math.sin(time * g.fx * Math.PI * 2 + g.px) + 0.04 * Math.sin(time * 0.9 + i),
			y:
				0.5 +
				g.ay * Math.sin(time * g.fy * Math.PI * 2 + g.py) +
				0.04 * Math.cos(time * 0.7 + i * 2)
		});

		// Cursor + label (≈ 124 × 34px) always stay inside the box, even on a phone.
		const draw = () => {
			for (let i = 0; i < GHOSTS.length; i++) {
				const el = els[i];
				if (!el) continue;
				const x = Math.min(Math.max(shown[i].x * w, 4), Math.max(4, w - 128));
				const y = Math.min(Math.max(shown[i].y * h, 4), Math.max(4, h - 38));
				el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
			}
		};

		const ro = new ResizeObserver(() => {
			w = box.clientWidth;
			h = box.clientHeight;
			draw();
		});
		ro.observe(box);
		draw();

		const off = onFrame((_, dt) => {
			if (!active) return;
			clock += dt;
			sinceRtt += dt;
			if (sinceRtt >= 2) {
				sinceRtt = 0;
				rtt = GHOSTS.map((g) => Math.max(9, Math.round(g.base + (Math.random() - 0.5) * g.spread)));
			}
			if (still) return;
			for (let i = 0; i < GHOSTS.length; i++) {
				const s = server[i];
				// A new snapshot arrives once per round trip.
				if (s.at < 0 || clock - s.at >= rtt[i] / 1000) {
					const p = wander(GHOSTS[i], i, clock);
					s.x = p.x;
					s.y = p.y;
					s.at = clock;
				}
				// Client-side interpolation toward the last snapshot.
				const k = 1 - Math.exp(-dt * 14);
				shown[i].x += (s.x - shown[i].x) * k;
				shown[i].y += (s.y - shown[i].y) * k;
			}
			draw();
		}, PRIORITY.ui);

		return () => {
			off();
			ro.disconnect();
		};
	});
</script>

<div class="ghosts" bind:this={box} aria-hidden="true">
	{#each GHOSTS as g, i (g.name)}
		<div class="ghost" bind:this={els[i]}>
			<svg viewBox="0 0 12 17" width="12" height="17">
				<path d="M1 1 L1 13.5 L4.3 10.4 L6.6 15.6 L8.7 14.7 L6.5 9.6 L11 9.6 Z" />
			</svg>
			<span class="tag micro">{t().shipped.dice.ghost(g.name, String(rtt[i]))}</span>
		</div>
	{/each}
</div>

<style>
	.ghosts {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.ghost {
		position: absolute;
		left: 0;
		top: 0;
		will-change: transform;
	}

	svg {
		display: block;
		overflow: visible;
	}

	path {
		fill: var(--paper);
		stroke: var(--graphite);
		stroke-width: 1.1;
		stroke-linejoin: round;
	}

	.tag {
		position: absolute;
		left: 13px;
		top: 15px;
		padding: 2px 5px 1px;
		color: var(--graphite);
		background: var(--paper);
		border: 1px solid var(--hairline);
		white-space: nowrap;
	}
</style>
