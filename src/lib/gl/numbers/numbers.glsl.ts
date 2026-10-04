// GPU damage numbers (§S3). One instanced quad per number; all motion is a pure function of age,
// so the CPU only writes a number once, when it spawns.
//
// Per-instance attributes:
//   aSpawn (x, y, t0)            origin in px (y down, relative to the target) and spawn time, s
//   aValue                       integer value (already ×2.5 for crits)
//   aFlags (crit, chars, glyph)  crit 0/1, characters in the quad (digits + '!'), glyph 0 digits / 1 dot
//   aVel   (vx, vy, g, rgb)      px/s, px/s², packed sRGB8 colour + 1 (0 = theme colour)
import { CELL_H, CELL_W, GLYPHS, GLYPH_BANG, GLYPH_DOT } from './atlas';

const f = (n: number) => n.toFixed(4);

export const NUMBERS_VERT = /* glsl */ `
attribute vec3 aSpawn;
attribute float aValue;
attribute vec3 aFlags;
attribute vec4 aVel;

uniform float uTime;
uniform float uLife;
uniform vec2 uViewport;
uniform float uSize;
uniform float uAdvance;

varying vec2 vUv;
varying float vAlpha;
varying vec3 vFlags;
varying float vValue;
varying float vColor;

float hash(vec3 p) {
	p = fract(p * vec3(0.1031, 0.1030, 0.0973));
	p += dot(p, p.yzx + 33.33);
	return fract((p.x + p.y) * p.z);
}

// The 'spawn' ease in closed form: out to ×1.35 by .12s, settling to ×1 by .3s.
float spawnScale(float t) {
	if (t < 0.12) {
		float a = 1.0 - t / 0.12;
		return 1.35 * (1.0 - a * a * a);
	}
	float b = clamp((t - 0.12) / 0.18, 0.0, 1.0);
	return mix(1.35, 1.0, b * b * (3.0 - 2.0 * b));
}

void main() {
	float age = uTime - aSpawn.z;
	if (age < 0.0 || age > uLife || aFlags.y < 0.5) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		return;
	}
	float crit = aFlags.x;
	float chars = aFlags.y;
	float k = age / uLife;
	float ease = 1.0 - (1.0 - k) * (1.0 - k);

	vec2 p = aSpawn.xy;
	if (any(notEqual(aVel.xyz, vec3(0.0)))) {
		// Ballistic: p = o + v·t + ½·g·t²  (y down, so positive g falls).
		p += aVel.xy * age + vec2(0.0, 0.5 * aVel.z * age * age);
	} else {
		float drift = (hash(aSpawn) * 2.0 - 1.0) * 15.0;
		p += vec2(drift * ease, -60.0 * ease);
	}

	float em = uSize * spawnScale(age) * mix(1.0, 1.6, crit);
	vec2 box = vec2(chars * uAdvance * em, em * ${f(CELL_H / CELL_W)});
	vec2 px = p + position.xy * box * vec2(1.0, -1.0);

	vUv = position.xy + 0.5;
	// Fade over the last 22% of life: from .7s for the standard .9s.
	vAlpha = 1.0 - smoothstep(uLife * 0.78, uLife, age);
	vFlags = aFlags;
	vValue = aValue;
	vColor = aVel.w;
	gl_Position = vec4(px.x / uViewport.x * 2.0 - 1.0, 1.0 - px.y / uViewport.y * 2.0, 0.0, 1.0);
}
`;

export const NUMBERS_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uAdvance;
uniform vec3 uInk;
uniform vec3 uSignal;

varying vec2 vUv;
varying float vAlpha;
varying vec3 vFlags;
varying float vValue;
varying float vColor;

const float GLYPH_COUNT = ${f(GLYPHS.length)};

vec3 srgbToLinear(vec3 c) {
	return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

void main() {
	float crit = vFlags.x;
	float chars = vFlags.y;
	float x = vUv.x * chars;
	float slot = min(floor(x), chars - 1.0);

	float glyph;
	if (vFlags.z > 0.5) {
		glyph = ${f(GLYPH_DOT)};
	} else if (crit > 0.5 && slot > chars - 1.5) {
		glyph = ${f(GLYPH_BANG)};
	} else {
		float digits = chars - crit;
		float k = digits - 1.0 - slot;
		// floor(mod(value / 10^k, 10)), with +.5 so pow()'s rounding never drops a digit.
		glyph = floor(mod(floor((vValue + 0.5) / pow(10.0, k)), 10.0));
	}

	vec2 uv = vec2((glyph + 0.5 + (fract(x) - 0.5) * uAdvance) / GLYPH_COUNT, vUv.y);
	float a = texture2D(uAtlas, uv).a * vAlpha;
	if (a < 0.004) discard;

	vec3 col = crit > 0.5 ? uSignal : uInk;
	if (vColor > 0.5) {
		float n = vColor - 1.0;
		col = srgbToLinear(vec3(floor(n / 65536.0), mod(floor(n / 256.0), 256.0), mod(n, 256.0)) / 255.0);
	}
	gl_FragColor = vec4(col, a);
	#include <colorspace_fragment>
}
`;
