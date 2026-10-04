// Site facts. BUILD-NOTES §4 overrides DESIGN.md §6: nothing here may claim more than a role
// title for studio work, OVHcloud is a bare name, and dates are never invented.
import { NBSP, NNBSP } from '#lib/i18n/format';
import type {
	Contract,
	Game,
	HeroStat,
	LabEntry,
	LoadoutItem,
	PatchNote,
	ProjectSlug,
	SideProject,
	Volunteer
} from './types';

const same = (s: string) => ({ en: s, fr: s });

export const site = {
	name: 'Hyverno',
	email: 'solo.hyverno@gmail.com',
	/** TODO(Hyverno): fill in. Links with empty URLs are hidden, never guessed. */
	socials: { github: '', linkedin: '', steam: '' }
} as const satisfies {
	name: 'Hyverno';
	email: 'solo.hyverno@gmail.com';
	socials: { github: string; linkedin: string; steam: string };
};

export const studio = {
	name: 'Ludogram',
	city: { en: 'Lille, France', fr: 'Lille' },
	url: 'https://ludogram.io/'
} as const;

/** README stats row. Format with `fmtNum(value)` + prefix/suffix. */
export const heroStats: HeroStat[] = [
	{ value: 7, suffix: '+', label: { en: 'YRS OF CODE', fr: 'ANS DE CODE' } },
	{ value: 3, label: { en: 'STUDIO TITLES', fr: 'JEUX EN STUDIO' } },
	{ value: 2000, suffix: '+', label: { en: 'REPLICATED ENTITIES', fr: 'ENTITÉS RÉPLIQUÉES' } },
	{
		value: 6000,
		suffix: '×',
		label: { en: 'FASTER THAN UMG', fr: 'PLUS RAPIDE QU’UMG' },
		note: {
			en: 'Advanced Draw Number, the UE plugin, against UMG widgets.',
			fr: 'Advanced Draw Number, le plugin UE, face aux widgets UMG.'
		}
	},
	{ value: 1444, label: { en: 'STEAM ACHIEVEMENTS', fr: 'SUCCÈS STEAM' } }
];

