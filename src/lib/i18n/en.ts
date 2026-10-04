/**
 * English dictionary: the source of truth for the `Dict` shape (`fr.ts` must match key for key).
 * Read it with `t()` from `#lib/i18n/index.svelte`; it re-renders on language change.
 *
 * Conventions
 * - Templates are functions that take PRE-FORMATTED strings: format numbers with `fmtNum()`
 *   and dates with `fmtDate()` / `fmtHudDate()` first, e.g. `t().hud.selected(fmtNum(142))`.
 * - `Rich` = `{ pre, em, post }`: a headline with ONE Instrument Serif italic accent word.
 * - HUD strings are already uppercase; body copy is sentence case.
 * - `index` = the mono section label on col 1 (`02 / README`); `hud` = the short section name
 *   used in the HUD context line (`hud.context('03', 'SHIPPED', 'PEONS DEPLOYED: 3')`).
 * - `canvas` = visually-hidden text equivalent placed next to an aria-hidden canvas/formation.
 *
 * Top-level keys (find things fast)
 *   nav · hud (stats, view modes, trophies, lang, sfx) · boot (preloader stages + engine log)
 *   hero · readme · shipped (labels, peon, pack, dice) · sideQuests · planet · stixiva · rongeur
 *   lab (toolbar + per-cell HUDs) · contracts · patch (kinds + loadout) · contact (lobby, copy)
 *   achievements (AchId → { title, line }) · status (fallback messages + release countdowns)
 *   fallback (no-WebGL still descriptions) · settings · cursor ([E] verbs) · notFound · project
 *   (spec sheet labels for /projects/[slug]) · meta (titles, descriptions)
 *
 * Content facts (titles, roles, releases, stacks, lab specs, patch lines, loadout) live in
 * `#lib/content/content.ts` as `L = { en, fr }` pairs, not here.
 */
import { NNBSP } from './format';

