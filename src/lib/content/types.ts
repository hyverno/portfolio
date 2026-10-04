// Content model (DESIGN.md §9.1, extended additively). Facts only; UI strings live in #lib/i18n.

/** A localised pair. Read it in components with `loc(l)` from `#lib/i18n/index.svelte`. */
export type L = { en: string; fr: string };

export type GameSlug = 'monsters-are-coming' | 'tabletop-game-shop-simulator' | 'invokyr';
export type SideProjectSlug = 'crazy-planet-survivor' | 'stixiva' | 'le-rongeur';
export type ProjectSlug = GameSlug | SideProjectSlug;

export interface Media {
	src: string;
	alt: L;
}

export interface Release {
	/** Platform / channel as shown in the HUD status line, e.g. `PC (STEAM, GAME PASS)`. */
	label: L;
	/** `YYYY-MM-DD` (or `YYYY-MM` when `precision` is `'month'`). */
	date: string;
	precision: 'day' | 'month';
	/** `early-access` and `launch` drive the countdown wording; `port` is a later platform. */
	kind: 'early-access' | 'launch' | 'port';
}

export interface Game {
	slug: GameSlug;
	title: string;
	/** Studio(s) that made it. */
	developer: string;
	publisher: string | null;
	role: L;
	/** One-line punch for the mission brief. */
	line: L;
	/** Optional second line under `line` (Invokyr: "More players. More regrets."). */
	sub?: L;
	/** Two or three neutral sentences for the spec sheet / project page. */
	pitch: L;
	platforms: string[];
	releases: Release[];
	/** HUD-style reception, e.g. `STEAM: VERY POSITIVE`. Empty strings = not published, hide it. */
	reception: L;
	/** Static HUD line rendered under the brief (prerendered, dates fixed). */
	hud: L;
	formation: 'ludo-city' | 'ludo-shelves' | 'ludo-d20';
	steam?: string;
	/** Engine, when known. Empty = hidden (TODO(Hyverno)). */
	engine?: string;
	media?: Media;
}

export interface SideProject {
	slug: SideProjectSlug;
	title: string;
	/** Status chip. Empty strings = hide the chip. */
	status: L;
	stack: string[];
	/** French wording where a stack entry is a phrase rather than a product name. */
	stackFr?: string[];
	line: L;
	/** Panels / paragraphs, in order. */
	body: L[];
	/** Public URL. Empty = hidden (TODO(Hyverno)). */
	url?: string;
	media?: Media;
}

export type LabId = 'crowd' | 'numbers' | 'nested' | 'navmesh' | 'water' | 'replication';

export interface LabEntry {
	id: LabId;
	title: string;
	/** What the original runs in (the cell itself is always a web recreation). */
	engine: string;
	tags: string[];
	metric: L;
	body: L;
	/** How the web recreation renders: shared WebGL renderer (scissored) or its own Canvas2D. */
	render: 'webgl' | 'canvas2d';
}

export interface Contract {
	name: string;
	role: L;
	stack: string | null;
	/** Localised display name when `name` is a generic word (e.g. "Assorted" / "Divers"). */
	label?: L;
}

export interface Volunteer {
	name: string;
	what: L;
	when: L;
}

export type PatchKind = '+' | '~' | '-' | '!';

export interface PatchNote {
	version: string;
	title: L;
	lines: { kind: PatchKind; text: L }[];
	/** TODO(Hyverno): render only when filled. Never invent dates. */
	date?: string;
}

export type Rarity = 'legendary' | 'epic' | 'rare' | 'common';

export interface LoadoutItem {
	name: string;
	rarity: Rarity;
	/** Flavour line only; compose with `t().patch.loadout.tooltip(name, rarityName, line)`. */
	tooltip: L;
}

export interface HeroStat {
	value: number;
	prefix?: string;
	suffix?: string;
	label: L;
	/** Optional attribution shown as a footnote/tooltip (the 6000× figure is the UE plugin's). */
	note?: L;
}