export const games: Game[] = [
	{
		slug: 'monsters-are-coming',
		title: 'Monsters are Coming! Rock & Road',
		developer: 'Ludogram',
		publisher: 'Raw Fury',
		role: { en: 'Gameplay Programmer', fr: 'Programmeur gameplay' },
		line: {
			en: 'You play a dispensable peon. I was on the gameplay code that keeps it busy.',
			fr: 'Vous incarnez un péon jetable. Moi, j’étais sur le code gameplay qui le fait trimer.'
		},
		pitch: {
			en: 'A city on the move, a horde on its heels. Developed by Ludogram, published by Raw Fury, on PC (Steam, Game Pass) and Xbox Series.',
			fr: 'Une ville en marche, une horde à ses trousses. Développé par Ludogram, édité par Raw Fury, sur PC (Steam, Game Pass) et Xbox Series.'
		},
		platforms: ['PC (Steam, Game Pass)', 'Xbox Series X|S'],
		releases: [
			{
				label: same('PC (STEAM, GAME PASS)'),
				date: '2025-11-20',
				precision: 'day',
				kind: 'launch'
			},
			{ label: same('XBOX SERIES'), date: '2026-08-06', precision: 'day', kind: 'port' }
		],
		reception: { en: 'STEAM: VERY POSITIVE', fr: `STEAM${NBSP}: TRÈS POSITIVES` },
		hud: {
			en: 'PC NOV 2025 · XBOX SERIES AUG 2026 · STEAM: VERY POSITIVE',
			fr: `PC NOV. 2025 · XBOX SERIES AOÛT 2026 · STEAM${NBSP}: TRÈS POSITIVES`
		},
		formation: 'ludo-city',
		steam: 'https://store.steampowered.com/app/2934220/'
	},
	{
		slug: 'tabletop-game-shop-simulator',
		title: 'Tabletop Game Shop Simulator',
		developer: 'Ludogram & Knight Fever Games',
		publisher: 'Knight Fever Games',
		role: { en: 'Gameplay Developer', fr: 'Développeur gameplay' },
		line: {
			en: 'Glue, paint, duel, restock. Gameplay code: shipped.',
			fr: `Coller, peindre, s’affronter, remettre en rayon. Code gameplay${NBSP}: livré.`
		},
		pitch: {
			en: 'Run a tabletop game shop: glue and paint the miniatures, host the duels, keep the shelves stocked. Developed by Ludogram and Knight Fever Games, published by Knight Fever Games.',
			fr: `Tenez une boutique de jeux de plateau${NNBSP}: montez et peignez les figurines, organisez les duels, gardez les rayons pleins. Développé par Ludogram et Knight Fever Games, édité par Knight Fever Games.`
		},
		platforms: ['PC (Steam)'],
		releases: [
			{
				label: { en: 'EARLY ACCESS', fr: 'ACCÈS ANTICIPÉ' },
				date: '2025-11-12',
				precision: 'day',
				kind: 'early-access'
			},
			{ label: same('STEAM'), date: '2026-05-28', precision: 'day', kind: 'launch' }
		],
		/** TODO(Hyverno): no published Steam rating in the brief; hidden while empty. */
		reception: { en: '', fr: '' },
		hud: { en: 'RELEASED MAY 28 2026 · STEAM', fr: 'SORTI LE 28 MAI 2026 · STEAM' },
		formation: 'ludo-shelves',
		steam: 'https://store.steampowered.com/app/3524750/'
	},
	{
		slug: 'invokyr',
		title: 'Invokyr',
		developer: 'Ludogram',
		publisher: 'Ludogram & Shochiku',
		role: { en: 'Gameplay Developer / Network', fr: 'Développeur gameplay / réseau' },
		line: {
			en: 'Jumanji, but it bites. Roll for netcode.',
			fr: 'Jumanji, en plus mordant. Faites un jet de netcode.'
		},
		sub: { en: 'More players. More regrets.', fr: 'Plus de joueurs. Plus de regrets.' },
		pitch: {
			en: 'A co-op game in the spirit of Jumanji, with teeth. Developed by Ludogram, published by Ludogram and Shochiku.',
			fr: 'Un jeu coop dans l’esprit de Jumanji, avec des crocs. Développé par Ludogram, édité par Ludogram et Shochiku.'
		},
		platforms: ['PC (Steam)'],
		releases: [
			{
				label: { en: 'EARLY ACCESS', fr: 'ACCÈS ANTICIPÉ' },
				date: '2026-10-08',
				precision: 'day',
				kind: 'early-access'
			}
		],
		reception: {
			en: 'DEMO 94% POSITIVE',
			fr: `DÉMO${NBSP}: 94${NNBSP}% D’AVIS POSITIFS`
		},
		hud: {
			en: 'CO-OP · DEMO 94% POSITIVE · EARLY ACCESS OCT 8 2026',
			fr: `COOP · DÉMO${NBSP}: 94${NNBSP}% D’AVIS POSITIFS · ACCÈS ANTICIPÉ 8 OCT. 2026`
		},
		formation: 'ludo-d20',
		steam: 'https://store.steampowered.com/app/3883570/Invokyr/'
	}
];

