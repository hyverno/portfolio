// 2D signed-distance helpers shared by point-sprite glyphs and overlays.
//   float sdSegment(vec2 p, vec2 a, vec2 b)
//   float sdCapsule(vec2 p, vec2 a, vec2 b, float r)
//   float sdRoundBox(vec2 p, vec2 halfSize, float r)
//   float sdCircle(vec2 p, float r)
//   float sdTriangleIso(vec2 p, vec2 q)   isosceles triangle pointing +y, q = (half width, height)
//   vec2  rot2(vec2 p, float a)
//   float aastep(float d)                 1.0 inside (d < 0), anti-aliased with fwidth
export const SDF = /* glsl */ `
float sdSegment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a, ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * h);
}
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
	return sdSegment(p, a, b) - r;
}
float sdRoundBox(vec2 p, vec2 halfSize, float r) {
	vec2 q = abs(p) - halfSize + r;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float sdCircle(vec2 p, float r) {
	return length(p) - r;
}
float sdTriangleIso(vec2 p, vec2 q) {
	p.x = abs(p.x);
	vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
	vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
	float s = -sign(q.y);
	vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
	return -sqrt(d.x) * sign(d.y);
}
vec2 rot2(vec2 p, float a) {
	float c = cos(a), s = sin(a);
	return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
float aastep(float d) {
	float w = max(fwidth(d), 1e-4);
	return 1.0 - smoothstep(-w, w, d);
}
`;
