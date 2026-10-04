// Target pass: resolves every entity's destination once per frame, so the velocity, position and
// render passes all agree. Output: xy = world target, z = weight (0 = free roam),
// w = size scale (3D depth / path fade), or -1 when the entity must teleport this frame (path wrap).
import { NOISE } from '../../glsl/noise';
import { COMMON } from './common.glsl';

export const TARGET_FRAG = /* glsl */ `
${NOISE}
${COMMON}
uniform sampler2D tPos;
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;
uniform sampler2D uFlowA;
uniform sampler2D uFlowB;
uniform sampler2D uPathsA;
uniform sampler2D uPathsB;
uniform vec2 uFlowOn;
uniform vec2 uPathRows;
uniform mat4 uMatA;
uniform mat4 uMatB;
uniform float uTime;
uniform float uDt;
uniform vec4 uAttract[4];
uniform vec4 uAttractMode;
uniform vec4 uAttractStrength;
uniform float uAttractRange;
uniform vec4 uCommand;
uniform vec4 uWave;

// Point on a 64-sample path (xy) and its local direction (zw); .closed via the texel's z.
vec4 pathPoint(sampler2D paths, float rows, float row, float phase, out float closed) {
	float u = phase * 63.0;
	float i0 = floor(u);
	float i1 = min(i0 + 1.0, 63.0);
	float v = (row + 0.5) / rows;
	vec4 a = texture(paths, vec2((i0 + 0.5) / 64.0, v));
	vec4 b = texture(paths, vec2((i1 + 0.5) / 64.0, v));
	closed = a.z;
	return vec4(mix(a.xy, b.xy, u - i0), b.xy - a.xy);
}

vec4 sideTarget(sampler2D tgt, sampler2D flow, sampler2D paths, float rows, float flowOn, mat4 M, vec2 uv) {
	vec4 t = texture(tgt, uv);
	vec3 p = t.xyz;
	float scale = 1.0;
	float teleport = 0.0;
	if (flowOn > 0.5) {
		vec4 f = texture(flow, uv);
		if (f.x > 0.5) {
			float ph = fract(f.y + uTime * f.z);
			float prev = fract(f.y + (uTime - uDt) * f.z);
			float closed;
			vec4 pp = pathPoint(paths, rows, f.x - 1.0, ph, closed);
			vec2 dir = pp.zw;
			float dl = length(dir);
			vec2 nrm = dl > 1e-6 ? vec2(-dir.y, dir.x) / dl : vec2(0.0);
			p = vec3(pp.xy + nrm * f.w, 0.0);
			if (closed < 0.5) {
				// Open paths: entities shrink into the end, pop back in at the start.
				scale = smoothstep(0.0, 0.06, ph) * smoothstep(1.0, 0.92, ph);
				if (abs(ph - prev) > 0.5) teleport = 1.0;
			}
		}
	}
	vec4 w = M * vec4(p, 1.0);
	scale *= 1.0 + 0.15 * clamp(w.z, -1.0, 1.0);
	return vec4(w.xy, t.w, teleport > 0.5 ? -1.0 : scale);
}

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	float id = entityId(gl_FragCoord.xy);
	float m = entityMix(id);

	vec4 a = vec4(0.0);
	vec4 b = vec4(0.0);
	if (m < 1.0) a = sideTarget(uTargetA, uFlowA, uPathsA, uPathRows.x, uFlowOn.x, uMatA, uv);
	if (m > 0.0) b = sideTarget(uTargetB, uFlowB, uPathsB, uPathRows.y, uFlowOn.y, uMatB, uv);

	vec2 xy = mix(a.xy, b.xy, m);
	float weight = mix(a.z, b.z, m);
	float scale = mix(max(a.w, 0.0), max(b.w, 0.0), m);
	bool teleport = (m < 0.5 ? a.w : b.w) < 0.0;

	// Stadium wave: a gaussian band lifting held entities as it sweeps left to right.
	if (uWave.w > 0.0) {
		float k = (xy.x - uWave.x) / uWave.z;
		xy.y += uWave.y * exp(-k * k) * step(0.001, weight);
	}

	vec4 pos = texture(tPos, uv);

	// Attractors pull nearby entities into a rect (fill) or onto its outline (perimeter).
	for (int i = 0; i < 4; i++) {
		float mode = uAttractMode[i];
		float strength = uAttractStrength[i];
		if (mode < 0.5 || strength <= 0.0) continue;
		vec4 r = uAttract[i];
		vec2 q = pos.xy - r.xy;
		vec2 dq = abs(q) - r.zw;
		float dist = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0);
		float infl = strength * (1.0 - smoothstep(0.0, uAttractRange, dist));
		if (infl <= 0.0) continue;
		vec2 point;
		if (mode < 1.5) {
			point = r.xy + (hash22(vec2(id, float(i) * 17.0 + 3.0)) * 2.0 - 1.0) * r.zw * 0.92;
		} else {
			vec2 c = clamp(q, -r.zw, r.zw);
			if (dq.x < 0.0 && dq.y < 0.0) {
				if (-dq.x < -dq.y) c.x = sign(q.x) * r.z;
				else c.y = sign(q.y) * r.w;
			}
			point = r.xy + c;
		}
		xy = mix(xy, point, infl);
		weight = mix(weight, 1.0, infl);
		scale = mix(scale, 1.0, infl);
	}

	// RTS move order: selected units gather in a disc around the clicked point.
	if (uCommand.z > 0.5 && pos.w > 0.5) {
		vec2 h = hash22(vec2(id * 0.37, 11.0));
		float rr = sqrt(h.x) * uCommand.w;
		float an = h.y * 6.2831853;
		xy = uCommand.xy + vec2(cos(an), sin(an)) * rr;
		weight = 1.0;
		scale = 1.0;
		teleport = false;
	}

	gl_FragColor = vec4(xy, weight, teleport ? -1.0 : scale);
}
`;