export const sideProjects: SideProject[] = [
	{
		slug: 'crazy-planet-survivor',
		title: 'Crazy Planet Survivor',
		status: { en: 'IN DEVELOPMENT', fr: 'EN DÉVELOPPEMENT' },
		stack: ['Unity DOTS/ECS 1.3', 'URP', 'Unity Physics', 'VFX Graph', 'FMOD'],
		line: {
			en: 'Thousands of entities on a sphere, and none of them fall off.',
			fr: 'Des milliers d’entités sur une sphère, et pas une ne tombe.'
		},
		// The three copy panels, in order: what it is, the stack, the flex.
		body: [
			{
				en: 'A survivors-like on spherical planets. The horde comes from every direction, including the other side.',
				fr: 'Un survivors-like sur des planètes sphériques. La horde arrive de partout, y compris de l’autre côté.'
			},
			same('Unity DOTS/ECS 1.3 · URP · Unity Physics · VFX Graph · FMOD'),
			{
				en: 'Procedural planets, destructible and terraformable. Every crater changes the ground under the horde.',
				fr: 'Des planètes procédurales, destructibles et terraformables. Chaque cratère change le sol sous les pieds de la horde.'
			}
		]
	},
	{
		slug: 'stixiva',
		title: 'Stixiva',
		status: { en: 'PUBLIC BETA', fr: 'BÊTA PUBLIQUE' },
		stack: ['PixiJS WebGL', 'Tauri/Rust core', 'React/TypeScript', 'PDF export'],
		stackFr: ['PixiJS WebGL', 'cœur Tauri/Rust', 'React/TypeScript', 'export PDF'],
		line: {
			en: 'Any image in. A stitchable pattern out.',
			fr: 'Une image en entrée. Une grille à broder en sortie.'
		},
		body: [
			{
				en: 'Turns an image into a cross-stitch pattern you can print and stitch. Pro tier coming.',
				fr: 'Transforme une image en grille de point de croix, prête à imprimer et à broder. Version Pro en préparation.'
			}
		]
	},
	{
		slug: 'le-rongeur',
		title: 'Le Rongeur',
		/** TODO(Hyverno): status chip (e.g. live / beta); hidden while empty. */
		status: { en: '', fr: '' },
		stack: ['SvelteKit', 'Drizzle', 'Official merchant APIs & feeds'],
		stackFr: ['SvelteKit', 'Drizzle', 'API et flux marchands officiels'],
		line: {
			en: 'Pépite reads the official feeds so you don’t overpay.',
			fr: 'Pépite épluche les flux officiels pour que vous ne payiez jamais trop.'
		},
		body: [
			{
				en: 'A deal finder built only on official merchant APIs and feeds. Prices shown on this site are examples.',
				fr: 'Un chasseur de bons plans qui ne lit que les API et flux officiels des marchands. Les prix affichés sur ce site sont des exemples.'
			}
		]
	}
];

