// Ink Swarm quad (§3.7): the crowd's density thresholded into solid ink.
//   alpha = smoothstep(.35, .6, density * uInkGain + uFloor * .6), Bayer-dithered on the edge band.
// uFloor (0..1) guarantees a solid cover even where the crowd has not arrived yet: the last gaps
// close as an ordered-dither fade instead of a flat alpha ramp.
// uFade > 0 switches to the reduced-motion path: a flat ink quad at that opacity, no dither.
import { BAYER } from '../glsl/bayer';

export const INK_FRAG = /* glsl */ `
uniform sampler2D uDensity;
uniform vec2 uResolution;
uniform float uInkGain;
uniform float uFloor;
uniform float uFade;
uniform float uDitherPx;
uniform vec3 uInk;
${BAYER}
void main() {
	if (uFade > 0.0) {
		gl_FragColor = vec4(uInk, uFade);
		#include <colorspace_fragment>
		return;
	}
	float d = texture2D(uDensity, gl_FragCoord.xy / uResolution).r;
	float a = smoothstep(0.35, 0.6, d * uInkGain + uFloor * 0.6);
	if (dither(a, gl_FragCoord.xy / uDitherPx) < 0.5) discard;
	gl_FragColor = vec4(uInk, 1.0);
	#include <colorspace_fragment>
}
`;
