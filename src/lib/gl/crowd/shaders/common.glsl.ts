// Shared by the target, position and render shaders. Needs NOISE (hash11) before it.
//
// Per-entity blend (§S2 "Per-entity mix"): the formations are Hilbert-sorted, so the entity id IS
// its Hilbert rank. Mixing a hash with that rank makes groups leave from one side like a stadium
// wave instead of a uniform index stagger.
export const COMMON = /* glsl */ `
uniform float uSimSize;
uniform float uCount;
uniform float uMix;
uniform float uMixSpread;

float entityId(vec2 fragCoord) {
	return floor(fragCoord.y) * uSimSize + floor(fragCoord.x);
}

float entityMix(float id) {
	float s = mix(hash11(id * 0.7548776 + 0.31), id / uCount, 0.6);
	float lo = s * uMixSpread;
	return smoothstep(lo, lo + 1.0 - uMixSpread, uMix);
}
`;
