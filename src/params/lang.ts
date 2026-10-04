// `[[lang=lang]]`: the only non-default language is French; English lives at the root.
// Kit 3 matchers return the parsed value, or `undefined` for "no match".
export function match(param: string): 'fr' | undefined {
	return param === 'fr' ? 'fr' : undefined;
}
