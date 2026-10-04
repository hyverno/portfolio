// Feature flags (DESIGN.md §8.9): ship milestones independently. Flip one to false to fall back
// to the static path for that feature without touching the feature's code.

export interface Flags {
	crowd: boolean;
	planet: boolean;
	lab: boolean;
	numbers: boolean;
	rts: boolean;
	viewModes: boolean;
	inkSwarm: boolean;
	achievements: boolean;
}

export const FLAGS: Readonly<Flags> = Object.freeze({
	crowd: true,
	planet: true,
	lab: true,
	numbers: true,
	rts: true,
	viewModes: true,
	inkSwarm: true,
	achievements: true
});
