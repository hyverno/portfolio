// Boot capability probe (§S2 "Simulation", §8 risk 3). The site only runs the crowd when the GPU
// proves, by rendering and reading back real pixels, that float render targets work. Any doubt
// means the static build.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export interface Capabilities {
	ok: boolean;
	/** Sim render-target type: FloatType with EXT_color_buffer_float, else HalfFloatType. */
	floatType: THREE.TextureDataType;
	/** HalfFloat render targets can generate mipmaps (density RT); otherwise the RGBA8 fallback. */
	mipmaps: boolean;
	maxTex: number;
	/** Why `ok` is false (for the console; never shown to the user). */
	reason?: string;
}

export const CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
	alpha: true,
	antialias: false,
	depth: true,
	stencil: false,
	premultipliedAlpha: true,
	preserveDrawingBuffer: false,
	powerPreference: 'high-performance'
};

/** WebGL2 or nothing: the engine relies on vertex texture fetch, float textures and MRT-free RTs. */
export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
	try {
		return canvas.getContext('webgl2', CONTEXT_ATTRIBUTES);
	} catch {
		return null;
	}
}

const WRITE_FRAG = /* glsl */ `
uniform vec4 uValue;
void main() { gl_FragColor = uValue; }
`;

// Samples the probe target (optionally at a mip level) and writes 1.0 into red when it matches.
const CHECK_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec4 uExpect;
uniform float uLod;
void main() {
	vec4 v = textureLod(uTex, vec2(0.5), uLod);
	float ok = step(max(max(abs(v.r - uExpect.r), abs(v.g - uExpect.g)), max(abs(v.b - uExpect.b), abs(v.a - uExpect.a))), 0.01);
	gl_FragColor = vec4(ok, 0.0, 0.0, 1.0);
}
`;

const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

function material(fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
	return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
}

/**
 * Renders a known value into a float target of `type`, samples it back through an RGBA8 target
 * and reads that pixel on the CPU. With `mips`, the source is 4×4 and the 1×1 mip level is checked.
 */
function roundTrip(renderer: THREE.WebGLRenderer, type: THREE.TextureDataType, mips: boolean): boolean {
	const size = mips ? 4 : 1;
	const src = new THREE.WebGLRenderTarget(size, size, {
		type,
		format: THREE.RGBAFormat,
		depthBuffer: false,
		generateMipmaps: mips,
		minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter,
		magFilter: mips ? THREE.LinearFilter : THREE.NearestFilter
	});
	const dst = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
	// Values a half float represents exactly, including one above 1 and one negative.
	const value = new THREE.Vector4(0.5, 1.25, -3.75, 2.0);
	const write = material(WRITE_FRAG, { uValue: { value } });
	const check = material(CHECK_FRAG, {
		uTex: { value: src.texture },
		uExpect: { value },
		uLod: { value: mips ? 2 : 0 }
	});
	const quad = new FullScreenQuad(write);
	const gl = renderer.getContext();
	const prev = renderer.getRenderTarget();
	const pixel = new Uint8Array(4);
	gl.getError(); // clear anything left over from context setup
	try {
		renderer.setRenderTarget(src);
		quad.render(renderer);
		quad.material = check;
		renderer.setRenderTarget(dst);
		quad.render(renderer);
		renderer.readRenderTargetPixels(dst, 0, 0, 1, 1, pixel);
		return gl.getError() === gl.NO_ERROR && pixel[0] > 200;
	} catch {
		return false;
	} finally {
		renderer.setRenderTarget(prev);
		quad.dispose();
		write.dispose();
		check.dispose();
		src.dispose();
		dst.dispose();
	}
}

export function probeCapabilities(renderer: THREE.WebGLRenderer): Capabilities {
	const gl = renderer.getContext() as WebGL2RenderingContext;
	const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
	const fail = (reason: string): Capabilities => ({ ok: false, floatType: THREE.HalfFloatType, mipmaps: false, maxTex, reason });

	if (!(gl instanceof WebGL2RenderingContext)) return fail('webgl2');
	// Points read the sim state in the vertex shader (pos, vel, target, 4 paint maps).
	if ((gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) as number) < 8) return fail('vertex textures');

	const hasFloat = !!gl.getExtension('EXT_color_buffer_float');
	const hasHalf = hasFloat || !!gl.getExtension('EXT_color_buffer_half_float');
	if (!hasHalf) return fail('no float render targets');

	let floatType: THREE.TextureDataType = hasFloat ? THREE.FloatType : THREE.HalfFloatType;
	if (!roundTrip(renderer, floatType, false)) {
		if (floatType === THREE.FloatType && roundTrip(renderer, THREE.HalfFloatType, false)) floatType = THREE.HalfFloatType;
		else return fail('float round trip');
	}
	const mipmaps = roundTrip(renderer, THREE.HalfFloatType, true);
	return { ok: true, floatType, mipmaps, maxTex };
}
