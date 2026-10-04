// The d20 of the Invokyr slot: icosahedron data (the same 12 vertices / 30 edges / 20 faces as
// three's IcosahedronGeometry(1, 0), computed here so nothing on the page imports three), a face
// numbering where opposite faces sum to 21, and the small quaternion kit the roll needs.
// Crowd.setRotation takes Euler angles in three's 'XYZ' order, so orientations are slerped as
// quaternions and converted once per frame.

export type Vec3 = [number, number, number];
/** x, y, z, w */
export type Quat = [number, number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;
const RAW: Vec3[] = [
	[-1, PHI, 0],
	[1, PHI, 0],
	[-1, -PHI, 0],
	[1, -PHI, 0],
	[0, -1, PHI],
	[0, 1, PHI],
	[0, -1, -PHI],
	[0, 1, -PHI],
	[PHI, 0, -1],
	[PHI, 0, 1],
	[-PHI, 0, -1],
	[-PHI, 0, 1]
];
const R0 = Math.hypot(1, PHI);

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
const norm = (a: Vec3): Vec3 => {
	const l = Math.hypot(a[0], a[1], a[2]) || 1;
	return [a[0] / l, a[1] / l, a[2] / l];
};

/** The 12 vertices on the unit sphere. */
export const VERTS: Vec3[] = RAW.map(([x, y, z]) => [x / R0, y / R0, z / R0]);
const EDGE_LEN = 2 / R0;

/** The 30 deduplicated edges (vertex index pairs). */
export const EDGES: [number, number][] = [];
for (let i = 0; i < 12; i++) {
	for (let j = i + 1; j < 12; j++) {
		const d = sub(VERTS[i], VERTS[j]);
		if (Math.abs(Math.hypot(d[0], d[1], d[2]) - EDGE_LEN) < 1e-6) EDGES.push([i, j]);
	}
}

const adjacent = (i: number, j: number) =>
	EDGES.some(([a, b]) => (a === i && b === j) || (a === j && b === i));

/** The 20 faces, wound counter-clockwise seen from outside. */
export const FACES: [number, number, number][] = [];
for (let i = 0; i < 12; i++) {
	for (let j = i + 1; j < 12; j++) {
		if (!adjacent(i, j)) continue;
		for (let k = j + 1; k < 12; k++) {
			if (!adjacent(i, k) || !adjacent(j, k)) continue;
			const n = cross(sub(VERTS[j], VERTS[i]), sub(VERTS[k], VERTS[i]));
			const c: Vec3 = [
				VERTS[i][0] + VERTS[j][0] + VERTS[k][0],
				VERTS[i][1] + VERTS[j][1] + VERTS[k][1],
				VERTS[i][2] + VERTS[j][2] + VERTS[k][2]
			];
			FACES.push(dot(n, c) > 0 ? [i, j, k] : [i, k, j]);
		}
	}
}

function faceNormal(f: number): Vec3 {
	const [a, b, c] = FACES[f].map((i) => VERTS[i]);
	return norm([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);
}

/** Number printed on each face: opposite faces sum to 21, like a real die. */
export const FACE_NUMBER: number[] = (() => {
	const out = new Array<number>(FACES.length).fill(0);
	// Walk the faces top to bottom so low numbers cluster on one side, high on the other.
	const order = FACES.map((_, f) => f).sort((a, b) => faceNormal(b)[1] - faceNormal(a)[1]);
	let next = 1;
	for (const f of order) {
		if (out[f]) continue;
		const n = faceNormal(f);
		const opp = FACES.findIndex((_, g) => dot(faceNormal(g), n) < -0.999);
		out[f] = next;
		if (opp >= 0) out[opp] = 21 - next;
		next++;
	}
	return out;
})();

/** Index of the face showing `n` (1–20). */
export function faceOf(n: number): number {
	return Math.max(0, FACE_NUMBER.indexOf(n));
}

// ── quaternions ─────────────────────────────────────────────────────────────────────────────

export const Q_IDENTITY: Quat = [0, 0, 0, 1];

/** a ⊗ b: applies b, then a (three's multiplyQuaternions). */
export function qMul(a: Quat, b: Quat): Quat {
	const [ax, ay, az, aw] = a;
	const [bx, by, bz, bw] = b;
	return [
		ax * bw + aw * bx + ay * bz - az * by,
		ay * bw + aw * by + az * bx - ax * bz,
		az * bw + aw * bz + ax * by - ay * bx,
		aw * bw - ax * bx - ay * by - az * bz
	];
}

export function qAxisAngle(axis: Vec3, angle: number): Quat {
	const [x, y, z] = norm(axis);
	const s = Math.sin(angle / 2);
	return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

export function qNormalize(q: Quat): Quat {
	const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
	return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** Shortest-path spherical interpolation. */
export function qSlerp(a: Quat, b: Quat, t: number): Quat {
	let [bx, by, bz, bw] = b;
	let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
	if (cos < 0) {
		cos = -cos;
		bx = -bx;
		by = -by;
		bz = -bz;
		bw = -bw;
	}
	if (cos > 0.9995) {
		return qNormalize([
			a[0] + (bx - a[0]) * t,
			a[1] + (by - a[1]) * t,
			a[2] + (bz - a[2]) * t,
			a[3] + (bw - a[3]) * t
		]);
	}
	const theta = Math.acos(Math.min(1, cos));
	const sin = Math.sin(theta);
	const wa = Math.sin((1 - t) * theta) / sin;
	const wb = Math.sin(t * theta) / sin;
	return [a[0] * wa + bx * wb, a[1] * wa + by * wb, a[2] * wa + bz * wb, a[3] * wa + bw * wb];
}

/** Rotation matrix rows → quaternion (three's Quaternion.setFromRotationMatrix). */
function quatFromRows(r: [Vec3, Vec3, Vec3]): Quat {
	const [[m11, m12, m13], [m21, m22, m23], [m31, m32, m33]] = r;
	const trace = m11 + m22 + m33;
	if (trace > 0) {
		const s = 0.5 / Math.sqrt(trace + 1);
		return [(m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25 / s];
	}
	if (m11 > m22 && m11 > m33) {
		const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
		return [0.25 * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s];
	}
	if (m22 > m33) {
		const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
		return [(m12 + m21) / s, 0.25 * s, (m23 + m32) / s, (m13 - m31) / s];
	}
	const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
	return [(m13 + m31) / s, (m23 + m32) / s, 0.25 * s, (m21 - m12) / s];
}

/**
 * Orientation that lands face `f` toward the viewer (+z), one of its corners pointing up, so the
 * front triangle reads ▲ with its number upright in the middle.
 */
export function faceQuat(f: number): Quat {
	const n = faceNormal(f);
	const a = VERTS[FACES[f][0]];
	const k = dot(a, n);
	const up = norm([a[0] - n[0] * k, a[1] - n[1] * k, a[2] - n[2] * k]);
	const right = cross(up, n);
	return qNormalize(quatFromRows([right, up, n]));
}

/** Euler angles in three's 'XYZ' order (Matrix4.makeRotationFromQuaternion + Euler.setFromRotationMatrix). */
export function quatToEuler(q: Quat, out: Vec3 = [0, 0, 0]): Vec3 {
	const [x, y, z, w] = q;
	const x2 = x + x;
	const y2 = y + y;
	const z2 = z + z;
	const xx = x * x2;
	const xy = x * y2;
	const xz = x * z2;
	const yy = y * y2;
	const yz = y * z2;
	const zz = z * z2;
	const wx = w * x2;
	const wy = w * y2;
	const wz = w * z2;
	const m11 = 1 - (yy + zz);
	const m12 = xy - wz;
	const m13 = xz + wy;
	const m22 = 1 - (xx + zz);
	const m23 = yz - wx;
	const m32 = yz + wx;
	const m33 = 1 - (xx + yy);
	out[1] = Math.asin(Math.min(1, Math.max(-1, m13)));
	if (Math.abs(m13) < 0.9999999) {
		out[0] = Math.atan2(-m23, m33);
		out[2] = Math.atan2(-m12, m11);
	} else {
		out[0] = Math.atan2(m32, m22);
		out[2] = 0;
	}
	return out;
}

/** Rotates v by q. */
export function qRotate(q: Quat, v: Vec3): Vec3 {
	const [qx, qy, qz, qw] = q;
	const [vx, vy, vz] = v;
	// t = 2 * cross(q.xyz, v)
	const tx = 2 * (qy * vz - qz * vy);
	const ty = 2 * (qz * vx - qx * vz);
	const tz = 2 * (qx * vy - qy * vx);
	return [
		vx + qw * tx + (qy * tz - qz * ty),
		vy + qw * ty + (qz * tx - qx * tz),
		vz + qw * tz + (qx * ty - qy * tx)
	];
}

// ── rolls ───────────────────────────────────────────────────────────────────────────────────

export type Outcome = 'nat20' | 'hope' | 'horror' | 'nat1';

/** ≥ 11 hope, 2–10 horror, 1 is horror with a flash, 20 is a crit. */
export function outcomeOf(n: number): Outcome {
	if (n >= 20) return 'nat20';
	if (n >= 11) return 'hope';
	if (n <= 1) return 'nat1';
	return 'horror';
}

/**
 * The 2D wireframe of the die at orientation `q` (orthographic, y up, unit circumradius):
 * the static no-WebGL drawing uses it, and so could any SVG twin.
 */
export function projectEdges(
	q: Quat
): { x1: number; y1: number; x2: number; y2: number; back: boolean }[] {
	const p = VERTS.map((v) => qRotate(q, v));
	const facing = FACES.map((_, f) => qRotate(q, faceNormal(f))[2] > 0);
	return EDGES.map(([a, b]) => ({
		x1: p[a][0],
		y1: p[a][1],
		x2: p[b][0],
		y2: p[b][1],
		// Hidden when neither face sharing the edge looks at the viewer.
		back: !FACES.some((f, i) => facing[i] && f.includes(a) && f.includes(b))
	}));
}
