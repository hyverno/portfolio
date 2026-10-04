// Lab cell 03 · SYSTEM IN SYSTEM (web recreation of Niagara child emitters). WebGL Points.
// 64 parent rockets, each the emitter of 64 sparks: 4,096 points in ONE static buffer that only
// holds ids. All motion is analytic in the vertex shader from (time, id): a staggered launch
// schedule, a ballistic climb with a trail, then a burst on a Fibonacci sphere with drag and
// gravity. The CPU replays the same schedule (same hash) only to tell the node graph when a
// rocket launches or bursts, so the wires pulse on the real events.
import * as THREE from 'three';
import type { Engine, GLView } from '#lib/gl/types';
import { NOISE } from '#lib/gl/glsl/noise';
import { createGate } from './loop';
import { approach, themeUniforms } from './glkit';
import type { LabSceneImpl } from './types';

export const ROCKETS = 64;
export const SPARKS = 64;
export const POINTS = ROCKETS * SPARKS;
/** Seconds between two launches of the same rocket. */
const PERIOD = 6.4;
const FOV = 38;

/** Same as GLSL hash11 in glsl/noise.ts (float precision aside). */
function hash11(p: number): number {
	p = (p * 0.1031) % 1;
	if (p < 0) p += 1;
	p *= p + 33.33;
	p *= p + p;
	return p - Math.floor(p);
}

/** Per-rocket launch offset and flight time (seconds), mirrored in the shader. */
function schedule(r: number): { offset: number; flight: number } {
	const h1 = hash11(r * 1.37 + 0.1);
	return { offset: (r / ROCKETS) * PERIOD + h1 * 0.08, flight: 0.85 + h1 * 0.35 };
}

const VERT = /* glsl */ `
${NOISE}
attribute float aId;
uniform float uTime;
uniform float uPeriod;
uniform float uPx;
uniform vec3 uInk;
uniform vec3 uGraphite;
uniform vec3 uSignal;
varying vec3 vColor;
varying float vAlpha;

const float SPARKS = ${SPARKS}.0;
const float ROCKETS = ${ROCKETS}.0;
const vec3 G = vec3(0.0, -4.0, 0.0);

void main() {
	float r = floor(aId / SPARKS);
	float s = aId - r * SPARKS;
	float h1 = hash11(r * 1.37 + 0.1);
	float h2 = hash11(r * 2.11 + 0.7);
	float h3 = hash11(r * 3.7 + 1.3);
	float offset = r / ROCKETS * uPeriod + h1 * 0.08;
	float age = mod(uTime - offset, uPeriod);
	float flight = 0.85 + h1 * 0.35;

	// Launch pad on a golden-angle disc; a slight drift outward.
	float ang = r * 2.39996;
	float rad = 2.5 * sqrt(h2);
	vec3 base = vec3(cos(ang) * rad, 0.0, sin(ang) * rad);
	vec3 v0 = vec3(cos(ang) * (h3 - 0.3) * 0.5, 4.4 + h3 * 1.3, sin(ang) * (h3 - 0.3) * 0.5);

	vec3 p;
	float size;
	vColor = uInk;
	vAlpha = 1.0;

	if (age < flight) {
		// Parent particle: the head, and its trail sampled back in time.
		float ta = age - s * 0.016;
		if (ta < 0.0) {
			gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
			gl_PointSize = 0.0;
			return;
		}
		p = base + v0 * ta + 0.5 * G * ta * ta;
		float k = s / SPARKS;
		size = s < 0.5 ? 0.085 : 0.045 * (1.0 - k);
		vColor = s < 0.5 ? uSignal : mix(uInk, uGraphite, k);
		vAlpha = s < 0.5 ? 1.0 : (1.0 - k) * 0.85;
	} else {
		// Child emitter: 64 sparks on a Fibonacci sphere, drag + gravity, inheriting some velocity.
		float tau = age - flight;
		vec3 burst = base + v0 * flight + 0.5 * G * flight * flight;
		vec3 vb = v0 + G * flight;
		float hs = hash11(aId * 0.731 + 4.1);
		float y = 1.0 - 2.0 * (s + 0.5) / SPARKS;
		float rr = sqrt(max(0.0, 1.0 - y * y));
		float phi = s * 2.39996 + r * 0.7;
		vec3 dir = vec3(cos(phi) * rr, y, sin(phi) * rr);
		float speed = (1.1 + hs * 0.5) * (0.7 + h2 * 0.45);
		float drag = 1.7;
		float travel = (1.0 - exp(-drag * tau)) / drag;
		p = burst + (dir * speed + vb * 0.12) * travel + vec3(0.0, -0.55 * tau * tau, 0.0);
		float life = 1.35 + hs * 0.55;
		if (tau > life) {
			gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
			gl_PointSize = 0.0;
			return;
		}
		float k = tau / life;
		size = 0.05 * sqrt(1.0 - k) + 0.012;
		vAlpha = 1.0 - smoothstep(0.55, 1.0, k);
		vColor = mix(uInk, uGraphite, smoothstep(0.3, 1.0, k));
	}

	vec4 mv = modelViewMatrix * vec4(p, 1.0);
	gl_Position = projectionMatrix * mv;
	gl_PointSize = max(1.0, size * uPx / -mv.z);
}
`;

const FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
	vec2 q = gl_PointCoord - 0.5;
	float d = length(q) * 2.0;
	float a = (1.0 - smoothstep(0.7, 1.0, d)) * vAlpha * uOpacity;
	if (a < 0.01) discard;
	gl_FragColor = vec4(vColor, a);
	#include <colorspace_fragment>
}
`;

const GRID_VERT = /* glsl */ `
varying float vDepth;
varying vec3 vWorld;
void main() {
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	vDepth = -mv.z;
	vWorld = position;
	gl_Position = projectionMatrix * mv;
}
`;

const GRID_FRAG = /* glsl */ `
uniform vec3 uGraphite;
uniform vec3 uInk;
uniform float uOpacity;
varying float vDepth;
varying vec3 vWorld;
void main() {
	float axis = step(abs(vWorld.x), 0.001) + step(abs(vWorld.z), 0.001);
	float fade = 1.0 - smoothstep(6.0, 13.0, vDepth);
	float a = mix(0.32, 0.55, min(axis, 1.0)) * fade * uOpacity;
	gl_FragColor = vec4(mix(uGraphite, uInk, min(axis, 1.0) * 0.35), a);
	#include <colorspace_fragment>
}
`;

export interface NestedOptions {
	onEvent?: (kind: 'launch' | 'burst', rocket: number) => void;
}

export function create(el: HTMLElement, engine: Engine, o: NestedOptions = {}): LabSceneImpl {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
	camera.position.set(0, 2.7, 10.4);
	camera.lookAt(0, 2.2, 0);
	const theme = themeUniforms();
	const u = theme.uniforms;

	// Points: ids only.
	const geometry = new THREE.BufferGeometry();
	const ids = new Float32Array(POINTS);
	for (let i = 0; i < POINTS; i++) ids[i] = i;
	geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3));
	geometry.setAttribute('aId', new THREE.BufferAttribute(ids, 1));
	const uniforms = {
		uTime: { value: 0 },
		uPeriod: { value: PERIOD },
		uPx: { value: 400 },
		uInk: u.uInk,
		uGraphite: u.uGraphite,
		uSignal: u.uSignal,
		uOpacity: u.uOpacity
	};
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: VERT,
		fragmentShader: FRAG,
		transparent: true,
		depthTest: false,
		depthWrite: false
	});
	const points = new THREE.Points(geometry, material);
	points.frustumCulled = false;
	points.renderOrder = 2;
	scene.add(points);

	// Editor floor grid.
	const lines: number[] = [];
	for (let k = -4; k <= 4; k += 0.5) {
		lines.push(k, 0, -4, k, 0, 4, -4, 0, k, 4, 0, k);
	}
	const gridGeo = new THREE.BufferGeometry();
	gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
	const gridMat = new THREE.ShaderMaterial({
		uniforms: { uGraphite: u.uGraphite, uInk: u.uInk, uOpacity: u.uOpacity },
		vertexShader: GRID_VERT,
		fragmentShader: GRID_FRAG,
		transparent: true,
		depthTest: false,
		depthWrite: false
	});
	const grid = new THREE.LineSegments(gridGeo, gridMat);
	grid.frustumCulled = false;
	grid.renderOrder = 1;
	scene.add(grid);

	const gate = createGate();
	let running = false;
	let time = PERIOD * 0.62;
	let opacity = 0;
	let opacityTarget = 0;
	const sched = Array.from({ length: ROCKETS }, (_, r) => schedule(r));
	const stats = { points: POINTS, emitters: ROCKETS, up: 0, bursting: 0 };

	function census() {
		let up = 0;
		let bursting = 0;
		for (let r = 0; r < ROCKETS; r++) {
			const { offset, flight } = sched[r];
			const age = (((time - offset) % PERIOD) + PERIOD) % PERIOD;
			if (age < flight) up++;
			else if (age < flight + 1.9) bursting++;
		}
		stats.up = up;
		stats.bursting = bursting;
	}

	function advance(d: number) {
		const prev = time;
		time += d;
		if (!o.onEvent) return;
		for (let r = 0; r < ROCKETS; r++) {
			const { offset, flight } = sched[r];
			const a0 = (((prev - offset) % PERIOD) + PERIOD) % PERIOD;
			const a1 = (((time - offset) % PERIOD) + PERIOD) % PERIOD;
			if (a1 < a0) o.onEvent('launch', r);
			else if (a0 < flight && a1 >= flight) o.onEvent('burst', r);
		}
	}

	const renderer = engine.renderer as THREE.WebGLRenderer;
	const focal = 1 / (2 * Math.tan(((FOV / 2) * Math.PI) / 180));
	let viewH = el.clientHeight || 250;
	const view: GLView = {
		el,
		scene,
		camera,
		rate: 1,
		clearAlpha: 0,
		update(_t, dt) {
			opacity = approach(opacity, opacityTarget, dt);
			u.uOpacity.value = opacity;
			const d = running ? gate.pass(dt) : 0;
			if (d > 0) advance(d);
			uniforms.uTime.value = time;
			// World size → device px at depth 1 (the governor may change the DPR at any time).
			uniforms.uPx.value = viewH * renderer.getPixelRatio() * focal;
		},
		onResize(w, h) {
			viewH = h;
			camera.aspect = w / Math.max(1, h);
			camera.updateProjectionMatrix();
		}
	};
	const offView = engine.addView(view);
	census();

	return {
		view,
		get stats() {
			census();
			return stats;
		},
		start() {
			running = true;
		},
		stop() {
			running = false;
		},
		setRate(r) {
			gate.setRate(r);
		},
		resize() {},
		setOpacity(a) {
			opacityTarget = a;
		},
		dispose() {
			offView();
			theme.dispose();
			geometry.dispose();
			material.dispose();
			gridGeo.dispose();
			gridMat.dispose();
		}
	};
}
