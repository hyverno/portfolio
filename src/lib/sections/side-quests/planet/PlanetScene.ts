// Crazy Planet Survivor, the web recreation (§S5). Dynamic-import only: it pulls in three.
// One scissored GLView on the shared renderer: an inked, contoured, destructible planet, a GPGPU
// horde of cones chasing a signal player dot, craters, a nova every 2s, a dashed orbit gizmo, and
// damage numbers drawn inside the view (so the planet never paints over them).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BakeResult, DamageNumbers, Engine, GLView } from '#lib/gl/types';
import { TIER, device, type Tier } from '#lib/core/device.svelte';
import { hexToLinear, onThemeColors } from '#lib/core/theme.svelte';
import { gsap } from '#lib/core/motion';
import { PlanetSim } from './planetSim';
import { CAM, ORBIT, buildDisc, homePositions, setPlanetCount, silhouetteNdc } from './disc';
import {
	CONE_FRAG,
	CONE_VERT,
	HULL_FRAG,
	HULL_VERT,
	ORBIT_FRAG,
	ORBIT_VERT,
	PLANET_FRAG,
	PLANET_VERT,
	PLAYER_FRAG,
	PLAYER_VERT
} from './planet.glsl';

export type Biome = 'earth' | 'ice';

export interface PlanetStats {
	entities: number;
	craters: number;
	biome: Biome;
}

export interface PlanetOptions {
	engine: Engine;
	tier: Tier;
	/** 'pinned': the pinned scroll drives the pose (setProgress). 'auto': it spins by itself. */
	mode: 'pinned' | 'auto';
	reduced: boolean;
	onStats(s: PlanetStats): void;
	/**
	 * Orbit label anchors in stage px (the ring's left-most point and the lowest point of its near
	 * arc) and the planet's disc (centre, radius) on screen, whenever they move.
	 */
	onOrbit?(left: { x: number; y: number }, low: { x: number; y: number }, disc: { x: number; y: number; r: number }): void;
	/** Crater radius on screen, px (cursor ring). */
	onCraterPx?(px: number): void;
	/** A user cast dug a crater (total user casts so far). */
	onUserCast?(n: number): void;
}

export interface Planet {
	view: GLView;
	readonly entities: number;
	/** Casts at viewport px. Returns false when the ray misses the planet. */
	cast(xPx: number, yPx: number): boolean;
	/** Casts at the point facing the camera (Space). */
	castCenter(): void;
	/** Is this viewport point over the planet's disc? */
	over(xPx: number, yPx: number): boolean;
	setBiome(b: Biome, dur?: number): void;
	/** Scrubbed biome (0 earth → 1 ice). Kills a running biome tween. */
	setBiomeMix(m: number): void;
	/** Pinned pose for the section progress p (0..1). */
	setProgress(p: number): void;
	discTargets(N: number): BakeResult;
	/** Entity opacity (screen-door), 0..1. */
	setVisible(a: number): void;
	/** Handoff: cones fade in 150ms and the plate draws in with a contour sweep (600ms), or both out. */
	show(on: boolean, o?: { duration?: number; reset?: boolean }): void;
	/** ←/→: nudge the yaw. */
	nudge(dir: -1 | 1): void;
	dispose(): void;
}

const MAX_CRATERS = 8;
const CRATER_DEPTH = 0.12;
const CRATER_R = 0.22;
const NOVA_EVERY = 2;
// Key light from the upper left, a little behind the camera's shoulder: a readable crescent.
const LIGHT = new THREE.Vector3(-0.66, 0.52, 0.54).normalize();
const SWEEP_AXIS = new THREE.Vector3(0.55, 0.75, 0.37).normalize();
const PAL = {
	earth: ['', '#8FA98B', '#D9A441'],
	ice: ['#22406B', '#A9D6F5', '']
};

const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

