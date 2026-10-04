// Velocity pass (§S2 "Forces"). Steering behaviours (arrive-seek, separation, curl wander, panic)
// are clamped to uMaxForce; contact forces (cursor, DOM obstacles, ping ring) get a higher ceiling
// so the crowd visibly parts and gets shoved instead of politely ignoring you.
// Output: xy = velocity (world units / s), z = speed, w = age (s; < 0 = not spawned yet).
import { NOISE } from '../../glsl/noise';
import { SDF } from '../../glsl/sdf';

export const VELOCITY_FRAG = /* glsl */ `
${NOISE}
${SDF}
uniform float uSimSize;
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tTarget;
uniform sampler2D uDensity;
uniform vec2 uDensityTexel;
uniform float uDensityScale;
uniform float uAspect;
uniform float uTime;
uniform float uDt;
uniform float uSeek;
uniform float uMaxSpeed;
uniform float uMaxForce;
uniform float uArrive;
uniform float uSep;
uniform float uWander;
uniform float uNoiseScale;
uniform float uPanic;
uniform vec2 uPanicCenter;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform float uMouseR;
uniform float uMouseF;
uniform vec4 uObstacles[16];
uniform int uObstacleCount;
uniform float uObstacleF;
uniform vec4 uPings[4];
uniform float uPingF;
uniform float uSpawn;
uniform float uSnap;

vec2 clampLen(vec2 v, float m) {
	float l = length(v);
	return l > m ? v * (m / l) : v;
}

float density(vec2 uv) {
	return textureLod(uDensity, uv, 0.0).r / uDensityScale;
}

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	float id = floor(gl_FragCoord.y) * uSimSize + floor(gl_FragCoord.x);
	vec4 pos = texture(tPos, uv);
	vec4 vel = texture(tVel, uv);
	vec4 tgt = texture(tTarget, uv);
	float h = hash11(id * 0.1337 + 7.1);

	// Not spawned yet: parked on the spawner, waiting for its rank.
	if (pos.z >= uSpawn) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, -1.0);
		return;
	}

	vec2 v = vel.xy;
	float age = vel.w;
	if (age < 0.0) {
		// Ejected along the golden spiral toward its slot, 0.6–1.2 u/s (§S1).
		vec2 d = tgt.xy - pos.xy;
		float l = length(d);
		float ga = id * 2.39996;
		vec2 dir = l > 1e-4 ? d / l : vec2(cos(ga), sin(ga));
		v = dir * mix(0.6, 1.2, h);
		age = 0.0;
	}

	if (uSnap > 0.5 || tgt.w < 0.0) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, min(age + uDt, 100.0));
		return;
	}

	float w = tgt.z;
	vec2 d = tgt.xy - pos.xy;
	float dist = length(d);
	// 1 = a held entity standing on its slot. Slots are already evenly spaced, so a settled
	// formation needs neither personal space nor wander: that is what keeps type crisp at rest.
	float onSlot = 1.0 - smoothstep(0.006, 0.06, dist);
	float settled = w * onSlot;

	// ── DOM obstacles ───────────────────────────────────────────────────────────────────────
	// Rounded-box SDF push inside a ~0.04u margin. A held entity whose slot is inside the box is
	// exempt (a formation drawn on the copy keeps its shape); a roamer whose home is inside it
	// loses its leash instead. Inside the margin, steering into the box is turned sideways (see
	// below), so the crowd slides around the copy like water round a stone instead of queuing
	// against it.
	vec2 ext = vec2(0.0);
	bool homeBlocked = false;
	float contact = 0.0;
	vec2 contactN = vec2(0.0);
	// Each entity keeps its own clearance (0.022–0.058u), so the copy gets a soft margin, not a fence.
	float margin = 0.04 * mix(0.55, 1.45, hash11(id * 1.37 + 0.11));
	for (int i = 0; i < 16; i++) {
		if (i >= uObstacleCount) break;
		vec4 o = uObstacles[i];
		bool homeIn = sdRoundBox(tgt.xy - o.xy, o.zw, 0.02) < margin;
		homeBlocked = homeBlocked || homeIn;
		vec2 q = pos.xy - o.xy;
		float sd = sdRoundBox(q, o.zw, 0.02);
		if (sd > margin || (homeIn && w > 0.05)) continue;
		vec2 e = vec2(0.002, 0.0);
		vec2 g = vec2(sdRoundBox(q + e.xy, o.zw, 0.02) - sdRoundBox(q - e.xy, o.zw, 0.02),
			sdRoundBox(q + e.yx, o.zw, 0.02) - sdRoundBox(q - e.yx, o.zw, 0.02));
		float gl = length(g);
		vec2 n = gl > 1e-6 ? g / gl : vec2(0.0, 1.0);
		float k = clamp(1.0 - sd / margin, 0.0, 3.0);
		ext += n * k * k * uObstacleF;
		if (k > contact) {
			contact = k;
			contactN = n;
		}
	}

	// ── steering ────────────────────────────────────────────────────────────────────────────
	// Individuals: ±22% top speed, so a moving formation stretches into a stream (the fast ones
	// lead) instead of sliding across the screen as one rigid picture.
	float maxSpeed = uMaxSpeed * (0.78 + 0.44 * hash11(id * 0.618 + 3.7));
	// Free roamers (weight 0) are leashed loosely to their home so they mill instead of drifting off.
	float leash = homeBlocked ? 0.0 : (1.0 - w) * 0.3 * smoothstep(0.08, 0.45, dist);
	float we = max(w, leash);
	vec2 desired = dist > 1e-5 ? d / dist * maxSpeed * min(1.0, dist / uArrive) : vec2(0.0);
	vec2 steer = (desired - v) * uSeek * we;

	// Separation: down the density gradient (central differences in the density RT).
	vec2 duv = vec2(pos.x / uAspect, pos.y) * 0.5 + 0.5;
	if (duv.x > 0.0 && duv.x < 1.0 && duv.y > 0.0 && duv.y < 1.0) {
		vec2 tx = vec2(uDensityTexel.x, 0.0);
		vec2 ty = vec2(0.0, uDensityTexel.y);
		vec2 grad = vec2(density(duv + tx) - density(duv - tx), density(duv + ty) - density(duv - ty));
		steer -= grad * uSep * mix(1.0, 0.35, w) * (1.0 - 0.92 * settled);
	}

	// Curl wander: one shared divergence-free field, so neighbours drift together like a flock.
	// ×4 for roamers, ×2 for held entities in transit (streams meander), ×0.5 once settled.
	vec2 c = curl2D(pos.xy * uNoiseScale + vec2(h * 0.35, 0.0), uTime * 0.12);
	float wanderK = mix(4.0, mix(2.0, 0.5, onSlot), w);
	steer += c * uWander * wanderK * (1.0 + 3.0 * uPanic);

	// Panic: flee the formation centre.
	if (uPanic > 0.0) {
		vec2 away = pos.xy - uPanicCenter;
		float al = length(away);
		if (al > 1e-4) steer += away / al * uPanic * (0.6 + h) * 1.4;
	}

	vec2 force = clampLen(steer, uMaxForce);
	if (contact > 0.0) {
		// Redirect, do not just cancel: the part of the steering that points into the box turns
		// sideways (whichever way the entity already leans), so a crowd heading through the copy
		// splits and pours round its corners.
		float into = dot(force, contactN);
		if (into < 0.0) {
			vec2 tng = vec2(-contactN.y, contactN.x);
			float along = dot(force, tng);
			float side = abs(along) > 1e-3 ? sign(along) : (h > 0.5 ? 1.0 : -1.0);
			force += (contactN + tng * side) * (-into) * min(1.0, contact * 3.0);
		}
	}

	// ── contact forces (obstacles above) ────────────────────────────────────────────────────
	// Cursor: radial push plus a tangential flow-around term, so the crowd parts like water. A
	// resting cursor only keeps a small clearing; a moving one carves the full radius.
	vec2 r = pos.xy - uMouse;
	float dm = length(r);
	float mouseR = uMouseR * mix(0.4, 1.0, smoothstep(0.05, 0.9, length(uMouseVel)));
	if (dm < mouseR && dm > 1e-5) {
		vec2 n = r / dm;
		float k = 1.0 - dm / mouseR;
		k *= k;
		vec2 tng = vec2(-n.y, n.x);
		float side = sign(dot(tng, v - uMouseVel) + (h - 0.5) * 0.02);
		ext += (n + tng * side * 0.6) * k * uMouseF;
	}

	// Ping ring: an outward shove while the expanding ring passes through.
	for (int i = 0; i < 4; i++) {
		vec4 p = uPings[i];
		if (p.w <= 0.0) continue;
		vec2 q = pos.xy - p.xy;
		float dq = length(q);
		float band = 1.0 - abs(dq - 1.4 * p.z) / 0.06;
		// Strongest near the click; spent by ~0.6u so a ping shoves, it does not wipe the page.
		if (band > 0.0 && dq > 1e-4) ext += q / dq * band * p.w * uPingF * exp(-p.z * 2.6);
	}

	force += clampLen(ext, uMaxForce * 6.0);

	// ── integrate (semi-implicit Euler; the position pass uses this new velocity) ───────────────
	v += force * uDt;
	v *= exp(-2.2 * uDt);
	// Soft speed limit: impulses may overshoot briefly, then bleed back to uMaxSpeed.
	float sp = length(v);
	if (sp > maxSpeed) v *= mix(1.0, maxSpeed / sp, 1.0 - exp(-8.0 * uDt));
	v = clampLen(v, maxSpeed * 3.0);

	gl_FragColor = vec4(v, length(v), min(age + uDt, 100.0));
}
`;
