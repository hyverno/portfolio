/**
 * Dictionnaire français. Même forme que `en.ts` (vérifié par `satisfies Dict`).
 * Typographie : espace insécable (NBSP) avant « : », espace fine insécable (NNBSP) avant ; ! ? %
 * et dans les guillemets, NNBSP comme séparateur de milliers (16 384). Ces espaces sont écrits
 * via les constantes ci-dessous pour rester visibles dans le code.
 */
import { NBSP, NNBSP } from './format';
import type { Dict } from './types';

export default {
	nav: {
		aria: 'Sections',
		skip: 'Aller au contenu',
		home: 'Hyverno, retour en haut',
		items: [
			{ id: 'shipped', label: 'JEUX' },
			{ id: 'side-quests', label: 'QUÊTES SECONDAIRES' },
			{ id: 'lab', label: 'LABO' },
			{ id: 'contact', label: 'CONTACT' }
		]
	},

	hud: {
		buildTag: 'HYVERNO /SIM v3.0',
		labels: {
			ent: 'ENTITÉS',
			fps: 'I/S',
			ms: 'MS',
			budget: '/ 16,6 MS',
			unitsSelected: 'UNITÉS SÉLECTIONNÉES',
			numbersDrawn: 'NOMBRES AFFICHÉS',
			trophies: 'TROPHÉES',
			view: 'VUE',
			dynamicQuality: 'QUALITÉ DYNAMIQUE'
		},
		stats: (ent: string, fps: string, ms: string) =>
			`${ent} ENTITÉS · ${fps} I/S · ${ms} / 16,6 MS`,
		budgetAria: (ms: string) => `Temps de frame${NBSP}: ${ms} sur 16,6 millisecondes`,
		selected: (n: string) => `${n} UNITÉS SÉLECTIONNÉES`,
		numbersDrawn: (n: string) => `${n} NOMBRES AFFICHÉS`,
		trophies: (n: string, total: string) => `TROPHÉES ${n}/${total}`,
		quality: (q: string) => `QUALITÉ DYNAMIQUE${NBSP}: ${q}`,
		context: (index: string, name: string, extra?: string) =>
			extra ? `${index} · ${name} — ${extra}` : `${index} · ${name}`,
		ruler: (y: string) => `Y ${y}`,
		viewModes: { 1: 'ÉCLAIRÉ', 2: 'DENSITÉ', 3: 'DEBUG', 4: 'IDS' },
		viewAria: 'Mode de vue',
		viewKey: (n: string, name: string) => `Vue ${n}${NBSP}: ${name}`,
		debug: {
			drawCalls: 'DRAW CALLS',
			simMs: 'SIM MS',
			renderMs: 'RENDU MS',
			programs: 'PROGRAMMES',
			cpu: 'CPU',
			gpu: 'GPU'
		},
		sfx: { on: 'SFX ON', off: 'SFX OFF', aria: 'Effets sonores' },
		lang: {
			label: 'EN / FR',
			short: 'EN',
			switch: 'English version'
		},
		settingsAria: 'Réglages',
		trophy: {
			prefix: 'SUCCÈS',
			unlocked: 'SUCCÈS DÉBLOQUÉ',
			ultra: 'ULTRA RARE',
			progress: (n: string, max: string) => `${n}/${max}`,
			gnawed: 'GRIGNOTÉ',
			locked: 'VERROUILLÉ'
		}
	},

	boot: {
		aria: 'Chargement de la simulation',
		stages: {
			spawn: 'APPARITION DES ENTITÉS',
			compile: 'COMPILATION DES SHADERS',
			bake: 'PRÉCALCUL DES FORMATIONS',
			ready: 'PRÊT'
		},
		counter: (n: string, total: string) => `${n} / ${total}`,
		log: {
			webgl: (maxTex: string, dpr: string) => `WEBGL2 OK · MAX_TEX ${maxTex} · DPR ${dpr}`,
			floatRT: (kind: string) => `FLOAT RT ${kind}`,
			tier: (tier: string, n: string) => `PALIER ${tier} · ${n} ENTITÉS`,
			fonts: (n: string, ms: string) => `POLICES ${n} OK ${ms}MS`,
			compile: (name: string, ms: string) => `COMPILE ${name} OK ${ms}MS`,
			bake: (id: string, ms: string) => `PRÉCALCUL ${id} · HILBERT ${ms}MS`,
			firstFrame: (ms: string) => `PREMIÈRE FRAME ${ms}MS`,
			joke: 'PRÉCHAUFFAGE DU CACHE PSO… JE RIGOLE, ON EST SUR LE WEB',
			resumed: 'SESSION REPRISE · DÉMARRAGE COURT',
			reduced: 'ANIMATIONS RÉDUITES · PRESET STILL',
			noWebgl: 'WEBGL2 INDISPONIBLE · VERSION STATIQUE',
			ready: 'PRÊT'
		}
	},

	hero: {
		index: '01 / HYVERNO',
		hud: 'HYVERNO',
		name: 'HYVERNO',
		role: 'Programmeur gameplay & artiste technique',
		lede: {
			pre: 'Programmeur gameplay & artiste technique. Je fais bouger des milliers de choses à 60 i/s, et avec ',
			em: 'goût',
			post: '.'
		},
		hint: 'GLISSEZ POUR SÉLECTIONNER · CLIQUEZ POUR PINGUER · [3] POUR VOIR L’ENVERS DU DÉCOR',
		hintTouch: 'TOUCHEZ POUR PINGUER · DÉFILEZ POUR JOUER',
		scroll: 'DÉFILER',
		canvas: (n: string) =>
			`${n} points d’encre écrivent le nom HYVERNO. Ils s’écartent sur le passage du curseur, puis reprennent leur place.`
	},

	readme: {
		index: '02 / README',
		hud: 'README',
		statement: {
			pre: 'J’ai commencé avec un seul sprite. Puis deux mille soldats répliqués. Puis des millions de chiffres de dégâts. Les ',
			em: 'effectifs',
			post: ' n’arrêtent pas de grimper. Le temps de frame, lui, ne bouge pas.'
		},
		statsAria: 'En chiffres',
		canvas:
			'Une nuée de points vient habiller chaque ligne au moment où elle apparaît, puis se disperse.'
	},

	shipped: {
		index: '03 / LIVRÉS · LUDOGRAM',
		hud: 'LIVRÉS',
		headline: { pre: '', em: 'Livrés.', post: ' Sur Steam. Avec les avis et tout le tralala.' },
		studio: 'LUDOGRAM · STUDIO INDÉPENDANT · LILLE',
		labels: {
			role: 'RÔLE',
			developer: 'DÉVELOPPEUR',
			publisher: 'ÉDITEUR',
			platforms: 'PLATEFORMES',
			release: 'SORTIE',
			reception: 'ACCUEIL'
		},
		specSheet: 'FICHE TECHNIQUE →',
		steam: 'PAGE STEAM ↗',
		ticker: (i: string, n: string) => `${i}/${n}`,
		slotAria: (i: string, n: string, title: string) => `Jeu ${i} sur ${n}${NBSP}: ${title}`,
		mediaHint: 'SURVOLEZ POUR COLORISER',
		peon: {
			label: (id: string) => `PÉON #${id} (JETABLE)`,
			deployed: (n: string) => `PÉONS DÉPLOYÉS${NBSP}: ${n}`,
			aria: 'Sacrifier le péon'
		},
		pack: { rare: 'TIRAGE RARE', aria: 'Ouvrir un booster mystère' },
		dice: {
			hope: 'ESPOIR',
			horror: 'HORREUR',
			nat20: '20 NATUREL',
			nat1: 'ÉCHEC CRITIQUE',
			result: (n: string, outcome: string) => `${n} au dé${NBSP}: ${outcome}`,
			tapHint: 'TOUCHEZ POUR LANCER',
			aria: 'Lancer le d20',
			ghost: (player: string, ms: string) => `${player} · RTT ${ms}MS`
		},
		canvas: {
			'monsters-are-coming':
				'Des points forment une ville sur pilotis qui marche, une horde de points à ses trousses, et un péon orange.',
			'tabletop-game-shop-simulator': `Des points s’alignent en étagères de figurines grises${NNBSP}; un balayage en diagonale les peint en cinq couleurs.`,
			invokyr: 'Des points dessinent les arêtes d’un dé à vingt faces qui tourne sur lui-même.'
		}
	},

	sideQuests: {
		index: '04 / QUÊTES SECONDAIRES',
		hud: 'QUÊTES SECONDAIRES',
		headline: { pre: 'Codées après le boulot. ', em: 'Livrées', post: ' quand même.' },
		canvas: 'Trois losanges faits de points, un par projet, reliés par des pointillés.'
	},

	planet: {
		index: '04a / CRAZY PLANET SURVIVOR',
		hud: 'CRAZY PLANET',
		panels: ['LE PITCH', 'LA STACK', 'LA FRIME'],
		biomes: { earth: 'TERRE', ice: 'GLACE' },
		biomeAria: 'Biome',
		cast: 'CLIQUEZ POUR LANCER UN SORT',
		castTouch: 'TOUCHEZ POUR LANCER UN SORT',
		keys: `ESPACE${NBSP}: SORT · ←/→${NBSP}: ROTATION`,
		disclaimer: 'Recréation web en three.js. L’original tourne sous DOTS.',
		hudLine: (ent: string, craters: string, max: string, biome: string) =>
			`ENTITÉS SUR LA SPHÈRE ${ent} · CRATÈRES ${craters}/${max} · BIOME ${biome}`,
		orbit: { craters: 'CRATÈRES', ent: 'ENT.' },
		canvas: `Une petite planète à l’encre, striée de courbes de niveau. Une horde de petits cônes y poursuit un point rouge${NNBSP}; chaque sort laisse un cratère.`
	},

	stixiva: {
		index: '04b / STIXIVA',
		hud: 'STIXIVA',
		toolbar: ['Atelier', 'Palette de fils', 'Grille', 'Exporter le PDF'],
		joke: 'Interface en français. Pour une fois, pas besoin de traduire.',
		dither: { on: 'TRAMAGE ON', off: 'TRAMAGE OFF' },
		legend: 'LÉGENDE',
		cellTip: (n: string, name: string, count: string) => `FIL ${n} · ${name} · ×${count} POINTS`,
		pdf: { verb: 'EXPORT PDF', preview: 'APERÇU / PREVIEW', close: 'FERMER' },
		pro: 'Version Pro en préparation.',
		chartAria: 'Grille de point de croix, un symbole par couleur de fil',
		canvas:
			'Une grille de points dessine une rose à cinq pétales. Une ligne de balayage la traverse et change chaque point en point de croix coloré.'
	},

	rongeur: {
		index: '04c / LE RONGEUR',
		hud: 'LE RONGEUR',
		headline: 'IL RONGE LES PRIX.',
		sub: 'Jusqu’à la dernière miette.',
		line: 'Pépite épluche les flux officiels pour que vous ne payiez jamais trop.',
		exampleLabel: 'PRIX EXEMPLE / EXAMPLE PRICE',
		stamp: (pct: string) => `RONGÉ −${pct}${NNBSP}%`,
		merchants: `FLUX OFFICIELS${NBSP}: EBAY · FNAC · DARTY · …`,
		priceAria: (price: string) => `Prix d’exemple${NBSP}: ${price}`,
		bite: {
			hint: 'CLIQUEZ SUR LE PRIX POUR CROQUER',
			hintTouch: 'TOUCHEZ LE PRIX POUR CROQUER',
			left: (n: string) => `ENCORE ${n} BOUCHÉES`,
			aria: 'Croquer le prix'
		},
		pepite: 'Pépite, la mascotte du Rongeur, les joues pleines de bons plans',
		canvas: 'Des points abricot filent depuis les noms des marchands jusqu’aux joues de Pépite.'
	},

	lab: {
		index: '05 / LABO',
		hud: 'LABO',
		headline: { pre: 'Ça ne devrait pas tourner aussi vite. Et ', em: 'pourtant', post: '.' },
		toolbar: ['PERSPECTIVE', 'ÉCLAIRÉ', 'TEMPS RÉEL'],
		recreation: 'RECRÉATION WEB',
		recreationTip: (original: string) => `Recréation web. Original${NBSP}: ${original}.`,
		spec: { original: 'ORIGINAL', tags: 'TAGS', metric: 'MESURE' },
		cellAria: (title: string) => `${title}, recréation web interactive`,
		still: 'IMAGE FIXE · WEBGL OFF',
		paused: 'EN PAUSE',
		crowd: {
			hud: (n: string, depth: string) => `${n} AGENTS · QUADTREE PROFONDEUR ${depth}`,
			toggle: '[Q] QUADTREE'
		},
		numbers: {
			hint: 'MAINTENEZ POUR SPAWNER. ÇA NE BRONCHE PAS.',
			hud: (n: string, calls: string, ms: string) =>
				`À L’ÉCRAN ${n} · DRAW CALLS ${calls} · JS ${ms} MS`
		},
		nested: {
			hud: (n: string) => `${n} POINTS GPU`,
			graph: ['Spawn', 'Update', 'Emitter[child]', 'Render']
		},
		navmesh: {
			hud: (n: string) => `${n} AGENTS · CHAMP DE FLUX 48×27`,
			hint: 'BOUGEZ POUR PLACER LA CIBLE'
		},
		water: { steepness: 'CAMBRURE Q', wavelength: 'LONGUEUR D’ONDE' },
		replication: {
			server: 'SERVEUR',
			client: 'CLIENT',
			latency: 'LATENCE',
			interp: { on: 'INTERP ON', off: 'INTERP OFF' },
			lobby: 'LOBBY',
			inventory: 'INVENTAIRE'
		},
		canvas:
			'Six viewports d’éditeur en direct. Les points de la page défilent au pas dans les gouttières.'
	},

	contracts: {
		index: '06 / CONTRATS',
		hud: 'CONTRATS',
		headline: 'Les groupes que j’ai rejoints.',
		columns: { client: 'CLIENT', role: 'RÔLE', stack: 'STACK', status: 'STATUT' },
		done: '✓',
		doneAria: 'Terminé',
		none: '—',
		community: {
			title: 'JOURNAL COMMUNAUTAIRE',
			columns: { name: 'NOM', what: 'QUOI', when: 'QUAND' }
		}
	},

	patch: {
		index: '07 / PATCH NOTES',
		hud: 'PATCH NOTES',
		headline: 'Patch notes',
		version: 'VERSION',
		kinds: { '+': 'Ajouté', '~': 'Modifié', '-': 'Retiré', '!': 'Problème connu' },
		footer: `Problème connu${NBSP}: impossible d’arrêter d’optimiser.`,
		canvas:
			'Des points descendent la frise comme sur un tapis roulant et se regroupent à chaque version.',
		loadout: {
			title: 'ÉQUIPEMENT',
			aria: 'Inventaire des compétences',
			rarities: { legendary: 'LÉGENDAIRE', epic: 'ÉPIQUE', rare: 'RARE', common: 'COMMUN' },
			tooltip: (name: string, rarity: string, line: string) => `${name}${NBSP}: ${rarity}. ${line}`,
			rarityNames: { legendary: 'Légendaire', epic: 'Épique', rare: 'Rare', common: 'Commun' }
		}
	},

	contact: {
		index: '08 / APPUYEZ SUR START',
		hud: 'APPUYEZ SUR START',
		headline: {
			pre: 'Besoin de quelqu’un qui livre des systèmes ',
			em: 'et',
			post: ` qui les rend beaux${NNBSP}? Appuyez sur Start.`
		},
		lobby: {
			aria: 'Lobby coop',
			slot: (n: string) => `J${n}`,
			host: 'HYVERNO',
			you: 'VOUS',
			ready: 'PRÊT',
			pressStart: 'APPUYEZ SUR START',
			empty: '[ LIBRE ]'
		},
		email: 'E-MAIL',
		copy: {
			aria: 'Copier l’adresse e-mail',
			done: 'COPIÉ · +50 XP',
			failed: 'COPIE BLOQUÉE · SÉLECTIONNEZ À LA MAIN'
		},
		cta: 'APPUYEZ SUR START',
		recruit: 'RECRUTER CETTE UNITÉ',
		recruitSubject: `Recrutement${NBSP}: gameplay / tech art`,
		socials: { aria: 'Ailleurs', github: 'GitHub', linkedin: 'LinkedIn', steam: 'Steam' },
		respawn: 'RESPAWN ↑',
		respawnAria: 'Retour en haut',
		footer: (n: string) =>
			`Fait avec SvelteKit, three.js et GSAP. ${n} entités simulées. Aucun widget UMG n’a été maltraité.`,
		canvas:
			'Des points encerclent le lobby, puis descendent reconstruire le nom HYVERNO en bas de page.'
	},

	achievements: {
		'first-blood': {
			title: 'PREMIER SANG',
			line: 'Vous avez pingué la foule. Elle vous a répondu.'
		},
		'crowd-control': {
			title: 'CONTRÔLE DE FOULE',
			line: `500 unités sélectionnées, minimum. Micro${NBSP}: impeccable.`
		},
		wireframe: { title: 'ACCRO AU FILAIRE', line: 'Vous avez ouvert la vue Debug.' },
		crit: { title: 'COUP CRITIQUE', line: 'Vous avez fait un 20 naturel.' },
		'planet-breaker': {
			title: 'BRISEUR DE PLANÈTES',
			line: 'Huit cratères. La physique a été consultée.'
		},
		'cross-stitch': {
			title: 'CROIX DE BOIS, CROIX DE FER',
			line: 'Un motif complet, point par point.'
		},
		'cheeks-full': { title: 'JOUES PLEINES', line: 'Pépite vous dit merci, la bouche pleine.' },
		'bullet-hell': {
			title: 'BULLET HELL',
			line: `20${NNBSP}000 nombres à l’écran. Toujours 60 i/s.`
		},
		networking: { title: 'RÉSEAUTAGE', line: 'E-mail copié.' },
		completionist: { title: 'COMPLÉTIONNISTE', line: 'Vous avez touché le fond. Du site.' },
		'dev-mode': {
			title: `#1${NNBSP}445 · MODE DÉVELOPPEUR`,
			line: `Ses 1${NNBSP}444 succès Steam, plus vous.`
		}
	},

	status: {
		notFound: 'Entité introuvable. Elle a dû despawn.',
		noWebgl: 'Votre GPU s’est fait porter pâle. Voici la version statique.',
		reducedMotion: `Simulation en pause${NBSP}: animations réduites. Tout est encore là.`,
		contextLost: 'CONTEXTE GPU PERDU · VERSION STATIQUE',
		governor: (q: string) => `QUALITÉ DYNAMIQUE${NBSP}: ${q}. L’HONNÊTETÉ, C’EST UNE FEATURE.`,
		release: {
			outNow: 'DISPONIBLE',
			earlyAccess: 'ACCÈS ANTICIPÉ',
			launch: 'SORTIE',
			inDays: (what: string, n: string) => `${what} DANS ${n} JOURS`,
			tomorrow: (what: string) => `${what} DEMAIN`,
			on: (what: string, date: string) => `${what} ${date}`
		}
	},

	fallback: {
		hero: 'Le nom HYVERNO composé en points de trame.',
		city: 'Dessin au trait d’une ville sur pilotis qui fuit une horde.',
		shelves: 'Dessin au trait de trois étagères garnies de figurines peintes.',
		d20: 'Dessin au trait d’un dé à vingt faces.',
		planet: 'Dessin d’une petite planète avec courbes de niveau, cratères et points en orbite.',
		stixiva: 'Une grille de point de croix, en version fixe.',
		lab: 'Image fixe de la démo. WebGL est indisponible, elle ne tourne donc pas ici.'
	},

	settings: {
		title: 'RÉGLAGES',
		open: 'Ouvrir les réglages',
		close: 'FERMER',
		quality: 'QUALITÉ',
		qualities: { AUTO: 'AUTO', LOW: 'BASSE', MED: 'MOY.', HIGH: 'HAUTE' },
		motion: 'ANIMATIONS',
		motions: { full: 'COMPLÈTES', reduced: 'RÉDUITES' },
		toasts: 'NOTIFICATIONS',
		sound: 'SFX',
		on: 'ON',
		off: 'OFF',
		language: 'LANGUE',
		stats: 'STATS',
		sections: 'SECTIONS'
	},

	cursor: {
		prompt: (verb: string) => `[E] ${verb}`,
		verbs: {
			roll: 'LANCER',
			bite: 'CROQUER',
			copy: 'COPIER',
			run: 'JOUER',
			open: 'OUVRIR',
			cast: 'INCANTER',
			select: 'SÉLECTIONNER',
			toggle: 'BASCULER',
			spec: 'FICHE TECHNIQUE',
			openPack: 'OUVRIR LE BOOSTER',
			despawn: 'SACRIFIER',
			export: 'EXPORT PDF',
			start: 'START',
			respawn: 'RESPAWN',
			next: 'NIVEAU SUIVANT'
		},
		enter: '[ ENTRÉE ]',
		readout: (x: string, y: string) => `X ${x} Y ${y}`
	},

	notFound: {
		code: '404',
		label: 'ERR_ENTITY_NOT_FOUND',
		title: 'Entité introuvable. Elle a dû despawn.',
		respawn: 'RESPAWN',
		home: 'Retour au point d’apparition'
	},

	project: {
		specSheet: 'FICHE TECHNIQUE',
		fields: {
			engine: 'MOTEUR',
			role: 'RÔLE',
			team: 'ÉQUIPE',
			developer: 'DÉVELOPPEUR',
			publisher: 'ÉDITEUR',
			platforms: 'PLATEFORMES',
			release: 'SORTIE',
			reception: 'ACCUEIL',
			status: 'STATUT',
			stack: 'STACK'
		},
		next: 'NIVEAU SUIVANT →',
		back: '← RETOUR À LA CARTE',
		steam: 'PAGE STEAM ↗',
		media: 'Emplacement média'
	},

	meta: {
		title: 'Hyverno · Programmeur gameplay & artiste technique',
		description:
			'Hyverno, programmeur gameplay et artiste technique. Trois jeux sortis avec Ludogram, des foules sur GPU, des chiffres de dégâts et des quêtes secondaires, le tout en direct dans la page.',
		ogAlt: 'HYVERNO écrit par des milliers de points d’encre sur papier chaud.',
		project: (name: string) => `${name} · Hyverno`,
		notFound: 'Entité introuvable · Hyverno'
	}
} satisfies Dict;
