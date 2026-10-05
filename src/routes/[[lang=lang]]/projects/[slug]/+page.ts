import { error } from '@sveltejs/kit';
import { projectBySlug, projectSlugs } from '#lib/content/content';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

// Every project, in English (`/projects/x`) and French (`/fr/projects/x`).
export const entries: EntryGenerator = () =>
	projectSlugs.flatMap((slug) => [{ slug }, { lang: 'fr', slug }]);

export const load: PageLoad = ({ params }) => {
	const project = projectBySlug(params.slug);
	if (!project) error(404, 'Entity not found');
	return { slug: project.slug };
};
