/**
 * Quantum Aerospace Graphics API & WebGPU Compute Capability Probe
 * Honest Status: WebGPU / WebGL2 Adapter Detection + @workgroup_size(64) WGSL Compute Shader Template
 * (Detection + Template ONLY — NOT a live running GPU compute dispatch pipeline)
 */

export interface GraphicsProbeResult {
  webgl2Supported: boolean;
  webgl2RendererInfo: string;
  webgpuSupported: boolean;
  webgpuAdapterName: string;
  webgpuMaxWorkgroups?: number;
  computePipelineStatus: 'TEMPLATE_ONLY_NOT_ACTIVE' | 'DISPATCH_READY';
  wgslComputeTemplate: string;
  honestNotice: string;
}

export const WGSL_COMPUTE_TEMPLATE = `// Quantum Aerospace WGSL Compute Shader Template (v19/v20)
// Workgroup size 64 for parallel vertex bounding & slice distance evaluation
@group(0) @binding(0) var<storage, read> inputVertices: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> outputMetrics: array<vec4<f32>>;

struct Uniforms {
  slicePlaneZ: f32,
  toleranceIn: f32,
  vertexCount: u32,
  pad: u32,
};
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= uniforms.vertexCount) {
    return;
  }
  let v = inputVertices[idx];
  let dist = v.z - uniforms.slicePlaneZ;
  let isClipped = select(0.0, 1.0, dist > 0.0);
  outputMetrics[idx] = vec4<f32>(dist, isClipped, v.x, v.y);
}
`;

export async function probeGraphicsCapability(): Promise<GraphicsProbeResult> {
  let webgl2Supported = false;
  let webgl2RendererInfo = 'Unavailable';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      webgl2Supported = true;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        webgl2RendererInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WebGL2 Standard Context';
      } else {
        webgl2RendererInfo = (gl.getParameter(gl.RENDERER) as string) || 'WebGL2 Standard';
      }
    }
  } catch {
    webgl2Supported = false;
  }

  let webgpuSupported = false;
  let webgpuAdapterName = 'WebGPU API Not Detected / Browser Flag Disabled';

  // Check navigator.gpu
  const navGpu = typeof navigator !== 'undefined' ? (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<{ info?: { architecture?: string; description?: string } } | null> } }).gpu : undefined;

  if (navGpu && typeof navGpu.requestAdapter === 'function') {
    try {
      const adapter = await navGpu.requestAdapter();
      if (adapter) {
        webgpuSupported = true;
        webgpuAdapterName = adapter.info?.description || adapter.info?.architecture || 'Hardware WebGPU Adapter Detected';
      }
    } catch {
      webgpuSupported = false;
      webgpuAdapterName = 'WebGPU Request Adapter Failed';
    }
  }

  return {
    webgl2Supported,
    webgl2RendererInfo,
    webgpuSupported,
    webgpuAdapterName,
    computePipelineStatus: 'TEMPLATE_ONLY_NOT_ACTIVE',
    wgslComputeTemplate: WGSL_COMPUTE_TEMPLATE,
    honestNotice:
      'Three.js WebGLRenderer is the active 3D rasterizer. WebGPU inspects adapter capability and holds a @workgroup_size(64) WGSL compute shader template. It is NOT currently executing a live GPU compute dispatch pipeline.',
  };
}
