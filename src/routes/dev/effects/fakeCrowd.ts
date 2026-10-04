// DEV-only stand-in for the crowd engine: a CPU-steered crowd uploaded to float DataTextures each
// frame, splatted into a mipmapped density RT, and drawn as dots. It implements exactly the
// CrowdGPU + Crowd surface the effects need, so they can be tested without A3's engine.
import * as THREE from 'three';
import type { CrowdGPU } from '#lib/gl/internal';
import type { Crowd, CrowdParams, FormationSource, Preset, Region } from '#lib/gl/types';
import { onThemeColors } from '#lib/core/theme.svelte';

type Targets = Float32Array; // N*2, world units

const DENSITY_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform float uAspect;
uniform float uSplat;
void main() {
	vec4 p = texture2D(uPos, position.xy);
	gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
	gl_PointSize = uSplat;
}
`;
const DENSITY_FRAG = /* glsl */ `
uniform float uAmp;
void main() {
	vec2 q = gl_PointCoord * 2.0 - 1.0;
	float r2 = dot(q, q);
	if (r2 > 1.0) discard;
	gl_FragColor = vec4(uAmp * exp(-r2 * 3.0), 0.0, 0.0, 1.0);
}
`;
const POINTS_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform float uAspect;
uniform float uSize;
varying float vId;
void main() {
	vec4 p = texture2D(uPos, position.xy);
	vId = position.z;
	gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
	gl_PointSize = uSize;
}
`;
const POINTS_FRAG = /* glsl */ `
uniform vec3 uInk;
uniform float uIds;
varying float vId;
vec3 hsv2rgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main() {
	vec2 q = gl_PointCoord * 2.0 - 1.0;
	float d = length(q);
	float a = 1.0 - smoothstep(0.75, 1.0, d);
	if (a < 0.01) discard;
	vec3 col = uIds > 0.5 ? pow(hsv2rgb(vec3(hash11(vId), 0.55, 0.85)), vec3(2.2)) : uInk;
	gl_FragColor = vec4(col, a);
	#include <colorspace_fragment>
}
`;

function texelGeometry(size: number): THREE.BufferGeometry {
	const n = size * size;
	const data = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		data[i * 3] = ((i % size) + 0.5) / size;
		data[i * 3 + 1] = (Math.floor(i / size) + 0.5) / size;
		data[i * 3 + 2] = i;
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
	return g;
}

function floatTexture(size: number): THREE.DataTexture {
	const t = new THREE.DataTexture(new Float32Array(size * size * 4), size, size, THREE.RGBAFormat, THREE.FloatType);
	t.minFilter = t.magFilter = THREE.NearestFilter;
	t.needsUpdate = true;
	return t;
}

export interface FakeCrowd {
	gpu: CrowdGPU;
	crowd: Crowd & { current: string | null };
	/** Steps the CPU sim, uploads, and renders the density RT. */
	step(dt: number, mouse: { x: number; y: number; on: boolean }): void;
	/** Draws the crowd's dots into the current framebuffer. */
	draw(): void;
	resize(w: number, h: number, dpr: number): void;
	dispose(): void;
}

