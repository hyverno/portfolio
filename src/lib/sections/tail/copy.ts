// Strings S-tail needs that the stage-1 dictionary does not have. Render with `loc()`.
// French is written natively (typography: NBSP before ':', NNBSP before ; ! ? and %).
import type { L } from '#lib/content/types';
import { NBSP } from '#lib/i18n/format';

export const COPY = {
	/** Contracts: the hidden caption of the quest log. */
	ledgerCaption: {
		en: 'Contracts: client, role, stack and status.',
		fr: `Contrats${NBSP}: client, rôle, stack et statut.`
	},
	communityCaption: {
		en: 'Community log: name, what and when.',
		fr: `Journal communautaire${NBSP}: nom, quoi et quand.`
	},
	/** Patch notes: the inventory hint under the slots. */
	loadoutHint: {
		en: 'HOVER OR FOCUS A SLOT TO INSPECT IT',
		fr: 'SURVOLEZ OU SÉLECTIONNEZ UN EMPLACEMENT POUR L’INSPECTER'
	},
	loadoutHintTouch: {
		en: 'TAP A SLOT TO INSPECT IT',
		fr: 'TOUCHEZ UN EMPLACEMENT POUR L’INSPECTER'
	},
	inspect: { en: 'INSPECT', fr: 'INSPECTER' },
	/** Contact: HUD context line, `LOBBY 1/4`. */
	lobby: { en: 'LOBBY', fr: 'LOBBY' },
	/** Footer end screen: the despawn counter's stage label. */
	alive: { en: 'ENTITIES ALIVE', fr: 'ENTITÉS EN VIE' },
	despawning: { en: 'DESPAWNING ENTITIES', fr: 'DISPARITION DES ENTITÉS' },
	despawned: { en: 'ALL ENTITIES DESPAWNED', fr: 'TOUTES LES ENTITÉS ONT DISPARU' },
	/** Footer end screen: session readout (every value measured). */
	session: { en: 'SESSION', fr: 'SESSION' },
	numbers: { en: 'NUMBERS DRAWN', fr: 'NOMBRES AFFICHÉS' },
	trophies: { en: 'TROPHIES', fr: 'TROPHÉES' }
} satisfies Record<string, L>;
