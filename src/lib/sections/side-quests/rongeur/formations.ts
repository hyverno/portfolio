// Formation `rongeur-stream` (DESIGN.md §5 04c): entities become round apricot "deals" flowing
// along five curved paths, from the merchant labels into Pépite's cheeks. The paths are built in
// the region's own pixel space from measured anchor points (viewBox = region size), so a stream
// leaves exactly from its label and lands exactly in a cheek at any layout. Paths sources compare
// by value in the crowd, so re-measuring an unchanged layout costs nothing.
import type { FormationSource } from '#lib/gl/types';

export const STREAM_ID = 'rongeur-stream';
export const APRICOT = '#F2894B';

export interface Pt {
	x: number;
	y: number;
}

export interface StreamLayout {
	/** Region size, px. */
	w: number;
	h: number;
	/** Stream origins (the port gizmo before each merchant label), region px. */
	starts: Pt[];
	/** y of the run under the merchant labels, region px. */
	floor: number;
	/** x of the free lane right of the price column, where streams may climb. */
	lane: number;
	/** Pépite's cheeks and mouth, region px, her head top (the arcs clear it) and cheek radius. */
	cheekL: Pt;
	cheekR: Pt;
	mouth: Pt;
	headTop: number;
	cheek: number;
	/** Stacked layout (phones): Pépite sits below the labels instead of beside the price. */
	stacked: boolean;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const P = (p: Pt) => `${r1(p.x)} ${r1(p.y)}`;

/**
 * Five streams: three run low under the price and climb into the near cheek and the mouth; two
 * climb the lane, arc over the ears and drop into the far cheek. Origins are taken in order; a
 * missing one reuses the last (the "…" label feeds two streams).
 */
export function streamPaths(L: StreamLayout): string[] {
	const s = (i: number) => L.starts[Math.min(i, L.starts.length - 1)] ?? { x: 0, y: L.h * 0.8 };
	const k = L.cheek;
	const ends: { to: Pt; arc: boolean }[] = [
		{ to: { x: L.cheekL.x - k * 0.1, y: L.cheekL.y - k * 0.3 }, arc: false },
		{ to: { x: L.cheekL.x - k * 0.05, y: L.cheekL.y + k * 0.35 }, arc: false },
		{ to: { x: L.cheekR.x + k * 0.1, y: L.cheekR.y - k * 0.25 }, arc: true },
		{ to: { x: L.mouth.x, y: L.mouth.y + k * 0.2 }, arc: false },
		{ to: { x: L.cheekR.x + k * 0.05, y: L.cheekR.y + k * 0.3 }, arc: true }
	];

	if (L.stacked) {
		// Phones and tablets: the labels sit above Pépite. Each stream drops out of its port, slides
		// over her ears to one side, runs down outside her silhouette and enters a pouch from the
		// outside, so nothing ever crosses her face. Sides alternate so both cheeks get fed.
		return [0, 1, 2, 3, 4].map((i) => {
			const from = s(i);
			const left = i % 2 === 0;
			const dir = left ? -1 : 1;
			const cheek = left ? L.cheekL : L.cheekR;
			const to = { x: cheek.x + dir * k * 0.15, y: cheek.y + (i < 2 ? -0.3 : 0.35) * k };
			const side = cheek.x + dir * k * (2.5 + (i % 3) * 0.25);
			const over = L.headTop - k * (0.6 + i * 0.12);
			return [
				`M${P(from)}`,
				`C${P({ x: from.x, y: Math.min(from.y + 34, over - 10) })}, ${P({ x: side, y: over - k })}, ${P({ x: side, y: over + k * 0.8 })}`,
				`C${P({ x: side, y: to.y - k * 1.3 })}, ${P({ x: to.x + dir * k * 1.5, y: to.y })}, ${P(to)}`
			].join(' ');
		});
	}

	return ends.map(({ to, arc }, i) => {
		const from = s(i);
		const low = Math.max(from.y + 12, L.floor) + i * 6;
		const lane = { x: L.lane + 10 + i * 6, y: low };
		// Every stream first runs low along the merchants, under the price, to the free lane.
		// (It drops straight out of its port first, so it never crosses its own label.)
		const run = `M${P(from)} C${P({ x: from.x, y: low + 26 })}, ${P({ x: lane.x - 90, y: low + 4 })}, ${P(lane)}`;
		if (!arc) {
			// Then it climbs out of the lane and glides into the near cheek or the mouth.
			const c1 = { x: lane.x + Math.max(60, (to.x - lane.x) * 0.45), y: low - 6 };
			const c2 = { x: to.x - Math.max(70, (to.x - lane.x) * 0.4), y: to.y + 12 + i * 4 };
			return `${run} C${P(c1)}, ${P(c2)}, ${P(to)}`;
		}
		// Or it climbs, arcs over the ears and drops into the far cheek from outside.
		const over = Math.min(L.headTop - k * 1.4 - i * 6, lane.y - 160);
		const top = { x: (L.cheekL.x + L.cheekR.x) / 2 + (i - 3) * 10, y: over };
		return [
			run,
			`C${P({ x: lane.x + 110, y: low - 8 })}, ${P({ x: top.x - (top.x - lane.x) * 0.75, y: over })}, ${P(top)}`,
			`C${P({ x: top.x + (to.x - top.x) * 1.6 + k * 2, y: over })}, ${P({ x: to.x + k * 3.4, y: to.y - k * 2.4 })}, ${P(to)}`
		].join(' ');
	});
}

/**
 * The paths source for a measured layout. `still` (reduced motion) parks the deals on the paths
 * and puts the whole crowd on them: with nothing moving, free roamers would only sit on the copy.
 */
export function streamSource(L: StreamLayout, still: boolean): FormationSource {
	return {
		kind: 'paths',
		viewBox: [Math.max(1, Math.round(L.w)), Math.max(1, Math.round(L.h))],
		paths: streamPaths(L),
		speed: still ? 0 : 0.12,
		share: still ? 1 : 0.75,
		color: APRICOT
	};
}

/** A plausible layout before anything is measured (SSR and first paint share one source). */
export const NOMINAL: StreamLayout = {
	w: 1320,
	h: 560,
	starts: [
		{ x: 250, y: 470 },
		{ x: 330, y: 470 },
		{ x: 420, y: 470 },
		{ x: 500, y: 470 }
	],
	floor: 492,
	lane: 790,
	cheekL: { x: 970, y: 300 },
	cheekR: { x: 1150, y: 300 },
	mouth: { x: 1060, y: 315 },
	headTop: 80,
	cheek: 38,
	stacked: false
};
