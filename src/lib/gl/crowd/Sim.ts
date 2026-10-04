// The GPGPU half of the crowd: texPos / texVel ping-pong plus a per-frame target texture, built on
// GPUComputationRenderer's render-target and full-screen-pass plumbing. Passes run in a fixed order
// each step: target → velocity (reads the new target) → position (reads the new velocity), i.e.
// semi-implicit Euler, which the stock `compute()` (everything reads last frame) cannot express.
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { TARGET_FRAG } from './shaders/target.glsl';
import { VELOCITY_FRAG } from './shaders/velocity.glsl';
import { POSITION_FRAG } from './shaders/position.glsl';
import { RENDER_FRAG, RENDER_VERT } from './shaders/render.glsl';
import { DENSITY_FRAG, DENSITY_VERT } from './shaders/density.glsl';
import { COUNT_FRAG, COUNT_VERT } from './shaders/readback.glsl';
import { mulberry32 } from './bakers';

export type Uniforms = Record<string, THREE.IUniform>;

/**
 * A program to compile ahead of the first frame. three keys programs on (among others) the
 * geometry's attributes and whether a render target is bound, so the warm-up must draw each
 * material exactly as the frame will: `quad` = GPUComputationRenderer's full-screen triangle
 * (position + uv, no normals), `offscreen` = drawn into a render target (linear output).
 */
export interface CompileJob {
	name: string;
	material: THREE.Material;
	kind: 'quad' | 'points';
	offscreen: boolean;
}

/** One ping-ponged state texture. */
class Pair {
	a: THREE.WebGLRenderTarget;
	b: THREE.WebGLRenderTarget;
	constructor(gpu: GPUComputationRenderer, size: number) {
		this.a = gpu.createRenderTarget(
			size,
			size,
			THREE.ClampToEdgeWrapping,
			THREE.ClampToEdgeWrapping,
			THREE.NearestFilter,
			THREE.NearestFilter
		);
		this.b = gpu.createRenderTarget(
			size,
			size,
			THREE.ClampToEdgeWrapping,
			THREE.ClampToEdgeWrapping,
			THREE.NearestFilter,
			THREE.NearestFilter
		);
	}
	get read() {
		return this.a;
	}
	get write() {
		return this.b;
	}
	swap() {
		const t = this.a;
		this.a = this.b;
		this.b = t;
	}
	dispose() {
		this.a.dispose();
		this.b.dispose();
	}
}

export interface SimInit {
	/** N × (x, y, rank, selected). */
	pos: Float32Array;
	/** N × (vx, vy, speed, age); age < 0 = not spawned. */
	vel: Float32Array;
}

export class Sim {
	readonly size: number;
	readonly N: number;
	readonly gpu: GPUComputationRenderer;
	readonly pos: Pair;
	readonly vel: Pair;
	readonly target: THREE.WebGLRenderTarget;
	readonly materials: {
		target: THREE.ShaderMaterial;
		velocity: THREE.ShaderMaterial;
		position: THREE.ShaderMaterial;
	};
	/** Shared by the crowd points, the density splats and the selection count (all N vertices). */
	readonly geometry: THREE.BufferGeometry;
	readonly points: THREE.Points;
	readonly densityPoints: THREE.Points;
	readonly countPoints: THREE.Points;
	readonly renderMaterial: THREE.ShaderMaterial;
	readonly densityMaterial: THREE.ShaderMaterial;
	readonly countMaterial: THREE.ShaderMaterial;