/** §5 "05 · LAB". Every cell is a web recreation; `engine` names the original. */
export const lab: LabEntry[] = [
	{
		id: 'crowd',
		title: 'CROWD SIM',
		engine: 'UE4 + Flecs',
		tags: ['Flecs ECS (C)', 'Replication', 'Quadtree', 'Line traces', 'Niagara'],
		metric: { en: '2,000+ REPLICATED ENTITIES', fr: `2${NNBSP}000+ ENTITÉS RÉPLIQUÉES` },
		body: {
			en: '2,000+ replicated entities on Flecs, an ECS written in C. Recoded collision, a quadtree and line traces for queries, persistent GPU IDs in Niagara.',
			fr: `2${NNBSP}000+ entités répliquées sur Flecs, un ECS écrit en C. Collisions recodées, quadtree et line traces pour les requêtes, ID GPU persistants dans Niagara.`
		},
		render: 'canvas2d'
	},
	{
		id: 'numbers',
		title: 'ADVANCED DRAW NUMBER',
		engine: 'UE plugin',
		tags: ['GPU-driven', 'Replicated', 'Unreal Engine'],
		metric: { en: '6,000× FASTER THAN UMG', fr: `6${NNBSP}000× PLUS RAPIDE QU’UMG` },
		body: {
			en: 'The UE plugin: 6,000× faster than UMG widgets, replicated, GPU-driven. This is its WebGL cousin.',
			fr: `Le plugin UE${NNBSP}: 6${NNBSP}000 fois plus rapide que les widgets UMG, répliqué, piloté par le GPU. Voici son cousin WebGL.`
		},
		render: 'webgl'
	},
	{
		id: 'nested',
		title: 'SYSTEM IN SYSTEM',
		engine: 'Niagara',
		tags: ['Niagara', 'Child emitters', 'GPU particles'],
		metric: { en: '64 × 64 = 4,096 GPU POINTS', fr: `64 × 64 = 4${NNBSP}096 POINTS GPU` },
		body: {
			en: 'Every rocket is an emitter, every spark one of its particles. Systems inside systems.',
			fr: 'Chaque fusée est un émetteur, chaque étincelle une de ses particules. Des systèmes dans des systèmes.'
		},
		render: 'webgl'
	},
	{
		id: 'navmesh',
		title: 'NAVMESH × MASS',
		engine: 'UE5 Mass',
		tags: ['Mass Entity', 'Navmesh', 'Flow field'],
		metric: { en: 'HUNDREDS OF AGENTS ON A NAVMESH', fr: 'DES CENTAINES D’AGENTS SUR UN NAVMESH' },
		body: {
			en: 'Hundreds of Mass agents pathing over a navmesh. Here: a BFS flow field on a 48×27 grid, 300 agents chasing your cursor.',
			fr: `Des centaines d’agents Mass qui naviguent sur un navmesh. Ici${NNBSP}: un champ de flux BFS sur une grille 48×27, 300 agents aux trousses de votre curseur.`
		},
		render: 'canvas2d'
	},
	{
		id: 'water',
		title: 'GERSTNER WATER',
		engine: 'HLSL material',
		tags: ['HLSL', 'Gerstner waves', 'Material'],
		metric: { en: '4 WAVES · LIVE Q AND λ', fr: '4 VAGUES · Q ET λ EN DIRECT' },
		body: {
			en: 'An HLSL Gerstner material, redrawn as ink contour lines. Drag the sliders.',
			fr: 'Un matériau Gerstner en HLSL, redessiné en courbes de niveau à l’encre. Jouez avec les curseurs.'
		},
		render: 'webgl'
	},
	{
		id: 'replication',
		title: 'REPLICATION',
		engine: 'Multiplayer netcode',
		tags: ['Replication', 'Interpolation', 'Inventory', 'Lobby'],
		metric: { en: '0–300 MS SIMULATED LAG', fr: '0–300 MS DE LAG SIMULÉ' },
		body: {
			en: 'Multiplayer inventory and lobby. Drag the latency up, watch the jitter, then switch interpolation on.',
			fr: 'Inventaire et lobby multijoueur. Montez la latence, regardez ça trembler, puis activez l’interpolation.'
		},
		render: 'canvas2d'
	}
];

/** OVHcloud first, and nothing but its name and `MISSION`. */
export const contracts: Contract[] = [
	{ name: 'OVHcloud', role: { en: 'MISSION', fr: 'MISSION' }, stack: null },
	{ name: 'Stoetzel Sonorisation', role: same('UI/UX + front-end'), stack: 'Svelte, Express' },
	{
		name: 'Qanga',
		role: {
			en: 'UI design integrated in Unreal Engine',
			fr: 'Design d’UI intégré dans Unreal Engine'
		},
		stack: 'Unreal Engine'
	},
	{
		name: 'Assorted',
		label: { en: 'Assorted', fr: 'Divers' },
		role: {
			en: 'Discord webhooks, tools, Figma integrations',
			fr: 'Webhooks Discord, outils, intégrations Figma'
		},
		stack: null
	}
];

export const volunteer: Volunteer[] = [
	{
		name: 'Asynconf',
		what: {
			en: 'Dev conference and coding competition. Organised, moderated and corrected ~300 exercises.',
			fr: 'Conférence dev et compétition de code. Organisation, modération et correction d’environ 300 exercices.'
		},
		when: { en: 'EDITIONS 1, 2 AND 4', fr: 'ÉDITIONS 1, 2 ET 4' }
	},
	{
		name: 'Unreal community Discord',
		what: {
			en: 'Helping devs with terrain generation, Niagara and data.',
			fr: 'Coups de main aux devs sur la génération de terrain, Niagara et la data.'
		},
		when: { en: 'ONGOING', fr: 'EN COURS' }
	}
];

