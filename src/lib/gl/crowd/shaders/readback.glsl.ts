// Tiny GPU → CPU passes. Both write RGBA8 targets so the read back is the one format every
// WebGL2 implementation accepts (RGBA / UNSIGNED_BYTE), whatever the sim precision.

/** Named entities: 8×1 RT, one pixel per tracked name = viewport px x/y packed as 16-bit (¼ px). */
export const NAMED_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform float uSpawn;
uniform vec2 uViewport;
varying vec4 vEnc;

vec2 enc16(float px) {
	float v = clamp(floor((px + 8192.0) * 4.0 + 0.5), 1.0, 65535.0);
	float hi = floor(v / 256.0);
	return vec2(hi, v - hi * 256.0) / 255.0;
}

void main() {
	vec4 pos = texture(tPos, position.xy);
	float px = pos.x * uViewport.y * 0.5 + uViewport.x * 0.5;
	float py = uViewport.y * 0.5 - pos.y * uViewport.y * 0.5;
	// All-zero = not spawned (a real position never encodes to 0).
	vEnc = pos.z < uSpawn ? vec4(enc16(px), enc16(py)) : vec4(0.0);
	gl_Position = vec4((position.z + 0.5) / 8.0 * 2.0 - 1.0, 0.0, 0.0, 1.0);
	gl_PointSize = 1.0;
}
`;

export const NAMED_FRAG = /* glsl */ `
varying vec4 vEnc;
void main() { gl_FragColor = vEnc; }
`;

/** Selection count: every selected entity adds 1/255 to pixel (id mod 256) of a 256×1 RT. */
export const COUNT_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform float uSpawn;
void main() {
	vec4 pos = texture(tPos, position.xy);
	if (pos.w < 0.5 || pos.z >= uSpawn) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		gl_PointSize = 0.0;
		return;
	}
	gl_Position = vec4((mod(position.z, 256.0) + 0.5) / 256.0 * 2.0 - 1.0, 0.0, 0.0, 1.0);
	gl_PointSize = 1.0;
}
`;

export const COUNT_FRAG = /* glsl */ `
void main() { gl_FragColor = vec4(1.0 / 255.0, 0.0, 0.0, 1.0); }
`;
