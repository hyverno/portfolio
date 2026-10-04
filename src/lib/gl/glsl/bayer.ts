// Ordered 4x4 Bayer dither, the house image filter (DESIGN.md §2.4).
//   float bayer4(vec2 fragCoord)  -> threshold in [0, 1), stable per screen pixel
//   float dither(float v, vec2 fragCoord)  -> 1.0 where v beats the threshold, else 0.0
export const BAYER = /* glsl */ `
float bayer4(vec2 fragCoord) {
	ivec2 p = ivec2(mod(floor(fragCoord), 4.0));
	int i = p.x + p.y * 4;
	int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
	return (float(m[i]) + 0.5) / 16.0;
}
float dither(float v, vec2 fragCoord) {
	return step(bayer4(fragCoord), v);
}
`;

/** Same matrix for Canvas2D / CPU use: threshold in [0, 1). */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export function bayerAt(x: number, y: number): number {
	return BAYER4[(x & 3) + (y & 3) * 4];
}
