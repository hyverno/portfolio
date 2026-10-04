// Lab cell 05 · GERSTNER WATER (web recreation of an HLSL Gerstner material). WebGL.
// A 128² plane displaced by 4 Gerstner waves in the vertex shader (horizontal + vertical, so the
// crests sharpen as Q rises); the fragment shader re-evaluates the same sum per pixel from the
// undisplaced coordinates and draws the height as ink contour lines (fract(height * 24)), a
// deforming reference grid, and Bayer-dithered shade on slopes facing away from the light (LIT).
// Q (steepness 0–1) and the wavelength (0.5–4) are live uniforms.
import * as THREE from 'three';
import type { Engine, GLView } from '#lib/gl/types';
import { BAYER } from '#lib/gl/glsl/bayer';
import { createGate } from './loop';
import { approach, themeUniforms } from './glkit';
import type { LabSceneImpl } from './types';

export const SEGMENTS = 127;
export const VERTS = (SEGMENTS + 1) * (SEGMENTS + 1);
const SIZE = 8;
const FOV = 34;

const WAVES = /* glsl */ `
uniform float uTime;
uniform float uQ;
uniform float uL;

// Directions, wavelength multipliers and steepness shares (Σ shares = 1: no loops at Q = 1).
const vec2 D0 = vec2(0.970, 0.243);
const vec2 D1 = vec2(0.622, 0.783);
const vec2 D2 = vec2(-0.330, 0.944);
const vec2 D3 = vec2(0.906, -0.423);
const vec4 MUL = vec4(1.0, 0.62, 0.41, 0.29);
const vec4 SHARE = vec4(0.40, 0.27, 0.20, 0.13);

void wave(vec2 d, float mul, float share, vec2 p, inout vec3 P, inout vec3 T, inout vec3 B) {
	float L = uL * mul;
	float k = 6.2831853 / L;
	float c = sqrt(9.8 / k) * 0.8;
	float f = k * (dot(d, p) - c * uTime);
	float s = uQ * share;
	float a = s / k;
	float cf = cos(f);
	float sf = sin(f);
	P += vec3(d.x * a * cf, a * sf, d.y * a * cf);
	T += vec3(-d.x * d.x * s * sf, d.x * s * cf, -d.x * d.y * s * sf);
	B += vec3(-d.x * d.y * s * sf, d.y * s * cf, -d.y * d.y * s * sf);
}

vec3 gerstner(vec2 p, out vec3 N) {
	vec3 P = vec3(p.x, 0.0, p.y);
	vec3 T = vec3(1.0, 0.0, 0.0);
	vec3 B = vec3(0.0, 0.0, 1.0);
	wave(D0, MUL.x, SHARE.x, p, P, T, B);
	wave(D1, MUL.y, SHARE.y, p, P, T, B);
	wave(D2, MUL.z, SHARE.z, p, P, T, B);
	wave(D3, MUL.w, SHARE.w, p, P, T, B);
	N = normalize(cross(B, T));
	return P;
}
`;

