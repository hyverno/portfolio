// Global keyboard routing. One window listener; inputs, textareas, selects and contenteditable
// regions never trigger shortcuts unless a handler explicitly opts in.

export const KONAMI: string[] = [
	'ArrowUp',
	'ArrowUp',
	'ArrowDown',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowLeft',
	'ArrowRight',
	'b',
	'a'
];

interface Binding {
	key: string;
	fn: (e: KeyboardEvent) => void;
	allowInInputs: boolean;
}

const bindings = new Set<Binding>();
const sequences = new Set<{ seq: string[]; fn: () => void }>();
/** Recent keys, newest last; long enough for the longest registered sequence. */
let history: string[] = [];
let historyMax = 0;
let listening = false;

/** Single characters compare case-insensitively ('e' matches 'E'); named keys compare exactly. */
const norm = (k: string) => (k.length === 1 ? k.toLowerCase() : k);

export function isEditable(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (tag !== 'INPUT') return false;
	const type = (target as HTMLInputElement).type;
	return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file', 'image'].includes(type);
}

function onKeydown(e: KeyboardEvent) {
	if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
	const key = norm(e.key);
	const editable = isEditable(e.target);

	if (!editable && sequences.size && !e.repeat) {
		history.push(key);
		if (history.length > historyMax) history.shift();
		for (const s of sequences) {
			const start = history.length - s.seq.length;
			if (start >= 0 && s.seq.every((k, i) => history[start + i] === k)) {
				history = [];
				s.fn();
				break;
			}
		}
	}

	for (const b of bindings) {
		if (b.key !== key || (editable && !b.allowInInputs)) continue;
		b.fn(e);
	}
}

function listen() {
	if (listening || typeof window === 'undefined') return;
	listening = true;
	window.addEventListener('keydown', onKeydown);
}

export function onKey(
	key: string,
	fn: (e: KeyboardEvent) => void,
	o: { allowInInputs?: boolean } = {}
): () => void {
	listen();
	const b: Binding = { key: norm(key), fn, allowInInputs: !!o.allowInInputs };
	bindings.add(b);
	return () => bindings.delete(b);
}

/** Fires `fn` when `seq` is typed in order (never while typing in a field). */
export function onSequence(seq: string[], fn: () => void): () => void {
	listen();
	const s = { seq: seq.map(norm), fn };
	historyMax = Math.max(historyMax, seq.length);
	sequences.add(s);
	return () => sequences.delete(s);
}