/** Oldest first. Versions replace years; the order is to be confirmed by Hyverno. */
export const patchNotes: PatchNote[] = [
	{
		version: 'v0.1',
		title: same('Hello, Godot'),
		lines: [
			{
				kind: '+',
				text: { en: 'A top-down game in Godot.', fr: 'Un jeu en vue de dessus sous Godot.' }
			},
			{ kind: '!', text: { en: 'Entity count: 1.', fr: `Nombre d’entités${NBSP}: 1.` } }
		]
	},
	{
		version: 'v0.2',
		title: { en: 'First website', fr: 'Premier site' },
		lines: [
			{
				kind: '+',
				text: {
					en: 'A shop selling game accounts.',
					fr: 'Une boutique qui vend des comptes de jeu.'
				}
			}
		]
	},
	{
		version: 'v1.0',
		title: same('Freelance'),
		lines: [
			{
				kind: '+',
				text: {
					en: 'Freelance web design and front-end.',
					fr: 'Web design et front-end en freelance.'
				}
			}
		]
	},
	{
		version: 'v1.4',
		title: { en: 'Web TechArt', fr: 'TechArt web' },
		lines: [
			{
				kind: '+',
				text: {
					en: 'Tech art for the web, in three.js.',
					fr: 'Du tech art pour le web, en three.js.'
				}
			},
			{
				kind: '+',
				text: { en: 'Three.js Journey: certified.', fr: `Three.js Journey${NBSP}: certifié.` }
			},
			{ kind: '~', text: { en: 'Divs → shaders.', fr: 'Des divs aux shaders.' } }
		]
	},
	{
		version: 'v2.0',
		title: same('ISTIC Rennes'),
		lines: [
			{
				kind: '+',
				text: {
					en: 'ISTIC Rennes, programming faculty.',
					fr: 'ISTIC, l’UFR informatique de Rennes.'
				}
			}
		]
	},
	{
		version: 'v2.5',
		title: { en: 'Into the engine', fr: 'Dans le moteur' },
		lines: [
			{ kind: '+', text: { en: 'Water.', fr: 'De l’eau.' } },
			{ kind: '+', text: { en: 'Explosions.', fr: 'Des explosions.' } },
			{ kind: '+', text: { en: 'Crowds.', fr: 'Des foules.' } },
			{ kind: '+', text: { en: 'Multiplayer.', fr: 'Du multijoueur.' } }
		]
	},
	{
		version: 'v3.0',
		title: same('Ludogram'),
		lines: [
			{ kind: '+', text: { en: 'Three commercial games.', fr: 'Trois jeux commerciaux.' } },
			{ kind: '-', text: { en: 'Sleep.', fr: 'Le sommeil.' } }
		]
	},
	{
		version: 'v3.x',
		title: { en: 'Side quests', fr: 'Quêtes secondaires' },
		lines: [
			{ kind: '+', text: same('Crazy Planet Survivor.') },
			{ kind: '+', text: same('Stixiva.') },
			{ kind: '+', text: same('Le Rongeur.') },
			{ kind: '!', text: { en: 'Free time: not found.', fr: `Temps libre${NBSP}: introuvable.` } }
		]
	}
];

