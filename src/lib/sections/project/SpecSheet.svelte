<script lang="ts">
	/*
		SPEC SHEET (§5 "/projects/[slug]"): engine, role, team, platforms, status. Only what the
		content actually holds; empty fields are hidden, nothing is invented.
	*/
	import { i18n, fmtDate, loc, t } from '#lib/i18n/index.svelte';
	import { isGame, stackOf } from '#lib/content/content';
	import type { Game, SideProject } from '#lib/content/types';

	interface Props {
		project: Game | SideProject;
		/** Live release status (computed in the browser; the prerender shows the dates only). */
		status?: string;
	}

	let { project, status = '' }: Props = $props();

	interface Row {
		key: string;
		label: string;
		values: string[];
	}

	const rows = $derived.by((): Row[] => {
		const f = t().project.fields;
		const out: Row[] = [];
		const push = (key: string, label: string, values: (string | null | undefined)[]) => {
			const v = values.filter((x): x is string => !!x && x.trim().length > 0);
			if (v.length) out.push({ key, label, values: v });
		};
		if (isGame(project)) {
			push('role', f.role, [loc(project.role)]);
			push('engine', f.engine, [project.engine]);
			push('developer', f.developer, [project.developer]);
			push('publisher', f.publisher, [project.publisher]);
			push('platforms', f.platforms, [project.platforms.join(' · ')]);
			push(
				'release',
				f.release,
				project.releases.map((r) => `${loc(r.label)} — ${fmtDate(r.date, r.precision)}`)
			);
			push('status', f.status, [status]);
			push('reception', f.reception, [loc(project.reception)]);
		} else {
			push('status', f.status, [loc(project.status)]);
			push('stack', f.stack, [stackOf(project, i18n.lang).join(' · ')]);
		}
		return out;
	});
</script>

<div class="sheet">
	<p class="title hud-text">{t().project.specSheet}</p>
	<dl>
		{#each rows as row (row.key)}
			<div class="row">
				<dt class="hud-text graphite">{row.label}</dt>
				<dd class="hud-text">
					{#each row.values as value, i (i)}
						<span class="value">{value}</span>
					{/each}
				</dd>
			</div>
		{/each}
	</dl>
</div>

<style>
	.sheet {
		display: grid;
		gap: var(--s-2);
		align-content: start;
	}

	.title {
		padding-bottom: var(--s-1);
		border-bottom: 1px solid currentColor;
	}

	dl {
		margin: 0;
		display: grid;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(7.5rem, 0.42fr) 1fr;
		gap: var(--s-2);
		padding-block: 0.7rem;
		/* Dotted rule, the same 2px dot language as the links. */
		background: radial-gradient(circle, var(--hairline) 1px, transparent 1.4px) 0 100% / 6px 2px repeat-x;
	}

	dt {
		margin: 0;
	}

	dd {
		margin: 0;
		display: grid;
		gap: 0.25rem;
		color: var(--ink);
	}

	@media (max-width: 639px) {
		.row {
			grid-template-columns: 1fr;
			gap: 0.3rem;
		}
	}
</style>
