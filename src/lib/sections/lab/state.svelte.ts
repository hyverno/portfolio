// Shared Lab state: which cell is "active" (hovered, focused, or picked from the spec list), the
// cell closest to the viewport centre (single-column layouts run only that one) and the reveal.
import type { LabId } from '#lib/content/types';

export const lab = $state({
	hoverCell: null as LabId | null,
	focusCell: null as LabId | null,
	hoverSpec: null as LabId | null,
	/** Cell under the viewport's horizontal centre line. */
	centre: null as LabId | null,
	/** One column (phones): only the centre cell runs. */
	single: false,
	/** performance.now() when the grid reveal started; 0 = waiting, -1 = no choreography. */
	revealAt: 0
});

/** The cell that runs every frame and stays bright while the others dim. */
export function activeCell(): LabId | null {
	return lab.hoverCell ?? lab.focusCell ?? lab.hoverSpec;
}

export function resetLab(): void {
	lab.hoverCell = null;
	lab.focusCell = null;
	lab.hoverSpec = null;
	lab.centre = null;
	lab.revealAt = 0;
}
