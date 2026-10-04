// DOM crumbs for the static build (no WebGL → no damage numbers): a handful of apricot dots
// thrown out of a bite, falling under gravity, then removed. Nothing runs under reduced motion.
import { gsap } from '#lib/core/motion';

let layer: HTMLDivElement | null = null;

function host(): HTMLDivElement {
	if (layer?.isConnected) return layer;
	layer = document.createElement('div');
	layer.setAttribute('aria-hidden', 'true');
	layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:45;overflow:hidden';
	document.body.appendChild(layer);
	return layer;
}

export function domCrumbs(x: number, y: number, count: number, color = '#F2894B'): void {
	const root = host();
	for (let i = 0; i < count; i++) {
		const d = document.createElement('span');
		const size = 4 + Math.random() * 4;
		d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;background:${color}`;
		root.appendChild(d);
		const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
		const v = 70 + Math.random() * 90;
		const dx = Math.cos(a) * v;
		gsap
			.timeline({ onComplete: () => d.remove() })
			.to(d, { x: dx, duration: 0.9, ease: 'none' }, 0)
			.to(d, { y: Math.sin(a) * v * 0.6 - 60, duration: 0.3, ease: 'power2.out' }, 0)
			.to(d, { y: 140 + Math.random() * 60, duration: 0.6, ease: 'power2.in' }, 0.3)
			.to(d, { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0.7);
	}
}