const VERT = /* glsl */ `
${WAVES}
varying vec2 vP0;
varying float vDepth;
void main() {
	vec2 p0 = position.xz;
	vec3 N;
	vec3 P = gerstner(p0, N);
	vP0 = p0;
	vec4 mv = modelViewMatrix * vec4(P, 1.0);
	vDepth = -mv.z;
	gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
${WAVES}
${BAYER}
uniform vec3 uInk;
uniform vec3 uGraphite;
uniform vec3 uSignal;
uniform float uOpacity;
uniform float uDitherPx;
varying vec2 vP0;
varying float vDepth;

/** 1 on the integer iso-lines of v, anti-aliased to ~1px whatever the density. */
float lineAA(float v, float width) {
	float fw = max(fwidth(v), 1e-4);
	float d = abs(fract(v + 0.5) - 0.5) / fw;
	return 1.0 - smoothstep(width, width + 1.0, d);
}

void main() {
	vec3 N;
	vec3 P = gerstner(vP0, N);
	float h = P.y;

	// Contours: fract(height * 24), offset half a band so the flat sea is not one solid line.
	float contour = lineAA(h * 24.0 + 0.5, 0.35);
	// Reference grid, riding the surface (shows the horizontal Gerstner orbit).
	float grid = max(lineAA(vP0.x * 2.0, 0.2), lineAA(vP0.y * 2.0, 0.2));
	// Patch outline.
	vec2 e = (${(SIZE / 2).toFixed(1)} - abs(vP0)) / max(fwidth(vP0), vec2(1e-4));
	float edge = 1.0 - smoothstep(0.6, 1.6, min(e.x, e.y));

	// LIT: Lambert from a low key light, dithered into the paper on the far side of the crests.
	vec3 L = normalize(vec3(-0.45, 0.62, 0.64));
	float diff = clamp(dot(N, L), 0.0, 1.0);
	float shade = dither(smoothstep(0.82, 0.35, diff) * 0.6, gl_FragCoord.xy / uDitherPx);

	float fog = 1.0 - smoothstep(5.0, 11.5, vDepth);
	vec3 ink = mix(uGraphite, uInk, 0.35 + 0.65 * diff);
	float a = contour * (0.55 + 0.45 * diff);
	vec3 col = ink;
	float g = grid * 0.16;
	if (g > a) {
		col = uGraphite;
		a = g;
	}
	float s = shade * 0.22;
	if (s > a) {
		col = uGraphite;
		a = s;
	}
	if (edge > a) {
		col = uGraphite;
		a = edge * 0.8;
	}
	a *= fog * uOpacity;
	if (a < 0.004) discard;
	gl_FragColor = vec4(col, a);
	#include <colorspace_fragment>
}
`;

export function create(el: HTMLElement, engine: Engine, _o: Record<string, never> = {}): LabSceneImpl {
	const renderer = engine.renderer as THREE.WebGLRenderer;
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(FOV, 1.6, 0.1, 60);
	camera.position.set(0, 3.1, 6.4);
	camera.lookAt(0, -0.35, 0);
	const theme = themeUniforms();
	const u = theme.uniforms;

	const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
	geometry.rotateX(-Math.PI / 2);
	const uniforms = {
		uTime: { value: 3.7 },
		uQ: { value: 0.62 },
		uL: { value: 1.8 },
		uDitherPx: { value: 2 },
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
		depthTest: true,
		depthWrite: false,
		side: THREE.DoubleSide
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.frustumCulled = false;
	scene.add(mesh);

	const gate = createGate();
	let running = false;
	let opacity = 0;
	let opacityTarget = 0;
	// Slider values ease in, so a jump on the slider is still a wave, not a pop.
	let q = 0.62;
	let qTarget = 0.62;
	let lw = 1.8;
	let lwTarget = 1.8;

	const view: GLView = {
		el,
		scene,
		camera,
		rate: 1,
		clearAlpha: 0,
		update(_t, dt) {
			opacity = approach(opacity, opacityTarget, dt);
			u.uOpacity.value = opacity;
			q = approach(q, qTarget, dt, 200);
			lw = approach(lw, lwTarget, dt, 200);
			uniforms.uQ.value = q;
			uniforms.uL.value = lw;
			uniforms.uDitherPx.value = Math.max(1, Math.round(renderer.getPixelRatio() * 2));
			const d = running ? gate.pass(dt) : 0;
			if (d > 0) uniforms.uTime.value += d;
		},
		onResize(w, h) {
			camera.aspect = w / Math.max(1, h);
			camera.updateProjectionMatrix();
		}
	};
	const offView = engine.addView(view);
	const stats = { verts: VERTS, waves: 4, q: 0.62, wavelength: 1.8 };

	return {
		view,
		get stats() {
			stats.q = qTarget;
			stats.wavelength = lwTarget;
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
		set(p) {
			if (typeof p.steepness === 'number') qTarget = Math.min(1, Math.max(0, p.steepness));
			if (typeof p.wavelength === 'number') lwTarget = Math.min(4, Math.max(0.5, p.wavelength));
			// Paused (reduced motion / off-centre on mobile): the surface still follows the sliders.
			if (!running) {
				q = qTarget;
				lw = lwTarget;
			}
		},
		dispose() {
			offView();
			theme.dispose();
			geometry.dispose();
			material.dispose();
		}
	};
}