function coneGeometry(): THREE.BufferGeometry {
	// 4-sided pyramid: apex on +z, square base at z = 0 spanning [-1, 1].
	const A = [0, 0, 1];
	const B = [
		[-1, -1, 0],
		[1, -1, 0],
		[1, 1, 0],
		[-1, 1, 0]
	];
	const tris = [
		[A, B[0], B[1]],
		[A, B[1], B[2]],
		[A, B[2], B[3]],
		[A, B[3], B[0]],
		[B[0], B[2], B[1]],
		[B[0], B[3], B[2]]
	];
	const pos = new Float32Array(tris.length * 9);
	tris.forEach((t, i) => t.forEach((v, j) => pos.set(v, i * 9 + j * 3)));
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	return g;
}

/** Even spread over the whole sphere (auto mode has no handoff: the horde starts everywhere). */
function fullSphere(n: number): Float32Array {
	const out = new Float32Array(n * 4);
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let k = 0; k < n; k++) {
		const z = 1 - (2 * (k + 0.5)) / n;
		const s = Math.sqrt(Math.max(0, 1 - z * z));
		out[k * 4] = s * Math.cos(k * golden);
		out[k * 4 + 1] = z;
		out[k * 4 + 2] = s * Math.sin(k * golden);
	}
	return out;
}

function ribbonGeometry(segments: number): THREE.BufferGeometry {
	const n = segments + 1;
	const t = new Float32Array(n * 2);
	const side = new Float32Array(n * 2);
	const pos = new Float32Array(n * 2 * 3);
	const idx: number[] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / segments) * Math.PI * 2;
		t[i * 2] = a;
		t[i * 2 + 1] = a;
		side[i * 2] = -1;
		side[i * 2 + 1] = 1;
		if (i < segments) {
			const k = i * 2;
			idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
	g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
	g.setIndex(idx);
	return g;
}