export default {
	nav: {
		aria: 'Sections',
		skip: 'Skip to content',
		home: 'Hyverno, back to the top',
		items: [
			{ id: 'shipped', label: 'WORK' },
			{ id: 'side-quests', label: 'SIDE QUESTS' },
			{ id: 'lab', label: 'LAB' },
			{ id: 'contact', label: 'CONTACT' }
		]
	},

	hud: {
		buildTag: 'HYVERNO /SIM v3.0',
		labels: {
			ent: 'ENT',
			fps: 'FPS',
			ms: 'MS',
			budget: '/ 16.6 MS',
			unitsSelected: 'UNITS SELECTED',
			numbersDrawn: 'NUMBERS DRAWN',
			trophies: 'TROPHIES',
			view: 'VIEW',
			dynamicQuality: 'DYNAMIC QUALITY'
		},
		/** Bottom-right line: `16,384 ENT · 60 FPS · 1.8 / 16.6 MS`. */
		stats: (ent: string, fps: string, ms: string) => `${ent} ENT · ${fps} FPS · ${ms} / 16.6 MS`,
		budgetAria: (ms: string) => `Frame time ${ms} of 16.6 milliseconds`,
		selected: (n: string) => `${n} UNITS SELECTED`,
		numbersDrawn: (n: string) => `${n} NUMBERS DRAWN`,
		trophies: (n: string, total: string) => `TROPHIES ${n}/${total}`,
		quality: (q: string) => `DYNAMIC QUALITY: ${q}`,
		/** Bottom-left context line: `03 · SHIPPED — PEONS DEPLOYED: 3`. */
		context: (index: string, name: string, extra?: string) =>
			extra ? `${index} · ${name} — ${extra}` : `${index} · ${name}`,
		/** Left ruler, world Y in px, already zero-padded by the caller: `Y 004 280`. */
		ruler: (y: string) => `Y ${y}`,
		viewModes: { 1: 'LIT', 2: 'DENSITY', 3: 'DEBUG', 4: 'IDS' },
		viewAria: 'View mode',
		viewKey: (n: string, name: string) => `View ${n}: ${name}`,
		debug: {
			drawCalls: 'DRAW CALLS',
			simMs: 'SIM MS',
			renderMs: 'RENDER MS',
			programs: 'PROGRAMS',
			cpu: 'CPU',
			gpu: 'GPU'
		},
		sfx: { on: 'SFX ON', off: 'SFX OFF', aria: 'Sound effects' },
		lang: {
			label: 'EN / FR',
			short: 'FR',
			/** Written in the TARGET language: put `lang="fr"` on the element. */
			switch: 'Version française'
		},
		settingsAria: 'Settings',
		trophy: {
			prefix: 'ACHIEVEMENT',
			unlocked: 'ACHIEVEMENT UNLOCKED',
			ultra: 'ULTRA RARE',
			progress: (n: string, max: string) => `${n}/${max}`,
			gnawed: 'GNAWED',
			locked: 'LOCKED'
		}
	},

	boot: {
		aria: 'Loading the simulation',
		stages: {
			spawn: 'SPAWNING ENTITIES',
			compile: 'COMPILING SHADERS',
			bake: 'BAKING FORMATIONS',
			ready: 'READY'
		},
		/** `00000 / 16384`, both values zero-padded by the caller, no grouping. */
		counter: (n: string, total: string) => `${n} / ${total}`,
		/** Engine log lines; `boot.log()` adds the `[0.014]` timestamp. Every value is measured. */
		log: {
			webgl: (maxTex: string, dpr: string) => `WEBGL2 OK · MAX_TEX ${maxTex} · DPR ${dpr}`,
			floatRT: (kind: string) => `FLOAT RT ${kind}`,
			tier: (tier: string, n: string) => `TIER ${tier} · ${n} ENT`,
			fonts: (n: string, ms: string) => `FONTS ${n} OK ${ms}MS`,
			compile: (name: string, ms: string) => `COMPILE ${name} OK ${ms}MS`,
			bake: (id: string, ms: string) => `BAKE ${id} · HILBERT ${ms}MS`,
			firstFrame: (ms: string) => `FIRST FRAME ${ms}MS`,
			joke: 'WARMING PSO CACHE… JUST KIDDING, THIS IS THE WEB',
			resumed: 'SESSION RESUMED · SHORT BOOT',
			reduced: 'REDUCED MOTION · PRESET STILL',
			noWebgl: 'WEBGL2 UNAVAILABLE · STATIC BUILD',
			ready: 'READY'
		}
	},

	hero: {
		index: '01 / HYVERNO',
		hud: 'HYVERNO',
		name: 'HYVERNO',
		/** Visually hidden inside the h1. */
		role: 'Gameplay Programmer & Technical Artist',
		lede: {
			pre: 'Gameplay programmer & technical artist. I make thousands of things move at 60fps, and look ',
			em: 'good',
			post: ' doing it.'
		},
		hint: 'DRAG TO SELECT · CLICK TO PING · PRESS [3] TO SEE THE WIRES',
		hintTouch: 'TAP TO PING · SCROLL TO PLAY',
		scroll: 'SCROLL',
		canvas: (n: string) =>
			`${n} ink dots spell the name HYVERNO. They part around your cursor and fall back into the letters.`
	},

	readme: {
		index: '02 / README',
		hud: 'README',
		statement: {
			pre: 'I started with one sprite. Then two thousand replicated soldiers. Then millions of damage numbers. The ',
			em: 'headcount',
			post: ' keeps going up. The frame time doesn’t.'
		},
		statsAria: 'In numbers',
		canvas: 'A loose flock of dots swarms each line of text as it appears, then drifts off.'
	},

	shipped: {
		index: '03 / SHIPPED · LUDOGRAM',
		hud: 'SHIPPED',
		headline: { pre: '', em: 'Shipped.', post: ' On Steam. With reviews and everything.' },
		studio: 'LUDOGRAM · INDEPENDENT STUDIO · LILLE, FRANCE',
		labels: {
			role: 'ROLE',
			developer: 'DEVELOPER',
			publisher: 'PUBLISHER',
			platforms: 'PLATFORMS',
			release: 'RELEASE',
			reception: 'RECEPTION'
		},
		specSheet: 'SPEC SHEET →',
		steam: 'STEAM PAGE ↗',
		/** Footer ticker `01/03`, both values zero-padded by the caller. */
		ticker: (i: string, n: string) => `${i}/${n}`,
		slotAria: (i: string, n: string, title: string) => `Game ${i} of ${n}: ${title}`,
		mediaHint: 'HOVER TO COLOUR IN',
		peon: {
			label: (id: string) => `PEON #${id} (DISPENSABLE)`,
			deployed: (n: string) => `PEONS DEPLOYED: ${n}`,
			aria: 'Despawn the peon'
		},
		pack: { rare: 'RARE PULL', aria: 'Open a mystery pack' },
		dice: {
			hope: 'HOPE',
			horror: 'HORROR',
			nat20: 'NAT 20',
			nat1: 'NAT 1',
			result: (n: string, outcome: string) => `Rolled ${n}: ${outcome}`,
			tapHint: 'TAP TO ROLL',
			aria: 'Roll the d20',
			ghost: (player: string, ms: string) => `${player} · RTT ${ms}MS`
		},
		canvas: {
			'monsters-are-coming':
				'Dots form a city walking on stilts, a horde of dots chasing it, and one orange peon.',
			'tabletop-game-shop-simulator':
				'Dots stack into shelves of grey miniatures; a diagonal sweep paints them in five colours.',
			invokyr: 'Dots trace the edges of a spinning twenty-sided die.'
		}
	},

	sideQuests: {
		index: '04 / SIDE QUESTS',
		hud: 'SIDE QUESTS',
		headline: { pre: 'Built after hours. ', em: 'Shipped', post: ' anyway.' },
		canvas: 'Three diamonds made of dots, one per project, joined by dotted paths.'
	},

	planet: {
		index: '04a / CRAZY PLANET SURVIVOR',
		hud: 'CRAZY PLANET',
		panels: ['WHAT IT IS', 'THE STACK', 'THE FLEX'],
		biomes: { earth: 'EARTH', ice: 'ICE' },
		biomeAria: 'Biome',
		cast: 'CLICK TO CAST',
		castTouch: 'TAP TO CAST',
		keys: 'SPACE TO CAST · ←/→ TO SPIN',
		disclaimer: 'Web recreation in three.js. The real one runs on DOTS.',
		hudLine: (ent: string, craters: string, max: string, biome: string) =>
			`ENTITIES ON SPHERE ${ent} · CRATERS ${craters}/${max} · BIOME ${biome}`,
		orbit: { craters: 'CRATERS', ent: 'ENT' },
		canvas:
			'A small inked planet with contour lines. A horde of tiny cones chases a red player dot across its surface; each spell leaves a crater.'
	},

	stixiva: {
		index: '04b / STIXIVA',
		hud: 'STIXIVA',
		/** Mock app toolbar: French in both languages, on purpose. */
		toolbar: ['Atelier', 'Palette de fils', 'Grille', 'Exporter le PDF'],
		joke: 'UI in French. Embroidery is serious business.',
		dither: { on: 'DITHER ON', off: 'DITHER OFF' },
		/** Pattern-panel internals belong to the (French) app UI. */
		legend: 'LÉGENDE',
		cellTip: (n: string, name: string, count: string) => `FIL ${n} · ${name} · ×${count} POINTS`,
		pdf: { verb: 'PDF EXPORT', preview: 'APERÇU / PREVIEW', close: 'CLOSE' },
		pro: 'Pro tier coming.',
		chartAria: 'Cross-stitch chart with one symbol per thread colour',
		canvas:
			'A grid of dots shows a five-petal rose. A scanline sweeps across and turns each dot into a coloured cross-stitch.'
	},

	rongeur: {
		index: '04c / LE RONGEUR',
		hud: 'LE RONGEUR',
		/** Stays French in both languages. */
		headline: 'IL RONGE LES PRIX.',
		sub: 'It gnaws prices down to the crumbs.',
		line: 'Pépite reads the official feeds so you don’t overpay.',
		exampleLabel: 'PRIX EXEMPLE / EXAMPLE PRICE',
		stamp: (pct: string) => `RONGÉ −${pct}${NNBSP}%`,
		merchants: 'FLUX OFFICIELS: EBAY · FNAC · DARTY · …',
		priceAria: (price: string) => `Example price: ${price}`,
		bite: {
			hint: 'CLICK THE PRICE TO TAKE A BITE',
			hintTouch: 'TAP THE PRICE TO BITE',
			left: (n: string) => `${n} BITES LEFT`,
			aria: 'Bite the price'
		},
		pepite: 'Pépite, the Le Rongeur mascot, cheeks stuffed with deals',
		canvas: 'Apricot dots stream from the merchant names into Pépite’s cheeks.'
	},

	lab: {
		index: '05 / LAB',
		hud: 'LAB',
		headline: { pre: 'Things that ', em: 'shouldn’t', post: ' run this fast.' },
		toolbar: ['PERSPECTIVE', 'LIT', 'REALTIME'],
		recreation: 'WEB RECREATION',
		recreationTip: (original: string) => `Web recreation. Original: ${original}.`,
		spec: { original: 'ORIGINAL', tags: 'TAGS', metric: 'METRIC' },
		cellAria: (title: string) => `${title}, interactive web recreation`,
		still: 'STATIC STILL · WEBGL OFF',
		paused: 'PAUSED',
		crowd: {
			hud: (n: string, depth: string) => `${n} AGENTS · QUADTREE DEPTH ${depth}`,
			toggle: '[Q] QUADTREE'
		},
		numbers: {
			hint: 'HOLD TO SPAWN. IT DOES NOT CARE.',
			hud: (n: string, calls: string, ms: string) =>
				`ON SCREEN ${n} · DRAW CALLS ${calls} · JS ${ms} MS`
		},
		nested: {
			hud: (n: string) => `${n} GPU POINTS`,
			graph: ['Spawn', 'Update', 'Emitter[child]', 'Render']
		},
		navmesh: {
			hud: (n: string) => `${n} AGENTS · FLOW FIELD 48×27`,
			hint: 'MOVE TO SET THE TARGET'
		},
		water: { steepness: 'STEEPNESS Q', wavelength: 'WAVELENGTH' },
		replication: {
			server: 'SERVER',
			client: 'CLIENT',
			latency: 'LATENCY',
			interp: { on: 'INTERP ON', off: 'INTERP OFF' },
			lobby: 'LOBBY',
			inventory: 'INVENTORY'
		},
		canvas: 'Six live editor viewports. The page’s dots march in the gutters between them.'
	},

	contracts: {
		index: '06 / CONTRACTS',
		hud: 'CONTRACTS',
		headline: 'Parties I’ve joined.',
		columns: { client: 'CLIENT', role: 'ROLE', stack: 'STACK', status: 'STATUS' },
		done: '✓',
		doneAria: 'Completed',
		none: '—',
		community: {
			title: 'COMMUNITY LOG',
			columns: { name: 'NAME', what: 'WHAT', when: 'WHEN' }
		}
	},

	patch: {
		index: '07 / PATCH NOTES',
		hud: 'PATCH NOTES',
		headline: 'Patch notes',
		version: 'VERSION',
		kinds: { '+': 'Added', '~': 'Changed', '-': 'Removed', '!': 'Known issue' },
		footer: 'Known issue: cannot stop optimising.',
		canvas: 'Dots flow down the timeline like a conveyor belt and gather at each version.',
		loadout: {
			title: 'LOADOUT',
			aria: 'Skills inventory',
			rarities: { legendary: 'LEGENDARY', epic: 'EPIC', rare: 'RARE', common: 'COMMON' },
			/** `Niagara: Legendary. Used to put systems inside systems.` */
			tooltip: (name: string, rarity: string, line: string) => `${name}: ${rarity}. ${line}`,
			rarityNames: { legendary: 'Legendary', epic: 'Epic', rare: 'Rare', common: 'Common' }
		}
	},

	contact: {
		index: '08 / PRESS START',
		hud: 'PRESS START',
		headline: {
			pre: 'Need someone who ships systems ',
			em: 'and',
			post: ' makes them pretty? Press Start.'
		},
		lobby: {
			aria: 'Co-op lobby',
			slot: (n: string) => `P${n}`,
			host: 'HYVERNO',
			you: 'YOU',
			ready: 'READY',
			pressStart: 'PRESS START',
			empty: '[ EMPTY ]'
		},
		email: 'EMAIL',
		copy: {
			aria: 'Copy the email address',
			done: 'COPIED · +50 XP',
			failed: 'COPY BLOCKED · SELECT IT BY HAND'
		},
		cta: 'PRESS START',
		recruit: 'RECRUIT THIS UNIT',
		recruitSubject: 'Recruiting: gameplay / tech art',
		socials: { aria: 'Elsewhere', github: 'GitHub', linkedin: 'LinkedIn', steam: 'Steam' },
		respawn: 'RESPAWN ↑',
		respawnAria: 'Back to the top',
		footer: (n: string) =>
			`Built with SvelteKit, three.js and GSAP. ${n} entities simulated. No UMG widgets were harmed.`,
		canvas:
			'Dots ring the lobby, then march down and rebuild the name HYVERNO at the bottom of the page.'
	},

	/** Keyed by `AchId` (src/lib/stores/achievements.svelte.ts). */
	achievements: {
		'first-blood': { title: 'FIRST BLOOD', line: 'You pinged the crowd. It pinged back.' },
		'crowd-control': { title: 'CROWD CONTROL', line: 'Selected 500+ units. Micro: excellent.' },
		wireframe: { title: 'WIREFRAME ENJOYER', line: 'Opened Debug view.' },
		crit: { title: 'CRIT HAPPENS', line: 'Rolled a nat 20.' },
		'planet-breaker': { title: 'PLANET BREAKER', line: 'Eight craters. Physics was consulted.' },
		'cross-stitch': { title: 'CROSS MY HEART', line: 'Stitched a full pattern.' },
		'cheeks-full': { title: 'CHEEKS FULL', line: 'Pépite is proud of you.' },
		'bullet-hell': { title: 'BULLET HELL', line: '20,000 numbers on screen. Still 60fps.' },
		networking: { title: 'NETWORKING', line: 'Email copied.' },
		completionist: { title: 'COMPLETIONIST', line: 'Reached the footer.' },
		'dev-mode': {
			title: '#1,445 · DEVELOPER MODE',
			line: 'His 1,444 Steam achievements, plus you.'
		}
	},

	status: {
		notFound: 'Entity not found. It probably despawned.',
		noWebgl: 'Your GPU called in sick. Here’s the static build.',
		reducedMotion: 'Simulation paused for reduced motion. Everything’s still here.',
		contextLost: 'GPU CONTEXT LOST · STATIC BUILD FROM HERE',
		governor: (q: string) => `DYNAMIC QUALITY: ${q}. HONESTY IS A FEATURE.`,
		/** Building blocks for `releaseLabel()` in #lib/content/status. */
		release: {
			outNow: 'OUT NOW',
			earlyAccess: 'EARLY ACCESS',
			launch: 'FULL RELEASE',
			inDays: (what: string, n: string) => `${what} IN ${n} DAYS`,
			tomorrow: (what: string) => `${what} TOMORROW`,
			on: (what: string, date: string) => `${what} ${date}`
		}
	},

	/** Descriptions of the static no-WebGL stills (alt / visually-hidden text). */
	fallback: {
		hero: 'The name HYVERNO set in halftone dots.',
		city: 'Line drawing of a city on stilts walking away from a horde.',
		shelves: 'Line drawing of three shelves stocked with painted miniatures.',
		d20: 'Line drawing of a twenty-sided die.',
		planet: 'Drawing of a small planet with contour lines, craters and dots orbiting it.',
		stixiva: 'A static cross-stitch pattern chart.',
		lab: 'Static still of the demo. WebGL is unavailable, so it does not run here.'
	},

	settings: {
		title: 'SETTINGS',
		open: 'Open settings',
		close: 'CLOSE',
		quality: 'QUALITY',
		qualities: { AUTO: 'AUTO', LOW: 'LOW', MED: 'MED', HIGH: 'HIGH' },
		motion: 'MOTION',
		motions: { full: 'FULL', reduced: 'REDUCED' },
		toasts: 'TOASTS',
		sound: 'SFX',
		on: 'ON',
		off: 'OFF',
		language: 'LANGUAGE',
		stats: 'STATS',
		sections: 'SECTIONS'
	},

	cursor: {
		prompt: (verb: string) => `[E] ${verb}`,
		/** Lock-on verbs for `use:interact={{ verb }}`. */
		verbs: {
			roll: 'ROLL',
			bite: 'BITE',
			copy: 'COPY',
			run: 'RUN',
			open: 'OPEN',
			cast: 'CAST',
			select: 'SELECT',
			toggle: 'TOGGLE',
			spec: 'SPEC SHEET',
			openPack: 'OPEN PACK',
			despawn: 'DESPAWN',
			export: 'PDF EXPORT',
			start: 'PRESS START',
			respawn: 'RESPAWN',
			next: 'NEXT LEVEL'
		},
		/** CTA hover label. */
		enter: '[ ENTER ]',
		readout: (x: string, y: string) => `X ${x} Y ${y}`
	},

	notFound: {
		code: '404',
		label: 'ERR_ENTITY_NOT_FOUND',
		title: 'Entity not found. It probably despawned.',
		respawn: 'RESPAWN',
		home: 'Back to the spawn point'
	},

	/** Labels for /projects/[slug] (stage 2). Empty fields are hidden, never invented. */
	project: {
		specSheet: 'SPEC SHEET',
		fields: {
			engine: 'ENGINE',
			role: 'ROLE',
			team: 'TEAM',
			developer: 'DEVELOPER',
			publisher: 'PUBLISHER',
			platforms: 'PLATFORMS',
			release: 'RELEASE',
			reception: 'RECEPTION',
			status: 'STATUS',
			stack: 'STACK'
		},
		next: 'NEXT LEVEL →',
		back: '← BACK TO THE MAP',
		steam: 'STEAM PAGE ↗',
		media: 'Media slot'
	},

	meta: {
		title: 'Hyverno · Gameplay Programmer & Technical Artist',
		description:
			'Hyverno, gameplay programmer and technical artist. Three shipped games with Ludogram, GPU crowds, damage numbers and side quests, all running live in the page.',
		ogAlt: 'HYVERNO spelled by thousands of ink dots on warm paper.',
		project: (name: string) => `${name} · Hyverno`,
		notFound: 'Entity not found · Hyverno'
	}
} as const;
