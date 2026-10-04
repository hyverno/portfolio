// Crazy Planet shaders (§S5). Ink on paper, never a default three.js look:
// - one shared height function (terrain + craters) used by the sphere, its ink hull, the cones and
//   the player, so everything sits on the same ground;
// - the sphere: biome colour fields cut at contour heights, a 3-step toon (lit / graphite / ink) with
//   Bayer dither between the bands, ink iso-height contours (every 5th one heavier), a stepped ice
//   glint, RTS decals (player ring, aggro circle, nova and shock rings) and a contour-sweep reveal;
// - an inverted-hull ink outline of constant screen width (no atmosphere glow, ever);
// - cones (4-sided pyramids) that stand like ◆ when idle and lie down into darts when they run;
// - the dashed orbit gizmo as a screen-space ribbon;
// - the GPGPU sim passes (velocity, position) on the unit sphere.
import { NOISE } from '#lib/gl/glsl/noise';
import { BAYER } from '#lib/gl/glsl/bayer';

/** Shared height: uAmp · (biome noise + Σ craters). Needs NOISE. */
export const TERRAIN = /* glsl */ `
uniform vec4 uCraters[8];
uniform float uAmp;
uniform float uBiome;
uniform vec3 uSeed;
/** Geometric displacement scale: contours read the full height, the silhouette stays calm. */
uniform float uRelief;

float craterSum(vec3 n) {
	float s = 0.0;
	for (int i = 0; i < 8; i++) {
		vec4 c = uCraters[i];
		if (c.w <= 0.0) continue;
		float a = acos(clamp(dot(n, c.xyz), -1.0, 1.0));
		float q = a / 0.22;
		if (a < 0.22) s -= c.w * (1.0 - q * q);
		float k = (a - 0.22) / 0.05;
		s += 0.3 * c.w * exp(-k * k);
	}
	return s;
}

// fbm, three octaves: big readable land masses, no confetti of tiny contour islands.
float fbmT(vec3 p) {
	float a = 0.5;
	float s = 0.0;
	for (int i = 0; i < 3; i++) {
		s += a * snoise3(p);
		p = p * 2.03 + vec3(17.1, 31.7, 7.3);
		a *= 0.5;
	}
	return s;
}

float terrainEarth(vec3 n) {
	return fbmT(n * 2.2 + uSeed) * 0.08;
}

// Ice: plates and crevasses (ridged noise) over a gentle swell.
float terrainIce(vec3 n) {
	float r = 1.0 - abs(snoise3(n * 1.7 + uSeed.zxy + 11.0));
	return (r * r - 0.5) * 0.075 + snoise3(n * 4.3 + uSeed) * 0.01;
}

float terrain(vec3 n) {
	if (uAmp <= 0.0) return 0.0;
	float base;
	if (uBiome <= 0.001) base = terrainEarth(n);
	else if (uBiome >= 0.999) base = terrainIce(n);
	else base = mix(terrainEarth(n), terrainIce(n), uBiome);
	return uAmp * (base + craterSum(n));
}

/** Radius of the ground under direction n (unit sphere + displaced relief). */
float groundRadius(vec3 n, float h) {
	return 1.0 + h * uRelief;
}
`;

const COMMON_HEAD = /* glsl */ `
${NOISE}
${TERRAIN}
`;

// ── sphere ─────────────────────────────────────────────────────────────────────────────────

