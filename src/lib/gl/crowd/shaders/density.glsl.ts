// Density pass (§S2): every entity splats an additive gaussian into a low-res viewport RT. Read by
// separation (gradient), the Density view, the shader quadtree and Ink Swarm.
// HalfFloat RT: raw sums. RGBA8 fallback: sums × uDensityScale (0.25) so the quadtree still reads.

export const DENSITY_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform float uAspect;
uniform float uSpawn;
uniform float uPointSize;
void main() {
	vec4 pos = texture(tPos, position.xy);
	if (pos.z >= uSpawn) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		gl_PointSize = 0.0;
		return;
	}
	gl_Position = vec4(pos.x / uAspect, pos.y, 0.0, 1.0);
	gl_PointSize = uPointSize;
}
`;

export const DENSITY_FRAG = /* glsl */ `
uniform float uDensityScale;
void main() {
	vec2 c = gl_PointCoord * 2.0 - 1.0;
	float r2 = dot(c, c);
	if (r2 > 1.0) discard;
	float v = exp(-r2 * 4.0) * 0.25 * uDensityScale;
	gl_FragColor = vec4(v);
}
`;