	constructor(
		renderer: THREE.WebGLRenderer,
		size: number,
		floatType: THREE.TextureDataType,
		private U: Uniforms,
		init: SimInit
	) {
		this.size = size;
		this.N = size * size;
		this.gpu = new GPUComputationRenderer(size, size, renderer);
		this.gpu.setDataType(floatType);
		this.pos = new Pair(this.gpu, size);
		this.vel = new Pair(this.gpu, size);
		this.target = this.gpu.createRenderTarget(
			size,
			size,
			THREE.ClampToEdgeWrapping,
			THREE.ClampToEdgeWrapping,
			THREE.NearestFilter,
			THREE.NearestFilter
		);
		this.materials = {
			target: this.gpu.createShaderMaterial(TARGET_FRAG, U),
			velocity: this.gpu.createShaderMaterial(VELOCITY_FRAG, U),
			position: this.gpu.createShaderMaterial(POSITION_FRAG, U)
		};
		this.materials.target.name = 'crowd.target.frag';
		this.materials.velocity.name = 'crowd.vel.frag';
		this.materials.position.name = 'crowd.pos.frag';
		this.load(init);

		// Vertex k draws entity perm[k]: draw-range cuts (governor) then thin the crowd evenly
		// instead of deleting whole letters at the end of the Hilbert order.
		const N = this.N;
		const attr = new Float32Array(N * 3);
		const perm = new Uint32Array(N);
		for (let i = 0; i < N; i++) perm[i] = i;
		const rand = mulberry32(0x5eed ^ N);
		for (let i = N - 1; i > 0; i--) {
			const j = (rand() * (i + 1)) | 0;
			const t = perm[i];
			perm[i] = perm[j];
			perm[j] = t;
		}
		for (let k = 0; k < N; k++) {
			const id = perm[k];
			attr[k * 3] = ((id % size) + 0.5) / size;
			attr[k * 3 + 1] = (Math.floor(id / size) + 0.5) / size;
			attr[k * 3 + 2] = id;
		}
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute('position', new THREE.BufferAttribute(attr, 3));
		this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

		this.renderMaterial = new THREE.ShaderMaterial({
			name: 'crowd.points',
			vertexShader: RENDER_VERT,
			fragmentShader: RENDER_FRAG,
			uniforms: U,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blending: THREE.NormalBlending
		});
		const additive = {
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blending: THREE.CustomBlending,
			blendEquation: THREE.AddEquation,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneFactor,
			blendEquationAlpha: THREE.AddEquation,
			blendSrcAlpha: THREE.OneFactor,
			blendDstAlpha: THREE.OneFactor
		} as const;
		this.densityMaterial = new THREE.ShaderMaterial({
			name: 'crowd.density',
			vertexShader: DENSITY_VERT,
			fragmentShader: DENSITY_FRAG,
			uniforms: U,
			...additive
		});
		this.countMaterial = new THREE.ShaderMaterial({
			name: 'crowd.count',
			vertexShader: COUNT_VERT,
			fragmentShader: COUNT_FRAG,
			uniforms: U,
			...additive
		});

		const mk = (m: THREE.ShaderMaterial) => {
			const p = new THREE.Points(this.geometry, m);
			p.frustumCulled = false;
			p.matrixAutoUpdate = false;
			return p;
		};
		this.points = mk(this.renderMaterial);
		this.densityPoints = mk(this.densityMaterial);
		this.countPoints = mk(this.countMaterial);
	}

	/** Uploads a full state (boot spawn layout, or positions rebuilt on the CPU). */
	load(init: SimInit): void {
		const size = this.size;
		const upload = (data: Float32Array, pair: Pair) => {
			const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
			tex.needsUpdate = true;
			this.gpu.renderTexture(tex, pair.a);
			this.gpu.renderTexture(tex, pair.b);
			tex.dispose();
		};
		upload(init.pos, this.pos);
		upload(init.vel, this.vel);
	}

	/**
	 * One frame: the target pass once, then `substeps` velocity + position passes. One-shot inputs
	 * (scroll shift, selection write, snap) apply on the first substep only.
	 */
	step(dt: number, substeps: number): void {
		const U = this.U;
		const gpu = this.gpu;
		U.uDt.value = dt;
		U.tPos.value = this.pos.read.texture;
		gpu.doRenderTarget(this.materials.target, this.target);
		U.tTarget.value = this.target.texture;
		for (let i = 0; i < substeps; i++) {
			U.tPos.value = this.pos.read.texture;
			U.tVel.value = this.vel.read.texture;
			gpu.doRenderTarget(this.materials.velocity, this.vel.write);
			this.vel.swap();
			U.tVel.value = this.vel.read.texture;
			gpu.doRenderTarget(this.materials.position, this.pos.write);
			this.pos.swap();
			U.uScrollShift.value = 0;
			U.uSelectPass.value = 0;
			U.uSnap.value = 0;
		}
		U.tPos.value = this.pos.read.texture;
		U.tVel.value = this.vel.read.texture;
	}

	/** Every material this sim compiles, with the object type it is drawn as (for compileAsync). */
	programs(): CompileJob[] {
		return [
			{ name: 'crowd.target.frag', material: this.materials.target, kind: 'quad', offscreen: true },
			{ name: 'crowd.vel.frag', material: this.materials.velocity, kind: 'quad', offscreen: true },
			{ name: 'crowd.pos.frag', material: this.materials.position, kind: 'quad', offscreen: true },
			{ name: 'crowd.density', material: this.densityMaterial, kind: 'points', offscreen: true },
			{ name: 'crowd.points', material: this.renderMaterial, kind: 'points', offscreen: false },
			{ name: 'crowd.count', material: this.countMaterial, kind: 'points', offscreen: true }
		];
	}

	setDrawFraction(f: number): void {
		this.geometry.setDrawRange(0, Math.max(1, Math.round(this.N * Math.min(1, Math.max(0, f)))));
	}

	dispose(): void {
		this.pos.dispose();
		this.vel.dispose();
		this.target.dispose();
		for (const m of Object.values(this.materials)) m.dispose();
		this.renderMaterial.dispose();
		this.densityMaterial.dispose();
		this.countMaterial.dispose();
		this.geometry.dispose();
		this.gpu.dispose();
	}
}