export const PLANET_VERT = /* glsl */ `
${COMMON_HEAD}
varying vec3 vDir;
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
	vec3 n = normalize(position);
	float h = terrain(n);
	vec3 p0 = n * groundRadius(n, h);
	// Displaced normal by finite differences on the sphere.
	vec3 t1 = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
	vec3 t2 = cross(n, t1);
	vec3 na = normalize(n + t1 * 0.018);
	vec3 nb = normalize(n + t2 * 0.018);
	vec3 pa = na * groundRadius(na, terrain(na));
	vec3 pb = nb * groundRadius(nb, terrain(nb));
	vec3 nrm = normalize(cross(pa - p0, pb - p0));
	if (dot(nrm, n) < 0.0) nrm = -nrm;
	vec4 wp = modelMatrix * vec4(p0, 1.0);
	vDir = n;
	vWorld = wp.xyz;
	vNormal = normalize(mat3(modelMatrix) * nrm);
	gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/** Reveal sweep shared by the sphere and its hull: true when the fragment is not drawn yet. */
const SWEEP = /* glsl */ `
uniform float uReveal;
uniform vec3 uSweepAxis;
// 0 at the trailing pole of the sweep, 1 at the leading one (world space: screen-stable).
float sweepCoord(vec3 worldPos) {
	return dot(normalize(worldPos), uSweepAxis) * 0.5 + 0.5;
}
float sweepEdge() {
	return uReveal * 1.24 - 0.12;
}
`;

export const PLANET_FRAG = /* glsl */ `
${COMMON_HEAD}
${BAYER}
${SWEEP}
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uGraphite;
uniform vec3 uSignal;
uniform vec3 uEarth[3];
uniform vec3 uIce[3];
uniform vec3 uLight;
uniform vec3 uCamPos;
uniform float uDither;
uniform vec3 uPlayer;
uniform float uPlayerOn;
uniform vec4 uNova;
uniform vec4 uShock;
varying vec3 vDir;
varying vec3 vWorld;
varying vec3 vNormal;

// Angle-space ring of ~w px around a centre direction (decals on the ground).
float ringAt(vec3 n, vec3 c, float radius, float px) {
	float a = acos(clamp(dot(n, c), -1.0, 1.0));
	float fw = max(fwidth(a), 1e-5);
	return 1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, abs(a - radius) / fw);
}