export function createPlanet(el: HTMLElement, o: PlanetOptions): Planet {
	const engine = o.engine;
	const renderer = engine.renderer as THREE.WebGLRenderer;
	const [sw, sh] = TIER[o.tier].planet;
	const detail = TIER[o.tier].planetDetail;
	const floatType = device.floatRT === 'half' ? THREE.HalfFloatType : THREE.FloatType;
	const home = o.mode === 'auto' ? fullSphere(sw * sh) : homePositions(sw * sh);
	if (o.mode === 'pinned') setPlanetCount(sw * sh);
	const sim = new PlanetSim(renderer, sw, sh, floatType, home);
	const N = sim.N;

	// ── shared uniforms ────────────────────────────────────────────────────────────────────
	const craterVecs = Array.from({ length: MAX_CRATERS }, () => new THREE.Vector4(0, 1, 0, 0));
	const T = {
		uCraters: { value: craterVecs },
		uAmp: { value: o.mode === 'auto' ? 1 : 0 },
		uBiome: { value: 0 },
		uSeed: { value: new THREE.Vector3(3.1, 7.7, 1.3) },
		uRelief: { value: 0.55 }
	};
	const C = {
		uPaper: { value: new THREE.Vector3(0.79, 0.78, 0.69) },
		uInk: { value: new THREE.Vector3(0.007, 0.008, 0.005) },
		uGraphite: { value: new THREE.Vector3(0.1, 0.11, 0.08) },
		uSignal: { value: new THREE.Vector3(1, 0.068, 0.012) }
	};
	const lin = (hex: string) => new THREE.Vector3(...hexToLinear(hex));
	const earth = [C.uPaper.value.clone(), lin(PAL.earth[1]), lin(PAL.earth[2])];
	const ice = [lin(PAL.ice[0]), lin(PAL.ice[1]), C.uPaper.value.clone()];
	const dither = { value: Math.max(1, Math.round(renderer.getPixelRatio())) };
	const viewport = { value: new THREE.Vector2(1, 1) };
	const reveal = { value: o.mode === 'auto' ? 1 : 0 };
	const sweepAxis = { value: SWEEP_AXIS.clone() };
	const camPos = { value: new THREE.Vector3(0, 0, CAM.z0) };
	const light = { value: LIGHT.clone() };
	const player = new THREE.Vector3(0, 0, 1);
	const playerU = { value: player };
	const nova = { value: new THREE.Vector4(0, 0, 1, -1) };
	const shock = { value: new THREE.Vector4(0, 0, 1, -1) };
	const alpha = { value: o.mode === 'auto' ? 1 : 0 };
	const playerOn = { value: 0 };

	const offTheme = onThemeColors((c) => {
		C.uPaper.value.fromArray(c.paper);
		C.uInk.value.fromArray(c.ink);
		C.uGraphite.value.fromArray(c.graphite);
		C.uSignal.value.fromArray(c.signal);
		earth[0].fromArray(c.paper);
		ice[2].fromArray(c.paper).lerp(new THREE.Vector3(1, 1, 1), 0.35);
	});

	// ── scene ──────────────────────────────────────────────────────────────────────────────
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(CAM.fov, 1, CAM.near, CAM.far);
	camera.position.set(0, 0, CAM.z0);
	camera.lookAt(0, 0, 0);
	const world = new THREE.Group();
	scene.add(world);

	let sphereGeo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
	sphereGeo.deleteAttribute('normal');
	sphereGeo.deleteAttribute('uv');
	sphereGeo = mergeVertices(sphereGeo);

	const planetMat = new THREE.ShaderMaterial({
		name: 'planet.plate',
		vertexShader: PLANET_VERT,
		fragmentShader: PLANET_FRAG,
		uniforms: {
			...T,
			...C,
			uEarth: { value: earth },
			uIce: { value: ice },
			uLight: light,
			uCamPos: camPos,
			uDither: dither,
			uReveal: reveal,
			uSweepAxis: sweepAxis,
			uPlayer: playerU,
			uPlayerOn: playerOn,
			uNova: nova,
			uShock: shock
		}
	});
	const sphere = new THREE.Mesh(sphereGeo, planetMat);
	sphere.frustumCulled = false;
	world.add(sphere);

	const hullMat = new THREE.ShaderMaterial({
		name: 'planet.hull',
		vertexShader: HULL_VERT,
		fragmentShader: HULL_FRAG,
		side: THREE.BackSide,
		uniforms: { ...T, uInk: C.uInk, uViewport: viewport, uWidth: { value: 1.35 }, uReveal: reveal, uSweepAxis: sweepAxis }
	});
	const hull = new THREE.Mesh(sphereGeo, hullMat);
	hull.frustumCulled = false;
	world.add(hull);

	const coneGeo = coneGeometry();
	const coneMat = new THREE.ShaderMaterial({
		name: 'planet.cones',
		vertexShader: CONE_VERT,
		fragmentShader: CONE_FRAG,
		side: THREE.DoubleSide,
		uniforms: {
			...T,
			tPos: { value: sim.posTexture },
			tVel: { value: sim.velTexture },
			uSimSize: { value: new THREE.Vector2(sw, sh) },
			uCone: { value: new THREE.Vector2(0.02, 0.0054) },
			uGrow: { value: 1 },
			uInk: C.uInk,
			uGraphite: C.uGraphite,
			uLight: light,
			uAlpha: alpha,
			uDither: dither
		}
	});
	// A paper halo under every unit (map-marker style), so the horde reads on dark ice and ochre
	// alike. Shares the cones' uniform objects; draws first and writes no depth.
	const haloMat = new THREE.ShaderMaterial({
		name: 'planet.cones.halo',
		vertexShader: CONE_VERT,
		fragmentShader: CONE_FRAG,
		side: THREE.DoubleSide,
		depthWrite: false,
		uniforms: { ...coneMat.uniforms, uGrow: { value: 1.75 }, uInk: C.uPaper, uGraphite: C.uPaper }
	});
	const halo = new THREE.InstancedMesh(coneGeo, haloMat, N);
	halo.frustumCulled = false;
	halo.renderOrder = 1;
	world.add(halo);
	const cones = new THREE.InstancedMesh(coneGeo, coneMat, N);
	cones.frustumCulled = false;
	cones.renderOrder = 2;
	world.add(cones);

	const playerGeo = new THREE.IcosahedronGeometry(1, 2);
	const playerMat = new THREE.ShaderMaterial({
		name: 'planet.player',
		vertexShader: PLAYER_VERT,
		fragmentShader: PLAYER_FRAG,
		uniforms: {
			...T,
			uPlayer: playerU,
			uSize: { value: 0.021 },
			uSignal: C.uSignal,
			uInk: C.uInk,
			uLight: light,
			uCamPos: camPos,
			uAlpha: alpha,
			uDither: dither
		}
	});
	const playerMesh = new THREE.Mesh(playerGeo, playerMat);
	playerMesh.frustumCulled = false;
	world.add(playerMesh);

	const tilt = new THREE.Matrix3().setFromMatrix4(
		new THREE.Matrix4().makeRotationZ(ORBIT.tiltZ).multiply(new THREE.Matrix4().makeRotationX(ORBIT.tiltX))
	);
	const orbitAlpha = { value: 0 };
	const orbitMat = new THREE.ShaderMaterial({
		name: 'planet.orbit',
		vertexShader: ORBIT_VERT,
		fragmentShader: ORBIT_FRAG,
		transparent: true,
		depthWrite: false,
		// The ribbon is extruded in screen space: its winding is the same all around, so no culling.
		side: THREE.DoubleSide,
		uniforms: {
			uRadius: { value: ORBIT.radius },
			uTilt: { value: tilt },
			uViewport: viewport,
			uWidth: { value: 3.6 },
			uCore: { value: 0.4 },
			uColor: C.uInk,
			uHalo: C.uPaper,
			uDashes: { value: ORBIT.dashes },
			uDuty: { value: ORBIT.duty },
			uAlpha: orbitAlpha
		}
	});
	const orbit = new THREE.Mesh(ribbonGeometry(256), orbitMat);
	orbit.frustumCulled = false;
	scene.add(orbit);

	// ── state ──────────────────────────────────────────────────────────────────────────────
	let w = Math.max(1, el.clientWidth);
	let h = Math.max(1, el.clientHeight);
	let time = 0;
	let disposed = false;
	let simLive = o.mode === 'auto';
	let pinnedP = 0;
	let rot = 0;
	let yaw = 0;
	let releaseK = 0;
	let dolly: number = CAM.z0;
	let chase = o.mode === 'auto' ? 1 : 0;
	let novaClock = 0;
	let userCasts = 0;
	let craterHead = 0;
	let craterCount = 0;
	let biome: Biome = 'earth';
	let lastStats = '';
	let fromCapture = false;
	const yawT = { v: 0 };
	const biomeT = { v: 0 };
	const vis = { a: alpha.value, r: reveal.value };
	const playerStart = new THREE.Vector3();
	const tmpV = new THREE.Vector3();
	const face = new THREE.Vector3();
	const east = new THREE.Vector3();
	const north = new THREE.Vector3();
	const goal = new THREE.Vector3();
	const axisV = new THREE.Vector3();
	const UP = new THREE.Vector3(0, 1, 0);
	const SPAWN = new THREE.Vector3(0, 0, 1);
	const tmpQ = new THREE.Quaternion();
	const inv = new THREE.Quaternion();
	const ray = new THREE.Ray();
	const ndc = new THREE.Vector3();
	const sphereHit = new THREE.Sphere(new THREE.Vector3(), 1);
	const craterTweens: (gsap.core.Tween | null)[] = new Array(MAX_CRATERS).fill(null);

	let numbers: DamageNumbers | null = null;

	const view: GLView = {
		el,
		scene,
		camera,
		active: o.mode === 'auto',
		update,
		onResize(nw, nh) {
			w = Math.max(1, nw);
			h = Math.max(1, nh);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			viewport.value.set(w, h);
			dither.value = Math.max(1, Math.round(renderer.getPixelRatio()));
			const fx = numbers as (DamageNumbers & { size?: number }) | null;
			if (fx && 'size' in fx) fx.size = h < 560 ? 15 : 21;
			reportGeometry(true);
		}
	};
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	viewport.value.set(w, h);
	const offView = engine.addView(view);
	numbers = engine.createNumbers({ capacity: 384, view });

	// Warm the programs up in parallel (KHR_parallel_shader_compile) instead of on first sight.
	void warmUp();

	function statsNow() {
		const s: PlanetStats = { entities: N, craters: craterCount, biome };
		const key = `${s.entities}|${s.craters}|${s.biome}`;
		if (key !== lastStats) {
			lastStats = key;
			o.onStats(s);
		}
	}
	statsNow();

	async function warmUp() {
		try {
			const quad = new THREE.BufferGeometry();
			quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
			quad.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
			const simScene = new THREE.Scene();
			for (const m of sim.materials()) {
				const q = new THREE.Mesh(quad, m);
				q.frustumCulled = false;
				simScene.add(q);
			}
			const target = new THREE.WebGLRenderTarget(1, 1, { type: floatType, depthBuffer: false });
			const prev = renderer.getRenderTarget();
			renderer.setRenderTarget(target);
			const a = renderer.compileAsync(simScene, camera);
			renderer.setRenderTarget(prev);
			const b = renderer.compileAsync(scene, camera);
			await Promise.all([a, b]);
			target.dispose();
			quad.dispose();
		} catch {
			// Programs compile on first use instead.
		}
	}

	// ── helpers ────────────────────────────────────────────────────────────────────────────

	/**
	 * Planet-space unit direction → stage px (y down). Returns whether the point faces the camera
	 * (beyond the silhouette it is hidden by the planet itself).
	 */
	function toStage(dir: THREE.Vector3, out: { x: number; y: number }, lift = 0): boolean {
		tmpV.copy(dir).applyQuaternion(world.quaternion);
		const visible = tmpV.z > 1 / dolly;
		tmpV.multiplyScalar(1 + lift).project(camera);
		out.x = (tmpV.x * 0.5 + 0.5) * w;
		out.y = (1 - (tmpV.y * 0.5 + 0.5)) * h;
		return visible;
	}

	/** Camera-facing direction in planet space. */
	function facing(out: THREE.Vector3) {
		inv.copy(world.quaternion).invert();
		return out.set(0, 0, 1).applyQuaternion(inv);
	}

	let lastOrbitKey = '';
	const orbitPts = Array.from({ length: 72 }, (_, i) => {
		const a = (i / 72) * Math.PI * 2;
		return new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(ORBIT.radius).applyMatrix3(tilt);
	});
	function reportGeometry(force = false) {
		// Orbit label anchors: the ring's left-most point and the lowest point of its near arc
		// (both outside the planet's disc, so the DOM labels under the canvas are never covered).
		let lx = Infinity;
		let ly = 0;
		let rx = 0;
		let ry = -Infinity;
		for (const p of orbitPts) {
			tmpV.copy(p).project(camera);
			const x = (tmpV.x * 0.5 + 0.5) * w;
			const y = (1 - (tmpV.y * 0.5 + 0.5)) * h;
			if (x < lx) {
				lx = x;
				ly = y;
			}
			if (y > ry) {
				rx = x;
				ry = y;
			}
		}
		const discR = silhouetteNdc(dolly) * (h / 2);
		const key = `${lx | 0},${ly | 0},${rx | 0},${ry | 0},${discR | 0}`;
		if (force || key !== lastOrbitKey) {
			lastOrbitKey = key;
			o.onOrbit?.({ x: lx, y: ly }, { x: rx, y: ry }, { x: w / 2, y: h / 2, r: discR });
		}
		const t = Math.tan(((CAM.fov * Math.PI) / 180) / 2);
		o.onCraterPx?.(Math.round((CRATER_R / ((dolly - 1) * t)) * (h / 2)));
	}

	function rect() {
		return el.getBoundingClientRect();
	}

	/** Viewport px → planet-space hit direction (analytic ray–sphere), or null. */
	function pick(xPx: number, yPx: number, out: THREE.Vector3): boolean {
		const r = rect();
		ndc.set(((xPx - r.left) / r.width) * 2 - 1, -(((yPx - r.top) / r.height) * 2 - 1), 0.5);
		camera.updateMatrixWorld();
		ray.origin.copy(camera.position);
		ray.direction.copy(ndc.unproject(camera).sub(camera.position).normalize());
		if (!ray.intersectSphere(sphereHit, out)) return false;
		inv.copy(world.quaternion).invert();
		out.applyQuaternion(inv).normalize();
		return true;
	}

	function dig(dir: THREE.Vector3) {
		const slot = craterHead % MAX_CRATERS;
		craterHead++;
		const v = craterVecs[slot];
		craterTweens[slot]?.kill();
		const grow = () => {
			v.set(dir.x, dir.y, dir.z, 0);
			if (o.reduced) {
				v.w = CRATER_DEPTH;
				return;
			}
			craterTweens[slot] = gsap.to(v, { w: CRATER_DEPTH, duration: 0.4, ease: 'spawn' });
		};
		if (v.w > 0 && !o.reduced) {
			// Ring buffer full: the oldest crater fills back in first (250ms), then the new one digs.
			craterTweens[slot] = gsap.to(v, { w: 0, duration: 0.25, ease: 'despawn', onComplete: grow });
		} else grow();
		craterCount = Math.min(MAX_CRATERS, craterCount + 1);
	}

	const burstAt = { x: 0, y: 0 };
	function castDir(dir: THREE.Vector3, user: boolean) {
		dig(dir);
		sim.hit(dir, 1);
		shock.value.set(dir.x, dir.y, dir.z, 0);
		if (!o.reduced && numbers) {
			const seen = toStage(dir, burstAt, 0.02);
			if (seen) numbers.burst(burstAt.x, burstAt.y, {
					count: h < 560 ? 7 : 11,
					radius: h < 560 ? 40 : 58,
					critRate: 0.4
				});
		}
		if (user) {
			userCasts++;
			o.onUserCast?.(userCasts);
		}
		statsNow();
	}

	// ── per frame (only while the view is on screen and active) ────────────────────────────
	function update(_t: number, dtIn: number) {
		if (disposed) return;
		const dt = Math.min(dtIn, 0.1);
		time += dt;

		// Pose.
		if (o.mode === 'auto') {
			rot += dt * (o.reduced ? 0.02 : 0.11);
			world.rotation.y = rot + yawT.v;
		} else {
			world.rotation.y = rot + yawT.v * (1 - releaseK);
		}
		camera.position.z = dolly;
		camera.updateMatrixWorld();
		camPos.value.copy(camera.position);
		world.updateMatrixWorld();
		// Cones keep their size on screen (≈10 × 5 px) whatever the stage size or the dolly.
		const worldPerPx = (2 * Math.tan(((CAM.fov * Math.PI) / 180) / 2) * (dolly - 1)) / h;
		const small = h < 560 ? 0.85 : 1;
		coneMat.uniforms.uCone.value.set(10 * worldPerPx * small, 2.5 * worldPerPx * small);

		// Player: wanders around the face the camera sees (the planet turns under it).
		facing(face);
		east.crossVectors(UP, face).normalize();
		north.crossVectors(face, east).normalize();
		const wt = o.reduced ? 0 : time;
		goal
			.copy(face)
			.addScaledVector(east, 0.42 * Math.sin(wt * 0.31) + 0.16 * Math.sin(wt * 0.77 + 1.3))
			.addScaledVector(north, 0.28 * Math.sin(wt * 0.43 + 2.1) + 0.1 * Math.sin(wt * 1.13))
			.normalize();
		if (o.mode === 'pinned' && releaseK > 0) {
			// Release: walk back to the spawn point (the crowd's signal dot).
			player.copy(playerStart).lerp(SPAWN, smooth(0, 1, releaseK)).normalize();
		} else if (o.mode === 'pinned' && chase < 0.3) {
			player.copy(SPAWN);
			playerStart.copy(player);
		} else {
			const ang = player.angleTo(goal);
			const step = Math.min(ang, dt * (o.reduced ? 0.05 : Math.max(0.5, ang * 1.4)));
			if (ang > 1e-4) {
				axisV.crossVectors(player, goal).normalize();
				tmpQ.setFromAxisAngle(axisV, step);
				player.applyQuaternion(tmpQ).normalize();
			}
			playerStart.copy(player);
		}

		// Auto-spell: a nova around the player every 2s while the horde is chasing.
		nova.value.w = nova.value.w >= 0 ? nova.value.w + dt : -1;
		shock.value.w = shock.value.w >= 0 ? shock.value.w + dt : -1;
		if (!o.reduced && chase > 0.6 && simLive && vis.a > 0.5) {
			novaClock += dt;
			if (novaClock >= NOVA_EVERY) {
				novaClock = 0;
				sim.nova(player, 1);
				nova.value.set(player.x, player.y, player.z, 0);
				if (numbers) {
					const seen = toStage(player, burstAt, 0.02);
					if (seen) numbers.burst(burstAt.x, burstAt.y, { count: h < 560 ? 3 : 5, radius: 36, critRate: 0.1 });
				}
			}
		}

		// Sim.
		if (simLive) {
			sim.U.uPlayer.value.copy(player);
			sim.U.uChase.value = chase;
			sim.U.uFacing.value.copy(face);
			sim.U.uRecycle.value = o.reduced ? 0 : chase;
			sim.U.uWander.value = o.reduced ? 0.15 : 1;
			sim.step(dt * (o.reduced ? 0.25 : 1), time);
			coneMat.uniforms.tPos.value = sim.posTexture;
			coneMat.uniforms.tVel.value = sim.velTexture;
		}
		playerOn.value = Math.min(vis.a, chase > 0 ? 1 : 0.0) * (o.mode === 'auto' || pinnedP > 0.26 ? 1 : 0);
		reportGeometry();
	}

	function refreshActive() {
		view.active = o.mode === 'auto' || vis.a > 0.001 || vis.r > 0.001;
	}

	// ── API ────────────────────────────────────────────────────────────────────────────────
	const api: Planet = {
		view,
		entities: N,
		cast(xPx, yPx) {
			const dir = new THREE.Vector3();
			if (!pick(xPx, yPx, dir)) return false;
			castDir(dir, true);
			return true;
		},
		castCenter() {
			const dir = facing(new THREE.Vector3());
			// A little scatter so repeated presses do not stack in one hole.
			dir.x += (Math.random() - 0.5) * 0.3;
			dir.y += (Math.random() - 0.5) * 0.3;
			castDir(dir.normalize(), true);
		},
		over(xPx, yPx) {
			return pick(xPx, yPx, new THREE.Vector3());
		},
		setBiome(b, dur = 0.24) {
			biome = b;
			gsap.killTweensOf(biomeT);
			const to = b === 'ice' ? 1 : 0;
			if (dur <= 0 || o.reduced) {
				biomeT.v = to;
				T.uBiome.value = to;
			} else {
				gsap.to(biomeT, {
					v: to,
					duration: dur,
					ease: 'snap',
					onUpdate: () => void (T.uBiome.value = biomeT.v)
				});
			}
			statsNow();
		},
		setBiomeMix(m) {
			gsap.killTweensOf(biomeT);
			biomeT.v = m;
			T.uBiome.value = m;
			const b: Biome = m >= 0.5 ? 'ice' : 'earth';
			if (b !== biome) {
				biome = b;
				statsNow();
			}
		},
		setProgress(p) {
			pinnedP = p;
			// World: rotation 0 → 1.4π and dolly z0 → z1. Release: on to 2π (≡ the handoff pose) and back.
			const world01 = smooth(0.32, 0.85, p);
			releaseK = smooth(0.85, 0.93, p);
			rot = Math.PI * 1.4 * world01 + Math.PI * 0.6 * releaseK;
			dolly = CAM.z0 + (CAM.z1 - CAM.z0) * world01 - (CAM.z1 - CAM.z0) * releaseK;
			// The ground rises after the handoff and flattens before the reverse one.
			T.uAmp.value = smooth(0.27, 0.36, p) * (1 - smooth(0.87, 0.93, p));
			chase = smooth(0.3, 0.38, p) * (1 - smooth(0.85, 0.89, p));
			// Homes: held through the handoff, released into the World, gathered back for the release.
			const releasing = p > 0.85;
			if (releasing && !fromCapture) {
				sim.snapshot();
				fromCapture = true;
				playerStart.copy(player);
			} else if (!releasing && fromCapture) {
				fromCapture = false;
			}
			sim.U.uFromCapture.value = fromCapture ? 1 : 0;
			sim.U.uHomeMix.value = releasing ? smooth(0.86, 0.93, p) : 1 - smooth(0.29, 0.37, p);
			orbitAlpha.value = vis.r;
		},
		discTargets(n) {
			let seed = 0x9e3779b9;
			const rand = () => {
				seed = (seed + 0x6d2b79f5) >>> 0;
				let t = seed;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
			return buildDisc({ N: n, w, h, rand, el });
		},
		setVisible(a) {
			gsap.killTweensOf(vis, 'a');
			vis.a = a;
			alpha.value = a;
			refreshActive();
		},
		show(on, opt = {}) {
			const d = opt.duration ?? 0.15;
			gsap.killTweensOf(vis);
			if (on) {
				if (opt.reset) {
					sim.reset();
					player.set(0, 0, 1);
					playerStart.copy(player);
					novaClock = 0;
				}
				simLive = true;
				refreshActive();
				view.active = true;
				gsap.to(vis, {
					a: 1,
					duration: o.reduced ? 0 : d,
					ease: 'none',
					onUpdate: () => void (alpha.value = vis.a)
				});
				gsap.to(vis, {
					r: 1,
					duration: o.reduced ? 0 : 0.6,
					ease: 'steer',
					onUpdate: () => {
						reveal.value = vis.r;
						orbitAlpha.value = vis.r;
					}
				});
			} else {
				gsap.to(vis, {
					a: 0,
					duration: o.reduced ? 0 : d,
					ease: 'none',
					onUpdate: () => void (alpha.value = vis.a)
				});
				gsap.to(vis, {
					r: 0,
					duration: o.reduced ? 0 : 0.6,
					ease: 'despawn',
					onUpdate: () => {
						reveal.value = vis.r;
						orbitAlpha.value = vis.r;
					},
					onComplete: () => {
						simLive = o.mode === 'auto';
						refreshActive();
					}
				});
			}
		},
		nudge(dir) {
			gsap.to(yawT, { v: yawT.v + dir * 0.4, duration: o.reduced ? 0 : 0.48, ease: 'steer', overwrite: 'auto' });
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			offView();
			offTheme();
			gsap.killTweensOf([vis, yawT, biomeT, ...craterVecs]);
			// The implementation has dispose(); the public DamageNumbers type does not declare it.
			(numbers as (DamageNumbers & { dispose?(): void }) | null)?.dispose?.();
			numbers = null;
			sim.dispose();
			sphereGeo.dispose();
			coneGeo.dispose();
			playerGeo.dispose();
			orbit.geometry.dispose();
			for (const m of [planetMat, hullMat, coneMat, haloMat, playerMat, orbitMat]) m.dispose();
			cones.dispose();
			halo.dispose();
			setPlanetCount(null);
			if (import.meta.env.DEV) delete (window as unknown as { __planet?: unknown }).__planet;
		}
	};
	if (o.mode === 'auto') {
		simLive = true;
		orbitAlpha.value = 1;
		sim.U.uHomeMix.value = 0;
	}
	if (import.meta.env.DEV) {
		// Dev-only inspection handle for scripted checks.
		(window as unknown as { __planet?: unknown }).__planet = {
			scene,
			camera,
			world,
			sphere,
			hull,
			cones,
			orbit,
			playerMesh,
			sim,
			uniforms: { T, reveal, alpha, orbitAlpha, viewport },
			state: () => ({ w, h, rot, dolly, chase, simLive, a: vis.a, r: vis.r, active: view.active, craterCount, biome })
		};
	}
	return api;
}
