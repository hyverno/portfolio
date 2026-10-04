// Lock-on registry: the element the cursor's brackets are fitted to. The cursor (A4) writes it,
// `use:interact`'s E-key handler reads it.

export const lock = $state({ el: null as HTMLElement | null, verb: '' });

export function setLocked(el: HTMLElement | null): void {
	lock.el = el;
	lock.verb = el?.dataset.interact ?? '';
}

export function getLocked(): HTMLElement | null {
	return lock.el;
}
