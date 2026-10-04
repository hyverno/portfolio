// The planet's own GPGPU crowd (§S5 "Planet entities"): position = unit normal (+ hop in w),
// velocity tangent (+ hop speed in w), ping-ponged on GPUComputationRenderer's plumbing. Passes run
// velocity → position (semi-implicit Euler), like the main crowd. Size from TIER[tier].planet.
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { SIM_COPY, SIM_POS, SIM_VEL } from './planet.glsl';

class Pair {
	a: THREE.WebGLRenderTarget;
	b: THREE.WebGLRenderTarget;
	constructor(gpu: GPUComputationRenderer, w: number, h: number) {
		const rt = () =>
			gpu.createRenderTarget(w, h, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter);
		this.a = rt();
		this.b = rt();
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

export interface SimUniforms {
	[k: string]: THREE.IUniform;
}

export class PlanetSim {
	readonly w: number;
	readonly h: number;
	readonly N: number;
	readonly U: SimUniforms;
	private gpu: GPUComputationRenderer;
	private pos: Pair;
	private vel: Pair;
	private capture: THREE.WebGLRenderTarget;
	private home: THREE.DataTexture;
	private velMat: THREE.ShaderMaterial;
	private posMat: THREE.ShaderMaterial;
	private copyMat: THREE.ShaderMaterial;
	private homeData: Float32Array;

	constructor(renderer: THREE.WebGLRenderer, w: number, h: number, floatType: THREE.TextureDataType, home: Float32Array) {
		this.w = w;
		this.h = h;
		this.N = w * h;
		this.homeData = home;
		this.gpu = new GPUComputationRenderer(w, h, renderer);
		this.gpu.setDataType(floatType);
		this.pos = new Pair(this.gpu, w, h);
		this.vel = new Pair(this.gpu, w, h);
		this.capture = this.gpu.createRenderTarget(w, h, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter);
		this.home = new THREE.DataTexture(home, w, h, THREE.RGBAFormat, THREE.FloatType);
		this.home.minFilter = THREE.NearestFilter;
		this.home.magFilter = THREE.NearestFilter;
		this.home.needsUpdate = true;

		this.U = {
			tPos: { value: null },
			tVel: { value: null },
			tHome: { value: this.home },
			tCapture: { value: this.capture.texture },
			tSrc: { value: null },
			uDt: { value: 1 / 60 },
			uTime: { value: 0 },
			uPlayer: { value: new THREE.Vector3(0, 0, 1) },
			uChase: { value: 0 },
			uWander: { value: 1 },
			uNova: { value: new THREE.Vector4(0, 0, 1, 0) },
			uHit: { value: new THREE.Vector4(0, 0, 1, 0) },
			uHitR: { value: 0.22 },
			uHitSeed: { value: 0 },
			uHomeMix: { value: 1 },
			uFromCapture: { value: 0 },
			uFacing: { value: new THREE.Vector3(0, 0, 1) },
			uRecycle: { value: 0 }
		};
		this.velMat = this.gpu.createShaderMaterial(SIM_VEL, this.U);
		this.posMat = this.gpu.createShaderMaterial(SIM_POS, this.U);
		this.copyMat = this.gpu.createShaderMaterial(SIM_COPY, this.U);
		this.velMat.name = 'planet.vel';
		this.posMat.name = 'planet.pos';
		this.copyMat.name = 'planet.copy';
		this.reset();
	}

	get posTexture(): THREE.Texture {
		return this.pos.read.texture;
	}

	get velTexture(): THREE.Texture {
		return this.vel.read.texture;
	}

	/** Everyone back on their home slot, standing still. */
	reset(): void {
		const zero = new THREE.DataTexture(new Float32Array(this.N * 4), this.w, this.h, THREE.RGBAFormat, THREE.FloatType);
		zero.needsUpdate = true;
		this.gpu.renderTexture(this.home, this.pos.a);
		this.gpu.renderTexture(this.home, this.pos.b);
		this.gpu.renderTexture(zero, this.vel.a);
		this.gpu.renderTexture(zero, this.vel.b);
		this.gpu.renderTexture(this.home, this.capture);
		zero.dispose();
	}

	/** Freezes the current positions as the start of the release slerp. */
	snapshot(): void {
		this.U.tSrc.value = this.pos.read.texture;
		this.gpu.doRenderTarget(this.copyMat, this.capture);
		this.U.tSrc.value = null;
	}

	/** One frame. One-shot impulses (hit, nova) are consumed here. */
	step(dt: number, time: number): void {
		const U = this.U;
		U.uDt.value = Math.min(dt, 1 / 30);
		U.uTime.value = time;
		U.tPos.value = this.pos.read.texture;
		U.tVel.value = this.vel.read.texture;
		this.gpu.doRenderTarget(this.velMat, this.vel.write);
		this.vel.swap();
		U.tVel.value = this.vel.read.texture;
		this.gpu.doRenderTarget(this.posMat, this.pos.write);
		this.pos.swap();
		U.tPos.value = this.pos.read.texture;
		(U.uHit.value as THREE.Vector4).w = 0;
		(U.uNova.value as THREE.Vector4).w = 0;
	}

	hit(dir: THREE.Vector3, strength: number): void {
		(this.U.uHit.value as THREE.Vector4).set(dir.x, dir.y, dir.z, strength);
		this.U.uHitSeed.value = Math.random() * 1000;
	}

	nova(dir: THREE.Vector3, strength: number): void {
		(this.U.uNova.value as THREE.Vector4).set(dir.x, dir.y, dir.z, strength);
	}

	/** Programs to warm up (drawn as the full-screen quad, into a target). */
	materials(): THREE.ShaderMaterial[] {
		return [this.velMat, this.posMat, this.copyMat];
	}

	get homes(): Float32Array {
		return this.homeData;
	}

	dispose(): void {
		this.pos.dispose();
		this.vel.dispose();
		this.capture.dispose();
		this.home.dispose();
		this.velMat.dispose();
		this.posMat.dispose();
		this.copyMat.dispose();
		this.gpu.dispose();
	}
}
