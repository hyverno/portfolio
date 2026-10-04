// Crowd render pass (§2.6, §S2 "Render pass"): one THREE.Points, SDF glyphs in gl_PointCoord.
// At rest a 2.5px dot; in motion a 7×5px notched dart along the velocity; `xstitch` = two crossed
// capsules with the top leg 8% lighter. A scanline (uScan) switches paint + glyph per fragment.
import { NOISE } from '../../glsl/noise';
import { SDF } from '../../glsl/sdf';
import { COMMON } from './common.glsl';

export const RENDER_VERT = /* glsl */ `
${NOISE}
${COMMON}
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tTarget;
uniform sampler2D uPaintA;
uniform sampler2D uPaintB;
uniform sampler2D uPaintAltA;
uniform sampler2D uPaintAltB;
uniform float uAspect;
uniform float uDpr;
uniform float uSize;
uniform float uAlpha;
uniform float uSpawn;
uniform float uIds;
uniform float uPanic;
uniform float uPaintMix;
uniform float uPaintLag;
uniform vec3 uInk;
uniform vec3 uSignal;
uniform float uNamed[8];

varying vec3 vColor;
varying vec3 vColorAlt;
varying float vAlpha;
varying vec2 vHeading;
varying float vSpeedN;
varying float vSize;

vec3 srgbToLinear(vec3 c) {
	return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 hsv2rgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
	vec2 uv = position.xy;
	float id = position.z;
	vec4 pos = texture(tPos, uv);
	if (pos.z >= uSpawn || uAlpha <= 0.0) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		gl_PointSize = 0.0;
		return;
	}
	vec4 vel = texture(tVel, uv);
	vec4 tgt = texture(tTarget, uv);

	// Paint follows a lagged mix: an entity takes its new formation's colour about when it lands,
	// not when its target jumps (and gives it back about when it leaves, scrolling back).
	float m = entityMixAt(id, uPaintLag);
	vec4 pa = vec4(0.0);
	vec4 pb = vec4(0.0);
	vec4 qa = vec4(0.0);
	vec4 qb = vec4(0.0);
	if (m < 1.0) {
		pa = texture(uPaintA, uv);
		qa = texture(uPaintAltA, uv);
	}
	if (m > 0.0) {
		pb = texture(uPaintB, uv);
		qb = texture(uPaintAltB, uv);
	}
	vec4 paint = mix(pa, pb, m);
	vec4 alt = mix(qa, qb, m);
	vColor = mix(uInk, srgbToLinear(paint.rgb), paint.a * uPaintMix);
	vColorAlt = mix(uInk, srgbToLinear(alt.rgb), alt.a * uPaintMix);

	// Signal ("aggro"): selected units, named entities (the peon), and a share of a panicking crowd.
	float hot = step(0.5, pos.w);
	for (int i = 0; i < 8; i++) hot = max(hot, 1.0 - step(0.5, abs(uNamed[i] - id)));
	if (uPanic > 0.0) hot = max(hot, step(hash11(id * 1.71 + 0.5), uPanic * 0.35));
	vColor = mix(vColor, uSignal, hot);
	vColorAlt = mix(vColorAlt, uSignal, hot);

	// [4] IDS: a colour per persistent id, stable through every formation. The hue walks the
	// Hilbert rank (3 turns of the wheel) with a little per-id jitter, so neighbours share a hue
	// and every transition shows the mapping: bands stay bands.
	if (uIds > 0.5) {
		float hue = fract(id / uCount * 3.0 + hash11(id * 0.31 + 0.7) * 0.1);
		vColor = srgbToLinear(hsv2rgb(vec3(hue, 0.55, 0.85)));
		vColorAlt = vColor;
	}

	float speed = vel.z;
	vSpeedN = smoothstep(0.05, 0.4, speed);
	vHeading = speed > 1e-4 ? vel.xy / speed : vec2(0.0, 1.0);
	vAlpha = uAlpha * smoothstep(0.0, 0.12, vel.w);
	vSize = uSize * uDpr * mix(0.85, 1.25, vSpeedN) * max(tgt.w, 0.0);
	gl_PointSize = vSize;
	gl_Position = vec4(pos.x / uAspect, pos.y, 0.0, 1.0);
}
`;

export const RENDER_FRAG = /* glsl */ `
${SDF}
uniform vec3 uScan;
uniform float uGlyph;
uniform float uGlyphAlt;
uniform float uDpr;
uniform float uSize;
uniform float uCanvasH;

varying vec3 vColor;
varying vec3 vColorAlt;
varying float vAlpha;
varying vec2 vHeading;
varying float vSpeedN;
varying float vSize;

void main() {
	// Scanline test in CSS px, y down (same space as Crowd.setScan).
	vec2 css = vec2(gl_FragCoord.x, uCanvasH - gl_FragCoord.y) / uDpr;
	bool past = dot(css, uScan.xy) < uScan.z;
	float glyph = past ? uGlyphAlt : uGlyph;
	vec3 col = past ? vColorAlt : vColor;

	vec2 q = (gl_PointCoord - 0.5) * vSize;
	q.y = -q.y;
	// One CSS px at the default size: every glyph scales with the size param.
	float u = uDpr * uSize / 7.0;

	float d;
	if (glyph > 1.5) {
		float a = 2.4 * u;
		float r = 0.95 * u;
		float back = sdCapsule(q, vec2(-a, -a), vec2(a, a), r);
		float top = sdCapsule(q, vec2(-a, a), vec2(a, -a), r);
		d = min(back, top);
		if (top < 0.5) col = mix(col, vec3(1.0), 0.08);
	} else {
		float dotD = length(q) - 1.25 * u;
		if (glyph < 0.5) {
			d = dotD;
		} else {
			// Heading frame: the dart points along +y.
			vec2 hq = vec2(dot(q, vec2(vHeading.y, -vHeading.x)), dot(q, vHeading));
			float L = 7.0 * u;
			float W = 5.0 * u;
			float tri = sdTriangleIso(vec2(hq.x, L * 0.5 - hq.y), vec2(W * 0.5, L));
			float notch = sdTriangleIso(vec2(hq.x, -0.2 * L - hq.y), vec2(W * 0.5, 0.3 * L));
			d = mix(dotD, max(tri, -notch), vSpeedN);
		}
	}

	float a = clamp(0.5 - d, 0.0, 1.0) * vAlpha;
	if (a < 0.004) discard;
	gl_FragColor = vec4(col, a);
	#include <colorspace_fragment>
}
`;