export function createFakeCrowd(renderer: THREE.WebGLRenderer, simSize = 128, densitySize = 256): FakeCrowd {
	const N = simSize * simSize;
	const viewport = { w: innerWidth, h: innerHeight, dpr: renderer.getPixelRatio(), aspect: innerWidth / innerHeight };

	const posTex = floatTexture(simSize);
	const velTex = floatTexture(simSize);
	const pos = posTex.image.data as Float32Array;
	const vel = velTex.image.data as Float32Array;
	const seeds = new Float32Array(N);
	for (let i = 0; i < N; i++) {
		seeds[i] = Math.random();
		pos[i * 4] = (Math.random() * 2 - 1) * viewport.aspect;
		pos[i * 4 + 1] = Math.random() * 2 - 1;
		pos[i * 4 + 2] = seeds[i];
	}

	// ── Formations ──────────────────────────────────────────────────────────────────────────
	const formations = new Map<string, Targets>();
	function buildDemo(): Targets {
		// Three clumps, a ring and a band: enough structure for the heatmap and the quadtree.
		const t = new Float32Array(N * 2);
		const a = viewport.aspect;
		for (let i = 0; i < N; i++) {
			const k = i % 5;
			const r = Math.sqrt(Math.random());
			const th = Math.random() * Math.PI * 2;
			let x: number;
			let y: number;
			if (k === 0) [x, y] = [-0.55 * a + Math.cos(th) * r * 0.22, 0.35 + Math.sin(th) * r * 0.22];
			else if (k === 1) [x, y] = [0.5 * a + Math.cos(th) * r * 0.12, 0.5 + Math.sin(th) * r * 0.12];
			else if (k === 2) [x, y] = [0.1 * a + Math.cos(th) * (0.34 + Math.random() * 0.03), -0.3 + Math.sin(th) * (0.34 + Math.random() * 0.03)];
			else if (k === 3) [x, y] = [(Math.random() * 2 - 1) * a * 0.9, -0.82 + (Math.random() - 0.5) * 0.06];
			else [x, y] = [(Math.random() * 2 - 1) * a, Math.random() * 2 - 1];
			t[i * 2] = x;
			t[i * 2 + 1] = y;
		}
		return t;
	}
	function buildFill(): Targets {
		// Jittered grid covering the viewport (the engine-internal 'fill').
		const t = new Float32Array(N * 2);
		const a = viewport.aspect;
		const cols = Math.ceil(Math.sqrt(N * a));
		const rows = Math.ceil(N / cols);
		for (let i = 0; i < N; i++) {
			const cx = i % cols;
			const cy = Math.floor(i / cols);
			t[i * 2] = ((cx + Math.random()) / cols) * 2 * a - a;
			t[i * 2 + 1] = ((cy + Math.random()) / rows) * 2 - 1;
		}
		return t;
	}
	const rebuild = () => {
		formations.set('demo', buildDemo());
		formations.set('fill', buildFill());
	};
	rebuild();

	let owner: string | null = null;
	let from = 'demo';
	let to = 'demo';
	let mix = 1;
	let ping: { x: number; y: number; t: number } | null = null;
	let time = 0;

	const crowd: FakeCrowd['crowd'] = {
		N,
		get owner() {
			return owner;
		},
		get current() {
			return mix >= 0.5 ? to : from;
		},
		async define(_id: string, _src: FormationSource, _region: Region) {},
		has: (id) => formations.has(id) || id === 'ambient',
		setPaint() {},
		blend(f, t, m, o) {
			if (owner && o?.owner !== owner) return;
			from = f;
			to = t;
			mix = m;
		},
		claim(o) {
			owner = o;
		},
		release(o) {
			if (owner !== o) return;
			owner = null;
			from = to = 'demo';
			mix = 1;
		},
		set(_p: Partial<CrowdParams>) {},
		preset(_p: Preset) {},
		ping(x, y) {
			ping = { x: (x - viewport.w / 2) / (viewport.h / 2), y: -(y - viewport.h / 2) / (viewport.h / 2), t: time };
		},
		attract() {},
		setScan() {},
		setAlpha() {},
		named: () => null,
		select: async () => 0,
		command() {}
	};

	// ── GPU side ────────────────────────────────────────────────────────────────────────────
	const densityRT = new THREE.WebGLRenderTarget(densitySize, densitySize, {
		type: THREE.HalfFloatType,
		format: THREE.RGBAFormat,
		minFilter: THREE.LinearMipmapLinearFilter,
		magFilter: THREE.LinearFilter,
		generateMipmaps: true,
		depthBuffer: false
	});
	const geometry = texelGeometry(simSize);
	const densityMat = new THREE.ShaderMaterial({
		vertexShader: DENSITY_VERT,
		fragmentShader: DENSITY_FRAG,
		uniforms: { uPos: { value: posTex }, uAspect: { value: 1 }, uSplat: { value: 6 }, uAmp: { value: 0.07 } },
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: false,
		depthWrite: false
	});
	const densityScene = new THREE.Scene();
	const densityPoints = new THREE.Points(geometry, densityMat);
	densityPoints.frustumCulled = false;
	densityScene.add(densityPoints);

	const colors = {
		paper: new THREE.Vector3(),
		ink: new THREE.Vector3(),
		graphite: new THREE.Vector3(),
		hairline: new THREE.Vector3(),
		signal: new THREE.Vector3()
	};
	const offTheme = onThemeColors((c) => {
		colors.paper.fromArray(c.paper);
		colors.ink.fromArray(c.ink);
		colors.graphite.fromArray(c.graphite);
		colors.hairline.fromArray(c.hairline);
		colors.signal.fromArray(c.signal);
	});

	const pointsMat = new THREE.ShaderMaterial({
		vertexShader: POINTS_VERT,
		fragmentShader: POINTS_FRAG,
		uniforms: {
			uPos: { value: posTex },
			uAspect: { value: 1 },
			uSize: { value: 3 },
			uInk: { value: colors.ink },
			uIds: { value: 0 }
		},
		transparent: true,
		depthTest: false,
		depthWrite: false
	});
	const pointsScene = new THREE.Scene();
	const points = new THREE.Points(geometry, pointsMat);
	points.frustumCulled = false;
	pointsScene.add(points);
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

	const gpu: CrowdGPU = {
		N,
		simSize,
		posTexture: () => posTex,
		velTexture: () => velTex,
		densityTexture: () => densityRT.texture,
		densitySize,
		densityMipmaps: true,
		colors,
		viewport,
		setIdsMode(on) {
			pointsMat.uniforms.uIds.value = on ? 1 : 0;
		},
		setPointsVisible(on) {
			points.visible = on;
		}
	};

	function targetOf(id: string): Targets | null {
		return formations.get(id) ?? null;
	}

	function step(dt: number, mouse: { x: number; y: number; on: boolean }) {
		time += dt;
		const tf = targetOf(from);
		const tt = targetOf(to);
		const a = viewport.aspect;
		const mx = (mouse.x - viewport.w / 2) / (viewport.h / 2);
		const my = -(mouse.y - viewport.h / 2) / (viewport.h / 2);
		const pingAge = ping ? time - ping.t : 99;
		const maxSpeed = owner === 'transition' ? 3.2 : 0.9;
		for (let i = 0; i < N; i++) {
			const o = i * 4;
			const px = pos[o];
			const py = pos[o + 1];
			const s = seeds[i];
			// Per-entity stagger of the blend (the engine's uMixSpread).
			const m = Math.min(1, Math.max(0, (mix - s * 0.45) / 0.55));
			let gx: number;
			let gy: number;
			if (tt && tf) {
				gx = tf[i * 2] + (tt[i * 2] - tf[i * 2]) * m;
				gy = tf[i * 2 + 1] + (tt[i * 2 + 1] - tf[i * 2 + 1]) * m;
			} else if (tt) {
				gx = tt[i * 2];
				gy = tt[i * 2 + 1];
			} else {
				gx = px;
				gy = py;
			}
			let ax = (gx - px) * 6 - vel[o] * 2.2;
			let ay = (gy - py) * 6 - vel[o + 1] * 2.2;
			// Wander.
			const w = time * 0.7 + s * 40;
			ax += Math.sin(w + py * 3) * 0.6;
			ay += Math.cos(w * 1.3 + px * 3) * 0.6;
			if (mouse.on) {
				const dx = px - mx;
				const dy = py - my;
				const d2 = dx * dx + dy * dy;
				if (d2 < 0.0484 && d2 > 1e-6) {
					const d = Math.sqrt(d2);
					const f = (1 - d / 0.22) * 40;
					ax += (dx / d) * f;
					ay += (dy / d) * f;
				}
			}
			if (ping && pingAge < 0.6) {
				const dx = px - ping.x;
				const dy = py - ping.y;
				const d = Math.sqrt(dx * dx + dy * dy) + 1e-4;
				const front = pingAge * 1.6;
				const band = Math.exp(-((d - front) ** 2) / 0.004);
				ax += (dx / d) * band * 60;
				ay += (dy / d) * band * 60;
			}
			let vx = vel[o] + ax * dt;
			let vy = vel[o + 1] + ay * dt;
			const sp = Math.hypot(vx, vy);
			if (sp > maxSpeed) {
				vx *= maxSpeed / sp;
				vy *= maxSpeed / sp;
			}
			vel[o] = vx;
			vel[o + 1] = vy;
			vel[o + 2] = Math.min(sp, maxSpeed);
			vel[o + 3] += dt;
			pos[o] = Math.min(a * 1.05, Math.max(-a * 1.05, px + vx * dt));
			pos[o + 1] = Math.min(1.05, Math.max(-1.05, py + vy * dt));
		}
		posTex.needsUpdate = true;
		velTex.needsUpdate = true;

		densityMat.uniforms.uAspect.value = a;
		densityMat.uniforms.uSplat.value = Math.max(2, (densitySize / viewport.h) * 14);
		const prevTarget = renderer.getRenderTarget();
		renderer.setRenderTarget(densityRT);
		renderer.setClearColor(0x000000, 0);
		renderer.clear(true, false, false);
		renderer.render(densityScene, camera);
		renderer.setRenderTarget(prevTarget);
	}

	return {
		gpu,
		crowd,
		step,
		draw() {
			pointsMat.uniforms.uAspect.value = viewport.aspect;
			pointsMat.uniforms.uSize.value = 3 * viewport.dpr;
			pointsMat.uniforms.uInk.value = colors.ink;
			renderer.render(pointsScene, camera);
		},
		resize(w, h, dpr) {
			viewport.w = w;
			viewport.h = h;
			viewport.dpr = dpr;
			viewport.aspect = w / h;
			rebuild();
		},
		dispose() {
			offTheme();
			densityRT.dispose();
			geometry.dispose();
			densityMat.dispose();
			pointsMat.dispose();
			posTex.dispose();
			velTex.dispose();
		}
	};
}
