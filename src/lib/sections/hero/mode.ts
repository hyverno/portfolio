// One rule shared by the hero and the README anchor: the Width March (pin + scrub) only runs on a
// fine-pointer desktop without reduced motion. Everything else lands straight in `hero-tall`.
import type { MotionContext } from '#lib/core/motion';

export type HeroMode = 'march' | 'tall';

export function heroMode(c: MotionContext): HeroMode {
	return c.desktop && !c.coarse && !c.reduced ? 'march' : 'tall';
}
