// Lazy chunks of the Lab cells. Nothing here imports three: the WebGL scenes and the GL kit are
// only fetched on demand (two viewports ahead of the Lab, see `prefetchLab`), then created by
// LabCell when the cell itself comes near.
import type { LabId } from '#lib/content/types';

export const loadCrowd = () => import('./CrowdQuadtree');
export const loadNavmesh = () => import('./Navmesh');
export const loadReplication = () => import('./Replication');
export const loadHose = () => import('./HoseScene');
export const loadNested = () => import('./NestedScene');
export const loadWater = () => import('./WaterScene');
export const loadKit = () => import('./glkit');

const CELL: Record<LabId, () => Promise<unknown>> = {
	crowd: loadCrowd,
	navmesh: loadNavmesh,
	replication: loadReplication,
	numbers: loadHose,
	nested: loadNested,
	water: loadWater
};

let prefetched = false;

/**
 * Warms the module cache for every cell (and the GL kit when WebGL runs), so a fast scroll never
 * meets an empty viewport. Failures are ignored: LabCell fetches again (and degrades) on its own.
 */
export function prefetchLab(webgl: boolean): void {
	if (prefetched) return;
	prefetched = true;
	const quiet = (p: Promise<unknown>) => p.catch(() => {});
	for (const [id, load] of Object.entries(CELL)) {
		if (!webgl && (id === 'numbers' || id === 'nested' || id === 'water')) continue;
		quiet(load());
	}
	if (webgl) quiet(loadKit());
}
