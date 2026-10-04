// The three families (§2.2). Archivo + Martian Mono ship their width axis via `wdth.css`.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';

/** Hashed URL of the Archivo latin woff2: the only preloaded font. */
export { default as archivoLatinUrl } from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';

/** `document.fonts.load` descriptors for the boot report. */
export const FONT_PROBES = [
	'800 1em "Archivo Variable"',
	'450 1em "Martian Mono Variable"',
	'italic 400 1em "Instrument Serif"'
] as const;
