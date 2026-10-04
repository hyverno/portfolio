// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Navigator {
		/** Chromium only (Device Memory API), in GiB. */
		readonly deviceMemory?: number;
	}
}

export {};