// Polar angle around a centre direction (for dashed decals).
float aroundAngle(vec3 n, vec3 c) {
	vec3 t1 = normalize(cross(c, abs(c.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
	vec3 t2 = cross(c, t1);
	vec3 l = n - c * dot(n, c);
	return atan(dot(l, t2), dot(l, t1));
}

void main() {
	vec3 n = normalize(vDir);
	vec2 cell = floor(gl_FragCoord.xy / uDither);
	float b = bayer4(cell);

	// Contour sweep: the sphere is drawn in, band after band, like an engraver's plate.
	float sc = sweepCoord(vWorld);
	float edge = sweepEdge();
	if (sc > edge) discard;

	float h = terrain(n);
	vec3 N = normalize(vNormal);
	vec3 V = normalize(uCamPos - vWorld);

	// ── colour fields, cut exactly at contour heights (1/40) ──
	float lo = step(h, -0.025);
	float hi = step(0.025, h);
	vec3 earth = mix(mix(uEarth[1], uEarth[0], lo), uEarth[2], hi);
	float iceLo = step(h, -0.025);
	float iceHi = step(0.025, h);
	vec3 ice = mix(mix(uIce[1], uIce[0], iceLo), uIce[2], iceHi);
	// Biome swap: an ordered-dither wipe, never a soft cross-fade.
	vec3 base = step(b, uBiome) > 0.5 ? ice : earth;
	float isIce = step(b, uBiome);

	// ── 3-step toon with Bayer dither between the bands ──
	float l = dot(N, uLight) * 0.5 + 0.5;
	float bw = 0.04;
	float toMid = smoothstep(0.43 - bw, 0.43 + bw, l);
	float toLit = smoothstep(0.6 - bw, 0.6 + bw, l);
	float band = step(b, toMid) + step(b, toLit);
	vec3 col;
	if (band > 1.5) {
		col = base;
	} else if (band > 0.5) {
		// Mid tone: the field under a 50% graphite screen (checker of the Bayer cell).
		col = b < 0.5 ? mix(base, uGraphite, 0.55) : mix(base, uGraphite, 0.18);
	} else {
		// Shadow: ink, with the field showing through a sparse screen.
		col = b < 0.82 ? mix(uInk, uGraphite, 0.18) : mix(base, uInk, 0.55);
	}

	// ── stepped ice glint (white, two hard steps) ──
	vec3 R = reflect(-uLight, N);
	float spec = pow(max(dot(R, V), 0.0), 28.0) * isIce;
	if (spec > 0.62) col = vec3(1.0);
	else if (spec > 0.3 && b < 0.5) col = mix(col, vec3(1.0), 0.85);

	// ── ink contours: ~1.2 px pens, every 5th line heavier ──
	float ch = h * 40.0;
	float fwc = max(fwidth(ch), 1e-4);
	float f = fract(ch);
	float k = floor(ch + 0.5);
	float d = min(f, 1.0 - f) / fwc;
	float index = step(abs(mod(k, 4.0)), 0.5) * step(0.5, abs(k));
	float pen = mix(1.15, 2.0, index);
	float line = 1.0 - smoothstep(pen * 0.5, pen * 0.5 + 1.0, d);
	// Flat ground (uAmp 0) has no contours; steep walls would turn solid ink: thin them out.
	line *= step(0.001, uAmp) * (1.0 - smoothstep(0.35, 0.7, fwc));
	vec3 penCol = band > 0.5 ? uInk : mix(uPaper, uGraphite, 0.35);
	col = mix(col, penCol, line);

	// ── RTS decals ──
	if (uPlayerOn > 0.0) {
		col = mix(col, uSignal, ringAt(n, uPlayer, 0.05, 1.6) * uPlayerOn);
		// Dashed aggro circle.
		float ag = ringAt(n, uPlayer, 0.2, 1.1);
		float dash = step(0.5, fract(aroundAngle(n, uPlayer) / 6.2831853 * 28.0));
		col = mix(col, uSignal, ag * dash * 0.9 * uPlayerOn);
	}
	if (uNova.w >= 0.0 && uNova.w < 0.6) {
		float t = uNova.w / 0.6;
		float r = mix(0.05, 0.34, 1.0 - (1.0 - t) * (1.0 - t));
		col = mix(col, uSignal, ringAt(n, uNova.xyz, r, mix(2.4, 0.8, t)) * (1.0 - t));
	}
	if (uShock.w >= 0.0 && uShock.w < 0.9) {
		float t = uShock.w / 0.9;
		float r = mix(0.04, 0.62, 1.0 - (1.0 - t) * (1.0 - t));
		col = mix(col, uInk, ringAt(n, uShock.xyz, r, mix(3.0, 1.0, t)) * (1.0 - t));
	}

	// ── the drawing edge of the sweep: dense hatching that resolves into the plate ──
	float lead = (edge - sc) / 0.07;
	if (lead < 1.0) {
		float hatch = fract(sc * 150.0);
		float on = step(hatch, 0.32) * step(b, 1.0 - lead);
		col = mix(col, uInk, max(on, step(lead, 0.18)));
	}

	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}
`;

// ── ink hull (outline) ─────────────────────────────────────────────────────────────────────

export const HULL_VERT = /* glsl */ `
${COMMON_HEAD}
uniform vec2 uViewport;
uniform float uWidth;
varying vec3 vWorld;
void main() {
	vec3 n = normalize(position);
	vec3 p0 = n * groundRadius(n, terrain(n));
	vec4 wp = modelMatrix * vec4(p0, 1.0);
	vWorld = wp.xyz;
	vec4 clip = projectionMatrix * viewMatrix * wp;
	vec4 clipN = projectionMatrix * viewMatrix * vec4(wp.xyz + normalize(mat3(modelMatrix) * n) * 0.02, 1.0);
	vec2 dir = clipN.xy / clipN.w - clip.xy / clip.w;
	float dl = length(dir * uViewport);
	dir = dl > 1e-6 ? dir * uViewport / dl : vec2(0.0);
	// Constant screen width in CSS px.
	clip.xy += dir / uViewport * 2.0 * uWidth * clip.w;
	gl_Position = clip;
}
`;

export const HULL_FRAG = /* glsl */ `
${SWEEP}
uniform vec3 uInk;
varying vec3 vWorld;
void main() {
	if (sweepCoord(vWorld) > sweepEdge()) discard;
	gl_FragColor = vec4(uInk, 1.0);
	#include <colorspace_fragment>
}
`;

// ── cones (the horde) ──────────────────────────────────────────────────────────────────────

export const CONE_VERT = /* glsl */ `
${COMMON_HEAD}
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform vec2 uSimSize;
uniform vec2 uCone;
/** 1 for the horde; > 1 for its paper halo, drawn first so every unit reads on any terrain. */
uniform float uGrow;
varying vec3 vWorld;
varying float vId;

void main() {
	float id = float(gl_InstanceID);
	vec2 uv = (vec2(mod(id, uSimSize.x), floor(id / uSimSize.x)) + 0.5) / uSimSize;
	vec4 P = texture2D(tPos, uv);
	vec4 Vl = texture2D(tVel, uv);
	vec3 n = normalize(P.xyz);
	vec3 v = Vl.xyz - n * dot(Vl.xyz, n);
	float sp = length(v);
	// Heading: velocity, else a stable per-entity tangent.
	vec3 ref = normalize(vec3(hash11(id * 0.37) - 0.5, 0.31, hash11(id * 0.73) - 0.5));
	vec3 fwd = sp > 1e-4 ? v / sp : normalize(cross(n, ref));
	float run = smoothstep(0.03, 0.16, sp);
	// Standing ◆ at rest, a dart lying along the heading at speed.
	vec3 axis = normalize(mix(n, fwd, run * 0.88));
	vec3 side = normalize(cross(n, fwd));
	vec3 up = normalize(cross(axis, side));
	// Shrink toward the limb: edge-on cones would fringe the silhouette like fur.
	vec3 wn = normalize(mat3(modelMatrix) * n);
	vec3 toCam = normalize(cameraPosition - (modelMatrix * vec4(n, 1.0)).xyz);
	float facing = smoothstep(0.04, 0.42, dot(wn, toCam));
	float k = mix(0.3, 1.0, facing);
	float len = uCone.x * mix(0.8, 1.15, run) * k * uGrow;
	float wid = uCone.y * k * uGrow;
	vec3 ground = n * (groundRadius(n, terrain(n)) + P.w + 0.003) + n * wid * run;
	vec3 local = side * position.x * wid + up * position.y * wid + axis * position.z * len;
	vec4 wp = modelMatrix * vec4(ground + local, 1.0);
	vWorld = wp.xyz;
	vId = id;
	gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const CONE_FRAG = /* glsl */ `
${BAYER}
uniform vec3 uInk;
uniform vec3 uGraphite;
uniform vec3 uLight;
uniform float uAlpha;
uniform float uDither;
varying vec3 vWorld;
varying float vId;
void main() {
	// Screen-door fade: the cones dither in and out at the handoff (no sorting, no blending).
	if (bayer4(floor(gl_FragCoord.xy / uDither)) >= uAlpha) discard;
	vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
	float lit = dot(N, uLight);
	vec3 col = lit > 0.25 ? mix(uInk, uGraphite, 0.5) : uInk;
	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}
`;

// ── player ─────────────────────────────────────────────────────────────────────────────────

export const PLAYER_VERT = /* glsl */ `
${COMMON_HEAD}
uniform vec3 uPlayer;
uniform float uSize;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
	vec3 n = normalize(uPlayer);
	vec3 c = n * (groundRadius(n, terrain(n)) + uSize * 1.1);
	vec4 wp = modelMatrix * vec4(c + position * uSize, 1.0);
	vWorld = wp.xyz;
	vNormal = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const PLAYER_FRAG = /* glsl */ `
${BAYER}
uniform vec3 uSignal;
uniform vec3 uInk;
uniform vec3 uLight;
uniform vec3 uCamPos;
uniform float uAlpha;
uniform float uDither;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
	if (bayer4(floor(gl_FragCoord.xy / uDither)) >= uAlpha) discard;
	vec3 N = normalize(vNormal);
	float l = dot(N, uLight);
	vec3 col = l > -0.1 ? uSignal : mix(uSignal, uInk, 0.45);
	float rim = 1.0 - abs(dot(N, normalize(uCamPos - vWorld)));
	col = mix(col, uInk, step(0.78, rim));
	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}
`;

// ── orbit gizmo (screen-space dashed ribbon) ───────────────────────────────────────────────

export const ORBIT_VERT = /* glsl */ `
attribute float aT;
attribute float aSide;
uniform float uRadius;
uniform mat3 uTilt;
uniform vec2 uViewport;
uniform float uWidth;
varying float vT;
varying float vSide;
vec3 ringPoint(float t) {
	return uTilt * vec3(cos(t), 0.0, sin(t)) * uRadius;
}
void main() {
	vec3 p = ringPoint(aT);
	vec3 q = ringPoint(aT + 0.01);
	vec4 a = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
	vec4 b = projectionMatrix * viewMatrix * modelMatrix * vec4(q, 1.0);
	vec2 d = (b.xy / b.w - a.xy / a.w) * uViewport;
	vec2 nrm = normalize(vec2(-d.y, d.x) + 1e-6);
	a.xy += nrm / uViewport * 2.0 * uWidth * 0.5 * aSide * a.w;
	vT = aT;
	vSide = aSide;
	gl_Position = a;
}
`;

export const ORBIT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHalo;
uniform float uCore;
uniform float uDashes;
uniform float uDuty;
uniform float uAlpha;
varying float vT;
varying float vSide;
void main() {
	if (uAlpha <= 0.0) discard;
	float f = fract(vT / 6.2831853 * uDashes);
	if (f > uDuty) discard;
	// Ink core, paper halo: invisible on the page, a clean cut where the ring crosses the planet.
	vec3 col = abs(vSide) < uCore ? uColor : uHalo;
	gl_FragColor = vec4(col, uAlpha);
	#include <colorspace_fragment>
}
`;

// ── GPGPU: sim on the unit sphere ──────────────────────────────────────────────────────────

const SIM_HEAD = /* glsl */ `
${NOISE}
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform float uDt;
uniform float uTime;
uniform vec4 uHit;
uniform float uHitR;
uniform float uHitSeed;

float entityId() {
	return floor(gl_FragCoord.y) * resolution.x + floor(gl_FragCoord.x);
}

// Inside a fresh hit and drawn to respawn at the antipode (30%).
bool respawns(vec3 n, float id) {
	if (uHit.w <= 0.0) return false;
	float a = acos(clamp(dot(n, uHit.xyz), -1.0, 1.0));
	return a < uHitR * 1.15 && hash11(id * 0.37 + uHitSeed) < 0.3;
}
`;

export const SIM_VEL = /* glsl */ `
${SIM_HEAD}
uniform vec3 uPlayer;
uniform float uChase;
uniform float uWander;
uniform vec4 uNova;

// Divergence-free tangent flow on the sphere: n × ∇ψ (ψ = 3D simplex noise).
vec3 sphereCurl(vec3 n, float t) {
	const float e = 0.05;
	vec3 p = n * 1.6 + vec3(0.0, t, 0.0);
	float dx = snoise3(p + vec3(e, 0.0, 0.0)) - snoise3(p - vec3(e, 0.0, 0.0));
	float dy = snoise3(p + vec3(0.0, e, 0.0)) - snoise3(p - vec3(0.0, e, 0.0));
	float dz = snoise3(p + vec3(0.0, 0.0, e)) - snoise3(p - vec3(0.0, 0.0, e));
	return cross(n, vec3(dx, dy, dz) / (2.0 * e)) * 0.35;
}

vec3 tangentAway(vec3 n, vec3 c) {
	vec3 a = n - c * dot(n, c);
	float l = length(a);
	return l > 1e-5 ? a / l : normalize(cross(n, vec3(0.0, 1.0, 0.0)) + 1e-4);
}

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	float id = entityId();
	vec4 P = texture2D(tPos, uv);
	vec4 V = texture2D(tVel, uv);
	vec3 n = normalize(P.xyz);
	vec3 v = V.xyz;
	float hop = V.w;
	float h1 = hash11(id * 0.1731 + 0.3);
	float h2 = hash11(id * 0.7311 + 1.7);
	float h3 = hash11(id * 1.3713 + 4.1);

	// Chase: every unit wants its own stand-off ring around the player (survivors-like horde).
	float maxSp = mix(0.24, 0.5, h1);
	float a = acos(clamp(dot(n, uPlayer), -1.0, 1.0));
	vec3 toP = -tangentAway(n, uPlayer);
	float stand = mix(0.06, 0.3, h2 * h2);
	float k = clamp((a - stand) / 0.22, -0.6, 1.0);
	vec3 desired = toP * maxSp * k;
	// Close in: circle the player instead of stacking on it.
	float near = 1.0 - smoothstep(stand, stand + 0.25, a);
	desired += cross(n, toP) * (h3 < 0.5 ? -1.0 : 1.0) * maxSp * 0.55 * near;
	vec3 steer = (desired * uChase - v * mix(0.6, 1.0, uChase)) * 2.2 + sphereCurl(n, uTime * 0.07) * 0.2 * uWander;
	v += steer * uDt;

	// Crater hit: shove outward along the ground, throw them up.
	if (uHit.w > 0.0) {
		float ah = acos(clamp(dot(n, uHit.xyz), -1.0, 1.0));
		float fall = 1.0 - smoothstep(0.0, uHitR * 1.8, ah);
		if (fall > 0.0) {
			v += tangentAway(n, uHit.xyz) * uHit.w * fall * (0.7 + h1 * 0.8);
			hop += 1.4 * fall * uHit.w * (0.6 + h3 * 0.6);
		}
	}
	// Nova (auto-spell around the player): a lighter shove and hop.
	if (uNova.w > 0.0) {
		float an = acos(clamp(dot(n, uNova.xyz), -1.0, 1.0));
		float fall = 1.0 - smoothstep(0.0, 0.34, an);
		if (fall > 0.0) {
			v += tangentAway(n, uNova.xyz) * uNova.w * fall * (0.5 + h2 * 0.6);
			hop += 0.55 * fall * uNova.w;
		}
	}
	if (respawns(n, id)) {
		v = vec3(0.0);
		hop = 0.0;
	}

	v -= n * dot(v, n);
	v *= exp(-0.9 * uDt);
	float sp = length(v);
	if (sp > 1.4) v *= 1.4 / sp;
	// Hop under gravity; grounded units do not sink.
	hop -= 3.2 * uDt;
	if (P.w <= 0.0 && hop < 0.0) hop = 0.0;
	gl_FragColor = vec4(v, hop);
}
`;

export const SIM_POS = /* glsl */ `
${SIM_HEAD}
uniform sampler2D tHome;
uniform sampler2D tCapture;
uniform float uHomeMix;
uniform float uFromCapture;
uniform vec3 uFacing;
uniform float uRecycle;

vec3 slerpDir(vec3 a, vec3 b, float t) {
	float d = clamp(dot(a, b), -1.0, 1.0);
	float th = acos(d);
	if (th < 1e-4) return b;
	float s = sin(th);
	if (s < 1e-3) {
		vec3 axis = normalize(cross(a, abs(a.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
		return a * cos(th * t) + cross(axis, a) * sin(th * t);
	}
	return (sin((1.0 - t) * th) * a + sin(t * th) * b) / s;
}

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	float id = entityId();
	vec4 P = texture2D(tPos, uv);
	vec4 V = texture2D(tVel, uv);
	vec3 n0 = normalize(P.xyz);
	vec3 n = normalize(n0 + V.xyz * uDt);
	float hop = max(0.0, P.w + V.w * uDt);
	if (respawns(n0, id)) {
		// Back in from the far side, spread over a cap around the antipode.
		vec3 j = hash33(vec3(id, uHitSeed, 7.0)) * 2.0 - 1.0;
		n = normalize(-uHit.xyz + j * 0.45);
		hop = 0.0;
	}
	// Survivors-like spawning: units stranded deep on the far side (the planet turned faster than
	// they walk) come back over the horizon, just out of sight, and stream in toward the player.
	if (uRecycle > 0.0 && acos(clamp(dot(n, uFacing), -1.0, 1.0)) > 1.95) {
		if (hash11(id * 0.913 + uTime * 61.7) < uDt * 1.8 * uRecycle) {
			vec3 t1 = normalize(cross(uFacing, abs(uFacing.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
			vec3 t2 = cross(uFacing, t1);
			float th = hash11(id * 1.731 + uTime * 13.1) * 6.2831853;
			float an = 1.36 + hash11(id * 0.37 + uTime * 7.3) * 0.26;
			n = normalize(uFacing * cos(an) + (cos(th) * t1 + sin(th) * t2) * sin(an));
			hop = 0.0;
		}
	}
	if (uHomeMix > 0.0) {
		vec3 from = uFromCapture > 0.5 ? normalize(texture2D(tCapture, uv).xyz) : n;
		n = slerpDir(from, texture2D(tHome, uv).xyz, uHomeMix);
		hop *= 1.0 - uHomeMix;
	}
	gl_FragColor = vec4(n, hop);
}
`;

/** Plain copy pass (captures the release snapshot). */
export const SIM_COPY = /* glsl */ `
uniform sampler2D tSrc;
void main() {
	gl_FragColor = texture2D(tSrc, gl_FragCoord.xy / resolution.xy);
}
`;
