// Position pass: integrates with the velocity written this step (semi-implicit Euler), applies the
// scroll carry, snaps / teleports, and runs the one-shot RTS selection write into pos.w.
// Output: xy = world position, z = spawn rank (seed), w = selected flag.
import { NOISE } from '../../glsl/noise';
import { COMMON } from './common.glsl';

export const POSITION_FRAG = /* glsl */ `
${NOISE}
${COMMON}
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tTarget;
uniform float uDt;
uniform float uSpawn;
uniform vec2 uSpawner;
uniform float uSnap;
/** World-units scroll shift for this frame (already × uScrollCarry); per side: 1 = page space. */
uniform float uScrollShift;
uniform vec2 uCarry;
uniform vec4 uSelectRect;
uniform float uSelectPass;

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	vec4 pos = texture(tPos, uv);

	if (pos.z >= uSpawn) {
		gl_FragColor = vec4(uSpawner, pos.z, 0.0);
		return;
	}

	vec4 vel = texture(tVel, uv);
	vec4 tgt = texture(tTarget, uv);
	float id = entityId(gl_FragCoord.xy);

	// Snap (reduced motion, quality rebuild) puts everyone home, free roamers included.
	if (uSnap > 0.5 || tgt.w < 0.0) {
		pos.xy = tgt.xy;
	} else {
		pos.xy += vel.xy * uDt;
		// Scroll carry: entities ride the page a little slower than the page (inertia).
		pos.y += uScrollShift * mix(uCarry.x, uCarry.y, entityMix(id));
	}

	if (uSelectPass > 0.5) {
		vec2 lo = uSelectRect.xy;
		vec2 hi = uSelectRect.zw;
		pos.w = (pos.x >= lo.x && pos.x <= hi.x && pos.y >= lo.y && pos.y <= hi.y) ? 1.0 : 0.0;
	}

	gl_FragColor = pos;
}
`;
