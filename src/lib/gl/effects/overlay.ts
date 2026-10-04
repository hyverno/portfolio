// Shared plumbing for full-canvas effect passes: a fullscreen triangle, a dummy camera, and a
// draw helper that composites over whatever is already in the framebuffer.
import * as THREE from 'three';

/** Shaders compute clip space themselves; three still needs a camera to call render(). */
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const savedViewport = new THREE.Vector4();
const size = new THREE.Vector2();

/** One triangle covering clip space: (-1,-1), (3,-1), (-1,3). */
export function fullscreenTriangle(): THREE.BufferGeometry {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
	return g;
}

/** Vertex shader for `fullscreenTriangle()`. */
export const FULLSCREEN_VERT = /* glsl */ `
void main() {
	gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Renders `scene` over the current framebuffer without clearing it, across the whole canvas
 * (scissor off, full viewport), then restores the renderer state the engine had set.
 */
export function drawOverlay(renderer: THREE.WebGLRenderer, scene: THREE.Object3D): void {
	const autoClear = renderer.autoClear;
	const scissor = renderer.getScissorTest();
	renderer.getViewport(savedViewport);
	renderer.getSize(size);
	renderer.autoClear = false;
	if (scissor) renderer.setScissorTest(false);
	renderer.setViewport(0, 0, size.x, size.y);
	renderer.render(scene, camera);
	renderer.setViewport(savedViewport);
	if (scissor) renderer.setScissorTest(true);
	renderer.autoClear = autoClear;
}

/** Common material flags for 2D overlay passes: straight-alpha blending, no depth. */
export const OVERLAY_MATERIAL = {
	transparent: true,
	depthTest: false,
	depthWrite: false,
	blending: THREE.NormalBlending
} as const;

/** Debug cobalt (§2.1): light #2440FF / dark #5B73FF, picked from the paper's luminance. */
export const COBALT_GLSL = /* glsl */ `
vec3 cobaltFor(vec3 paperLinear) {
	float lum = dot(paperLinear, vec3(0.2126, 0.7152, 0.0722));
	return lum < 0.2 ? vec3(0.1047, 0.1714, 1.0) : vec3(0.0176, 0.0513, 1.0);
}
`;

/** Size of the Bayer cell in device px: 2 CSS px reads as a deliberate print screen, not noise. */
export function ditherPx(renderer: THREE.WebGLRenderer): number {
	return Math.max(1, Math.round(renderer.getPixelRatio() * 2));
}
