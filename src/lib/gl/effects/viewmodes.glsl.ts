// Shaders for view modes [2] DENSITY and [3] DEBUG (§S4). Every pass honours MASK_GLSL so the
// mode switch can sweep the new mode in from the top.
import { BAYER } from '../glsl/bayer';
import { COBALT_GLSL, MASK_GLSL } from './overlay';

/**
 * [2] DENSITY: the density RT through the ramp paper → apricot → signal → ink, quantised to those
 * four inks with a 4×4 Bayer dither. Paper is left transparent: the page itself is the paper.
 */
export const DENSITY_FRAG = /* glsl */ `
uniform sampler2D uDensity;
uniform float uNorm;
uniform float uGain;
uniform float uDitherPx;
uniform vec3 uApricot;
uniform vec3 uSignal;
uniform vec3 uInk;
${MASK_GLSL}
${BAYER}
void main() {
	if (screenMask() < 0.5) discard;
	float d = texture2D(uDensity, gl_FragCoord.xy / uResolution).r * uNorm;
	// Soft-knee compression: sparse crowds still register, packed ones saturate into ink.
	float t = 1.0 - exp(-max(d, 0.0) * uGain);
	// A small dead zone keeps stray single entities from peppering the page with apricot.
	float s = clamp((t - 0.06) / 0.94, 0.0, 1.0) * 3.0;
	float level = floor(s);
	level += step(bayer4(gl_FragCoord.xy / uDitherPx), s - level);
	if (level < 0.5) discard;
	vec3 col = level < 1.5 ? uApricot : (level < 2.5 ? uSignal : uInk);
	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}
`;

/**
 * [3] DEBUG quadtree: a real adaptive quadtree evaluated per pixel. Square cells (side = the long
 * edge of the canvas / 2^L) split while they hold more than uThreshold of the whole crowd:
 *   share = cell mean (mip at the cell's size) / screen mean (top mip) × cell area / screen area.
 * The ratio is self-normalising, so splat amplitude and the RGBA8 ×.25 fallback cancel out.
 * Each pixel draws the left/top edges of its deepest cell, which covers every shared edge exactly
 * once whatever the neighbour's depth.
 * Without mipmaps it falls back to a fixed 32px grid whose lines fade in with the local density.
 */
export const QUADTREE_FRAG = /* glsl */ `
uniform sampler2D uDensity;
uniform float uNorm;
uniform float uDensitySize;
uniform float uThreshold;
uniform float uMipmaps;
uniform float uDpr;
uniform vec3 uPaper;
${MASK_GLSL}
${COBALT_GLSL}

const int MAX_DEPTH = 7;

vec2 toUv(vec2 pTopLeft) {
	return vec2(pTopLeft.x / uResolution.x, 1.0 - pTopLeft.y / uResolution.y);
}

void main() {
	if (screenMask() < 0.5) discard;
	vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
	float line = uDpr;
	float alpha;
	float cell;

	if (uMipmaps > 0.5) {
		float total = textureLod(uDensity, vec2(0.5), log2(uDensitySize)).r;
		if (total <= 1e-6) discard;
		float side = max(uResolution.x, uResolution.y);
		float texelsPerPx = uDensitySize / min(uResolution.x, uResolution.y);
		float screenArea = uResolution.x * uResolution.y;
		float depth = 0.0;
		for (int L = 0; L < MAX_DEPTH; L++) {
			float c = side / exp2(float(L));
			vec2 centre = (floor(p / c) + 0.5) * c;
			float lod = log2(max(c * texelsPerPx, 1.0));
			float share = textureLod(uDensity, toUv(centre), lod).r / total * (c * c / screenArea);
			if (share <= uThreshold) break;
			depth = float(L + 1);
		}
		if (depth < 0.5) discard;
		cell = side / exp2(depth);
		// Deeper cells draw lighter, so packed clumps read as a fine mesh rather than a blot.
		alpha = mix(0.8, 0.45, (depth - 1.0) / float(MAX_DEPTH - 1));
	} else {
		cell = 32.0 * uDpr;
		vec2 centre = (floor(p / cell) + 0.5) * cell;
		float d = texture2D(uDensity, toUv(centre)).r * uNorm;
		alpha = 0.72 * smoothstep(0.05, 0.4, d);
		if (alpha < 0.01) discard;
	}

	vec2 local = mod(p, cell);
	float edge = max(step(local.x, line - 0.001), step(local.y, line - 0.001));
	if (edge < 0.5) discard;
	gl_FragColor = vec4(cobaltFor(uPaper), alpha);
	#include <colorspace_fragment>
}
`;

/**
 * [3] DEBUG velocity vectors: LineSegments over every 4th entity. 'position' carries the sim
 * texel (u, v) and the segment end (0 = tail at pos, 1 = tip at pos + vel * uScale).
 */
export const VELOCITY_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uAspect;
uniform float uScale;
varying float vEnd;
varying float vSpeed;
void main() {
	vec4 p = texture2D(uPos, position.xy);
	vec4 v = texture2D(uVel, position.xy);
	vec2 w = p.xy + v.xy * uScale * position.z;
	vEnd = position.z;
	vSpeed = length(v.xy);
	gl_Position = vec4(w.x / uAspect, w.y, 0.0, 1.0);
}
`;

export const VELOCITY_FRAG = /* glsl */ `
uniform vec3 uPaper;
varying float vEnd;
varying float vSpeed;
${MASK_GLSL}
${COBALT_GLSL}
void main() {
	if (screenMask() < 0.5 || vSpeed < 0.02) discard;
	gl_FragColor = vec4(cobaltFor(uPaper), mix(0.18, 0.85, vEnd));
	#include <colorspace_fragment>
}
`;

/** The sweep's leading edge: a 2px signal scanline at uY (top → bottom fraction). */
export const SCANLINE_FRAG = /* glsl */ `
uniform vec2 uResolution;
uniform float uY;
uniform float uDpr;
uniform vec3 uSignal;
void main() {
	float y = uResolution.y - gl_FragCoord.y;
	if (abs(y - uY * uResolution.y) > uDpr) discard;
	gl_FragColor = vec4(uSignal, 1.0);
	#include <colorspace_fragment>
}
`;
