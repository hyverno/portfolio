// Kit 3 reads every param matcher from this single entry. Node loads it directly at build time
// (type stripping), so relative imports need their `.ts` extension.
import { defineParams } from '@sveltejs/kit/params';
import { match as lang } from './lang.ts';

export const params = defineParams({ lang });