/** §5 LOADOUT. Tints: legendary #D9A441, epic #A99AC9, rare #5B73FF, common var(--graphite). */
export const loadout: LoadoutItem[] = [
	{
		name: 'UE5 C++',
		rarity: 'legendary',
		tooltip: { en: 'The main weapon. Ships games.', fr: 'L’arme principale. Livre des jeux.' }
	},
	{
		name: 'Niagara',
		rarity: 'legendary',
		tooltip: {
			en: 'Used to put systems inside systems.',
			fr: 'Sert à mettre des systèmes dans des systèmes.'
		}
	},
	{
		name: 'Mass',
		rarity: 'legendary',
		tooltip: {
			en: 'Crowds by the hundred, on a navmesh.',
			fr: 'Des foules par centaines, sur navmesh.'
		}
	},
	{
		name: 'HLSL',
		rarity: 'legendary',
		tooltip: {
			en: 'Water, contours, anything per pixel.',
			fr: 'De l’eau, des contours, tout ce qui se joue au pixel.'
		}
	},
	{
		name: 'Unity DOTS/ECS',
		rarity: 'epic',
		tooltip: {
			en: 'Thousands of entities on a sphere.',
			fr: 'Des milliers d’entités sur une sphère.'
		}
	},
	{
		name: 'three.js',
		rarity: 'epic',
		tooltip: { en: 'This whole page.', fr: 'Toute cette page.' }
	},
	{
		name: 'Blueprint',
		rarity: 'epic',
		tooltip: {
			en: 'Fast iteration, wired to the C++.',
			fr: 'L’itération rapide, branchée sur le C++.'
		}
	},
	{
		name: 'Rust',
		rarity: 'rare',
		tooltip: { en: 'The core of Stixiva.', fr: 'Le cœur de Stixiva.' }
	},
	{
		name: 'Svelte/SvelteKit',
		rarity: 'rare',
		tooltip: { en: 'Le Rongeur, and this site.', fr: 'Le Rongeur, et ce site.' }
	},
	{
		name: 'TypeScript',
		rarity: 'rare',
		tooltip: { en: 'Wherever the web goes.', fr: 'Partout où va le web.' }
	},
	{
		name: 'Godot',
		rarity: 'rare',
		tooltip: { en: 'Where it all started.', fr: 'Là où tout a commencé.' }
	},
	{
		name: 'VFX Graph',
		rarity: 'rare',
		tooltip: { en: 'Unity’s answer to Niagara.', fr: 'La réponse de Unity à Niagara.' }
	},
	{
		name: 'Figma',
		rarity: 'common',
		tooltip: { en: 'Mock it before you build it.', fr: 'Maquetter avant de construire.' }
	},
	{
		name: 'Blender',
		rarity: 'common',
		tooltip: {
			en: 'Placeholder meshes with ambition.',
			fr: 'Des meshes temporaires qui ont de l’ambition.'
		}
	},
	{
		name: 'Substance',
		rarity: 'common',
		tooltip: {
			en: 'Textures, when the dither isn’t enough.',
			fr: 'Des textures, quand le tramage ne suffit plus.'
		}
	},
	{
		name: 'Node/Express',
		rarity: 'common',
		tooltip: { en: 'Backends that stay out of the way.', fr: 'Des backends qui se font oublier.' }
	},
	{
		name: 'FMOD',
		rarity: 'common',
		tooltip: { en: 'The sound of Crazy Planet Survivor.', fr: 'Le son de Crazy Planet Survivor.' }
	}
];

/** Page order: the three games, then the three side quests (drives `NEXT LEVEL →`). */
export const projects: readonly (Game | SideProject)[] = [...games, ...sideProjects];

export const projectSlugs: readonly ProjectSlug[] = projects.map((p) => p.slug);

export function projectBySlug(slug: string): Game | SideProject | undefined {
	return projects.find((p) => p.slug === slug);
}

export function isGame(p: Game | SideProject): p is Game {
	return 'releases' in p;
}

/** The project after `slug`, wrapping around. */
export function nextProject(slug: string): Game | SideProject {
	const i = projects.findIndex((p) => p.slug === slug);
	return projects[(i + 1) % projects.length];
}

/** A side project's stack in the visitor's language (product names stay as they are). */
export function stackOf(p: SideProject, lang: 'en' | 'fr'): string[] {
	return lang === 'fr' && p.stackFr ? p.stackFr : p.stack;
}
