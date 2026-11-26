import * as THREE from "three";

/**
 * WebGPU Compute & Shader Capability Manager (v20.0.0)
 *
 * Honesty & Pipeline Notice:
 * - Viewport rendering uses THREE.WebGLRenderer (WebGL2 / GLSL), NOT WebGPURenderer.
 * - inspectCapabilities() probes WebGPU hardware/adapter availability (detection-only
 *   for the viewport, activeInRenderer: false).
 * - dispatchWebGpuComputeGrid() executes a real WebGPU compute pipeline
 *   (requestAdapter -> requestDevice -> createShaderModule -> createComputePipeline
 *   -> beginComputePass -> dispatchWorkgroups -> staging readback) when WebGPU
 *   device creation succeeds, and falls back explicitly to CPU parity simulation when
 *   unavailable.
 * - dispatchClearanceComputeGrid() is strictly a synchronous CPU parity evaluator
 *   (isRealGpuDispatch: false, workgroupsDispatched: 0).
 */
export class WebGPUComputeEngineV20 {
  constructor(renderer = null, scene = null, version = "20.0.0") {
    this.version = version;
    this.renderer = renderer;
    this.scene = scene;
    if (this.renderer) {
      this.renderer.localClippingEnabled = true;
    }
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
    this.clippingActive = false;
    this.gpuSampleField = null;
    this._cachedAdapter = null;
    this._cachedDevice = null;
  }

  async inspectCapabilities() {
    const hasNavigatorGpu = typeof navigator !== "undefined" && Boolean(navigator.gpu);
    let adapterInfo = null;
    let limitsSummary = null;
    let adapterFound = false;
    let deviceAvailable = false;

    if (hasNavigatorGpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (adapter) {
          adapterFound = true;
          this._cachedAdapter = adapter;
          limitsSummary = {
            maxComputeWorkgroupSizeX: adapter.limits?.maxComputeWorkgroupSizeX ?? 256,
            maxStorageBufferBindingSize: adapter.limits?.maxStorageBufferBindingSize ?? null
          };
          adapterInfo = adapter.info?.description || adapter.info?.architecture || "WebGPU Adapter";
          if (typeof adapter.requestDevice === "function") {
            deviceAvailable = true;
          }
        }
      } catch (_) {
        adapterInfo = "WebGPU Adapter Probe Failed";
      }
    }

    const gl = this.renderer && typeof this.renderer.getContext === "function"
      ? this.renderer.getContext()
      : null;
    const isWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    const viewportRenderer = isWebGL2
      ? "WebGL2 Active THREE.WebGLRenderer"
      : "WebGL1/Canvas THREE.WebGLRenderer";

    return {
      studioVersion: this.version,
      certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
      apiDetected: hasNavigatorGpu,
      webGpuHardwareDetected: hasNavigatorGpu && adapterFound,
      adapterFound,
      deviceRequestCapable: deviceAvailable,
      activeInRenderer: false,
      adapterInfo,
      limitsSummary,
      webglVersion: isWebGL2 ? "WebGL2" : "WebGL1/Renderer",
      viewportRenderer,
      webGpuDetectionStatus: adapterFound
        ? "WEBGPU_ADAPTER_DETECTED_DETECTION_ONLY_FOR_VIEWPORT"
        : (hasNavigatorGpu ? "WEBGPU_API_PRESENT_NO_ADAPTER" : "WEBGPU_UNAVAILABLE"),
      activeBackend: `${viewportRenderer} (WebGPU ${adapterFound ? "Detected — Viewport Detection-Only" : "Unavailable"})`,
      shaderPipeline: "GLSL Active Viewport; No TSL Nodes Active; WGSL @workgroup_size(64) template only",
      pqcStandard: "NIST IR 8547 (ML-KEM-768 / ML-DSA / SLH-DSA) — FRAMEWORK REFERENCE ONLY (Not Enforced)"
    };
  }

  _normalizeInputs(points, holeCenters = [], minFeatureIn = null, gridRes = 24) {
    const resolvedGridRes = Math.max(1, Math.min(128, Math.floor(Number(gridRes) || 24)));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const spanX = Math.max(maxX - minX, 0.01);
    const spanY = Math.max(maxY - minY, 0.01);

    let usedUnverifiedDefaultDia = false;
    const normalizedHoles = (Array.isArray(holeCenters) ? holeCenters : []).map((h) => {
      const hasDia = Number.isFinite(h?.diameterIn) && h.diameterIn > 0;
      if (!hasDia) usedUnverifiedDefaultDia = true;
      const dia = hasDia ? h.diameterIn : 0.3125;
      return {
        x: Number(h?.x) || 0,
        y: Number(h?.y) || 0,
        diameterIn: dia,
        radiusIn: dia / 2,
        diameterIsUnverifiedDefault: !hasDia
      };
    });

    const hasMinFeature = Number.isFinite(minFeatureIn) && minFeatureIn > 0;
    const minFeatureUsed = hasMinFeature ? Number(minFeatureIn) : null;

    return {
      gridRes: resolvedGridRes,
      minX,
      maxX,
      minY,
      maxY,
      spanX,
      spanY,
      normalizedHoles,
      usedUnverifiedDefaultDia,
      minFeatureUsed
    };
  }

  dispatchClearanceComputeGrid(points, holeCenters = [], minFeatureIn = null, gridRes = 24) {
    if (!points || points.length < 3) {
      return {
        executionMode: "NO_CONTOUR_POINTS",
        isRealGpuDispatch: false,
        wgslKernelUsed: false,
        workgroupSize: 64,
        workgroupsDispatched: 0,
        simulatedWorkgroups: 0,
        sampleCount: 0,
        minClearanceIn: null,
        minFeatureInUsed: Number.isFinite(minFeatureIn) && minFeatureIn > 0 ? minFeatureIn : null,
        violations: 0,
        clearanceStatus: "NO_CONTOUR_SUPPLIED",
        samples: []
      };
    }

    const norm = this._normalizeInputs(points, holeCenters, minFeatureIn, gridRes);
    const hasHoles = norm.normalizedHoles.length > 0;
    let minClearanceIn = Infinity;
    let violations = norm.minFeatureUsed !== null ? 0 : null;
    const samples = [];

    for (let ix = 0; ix < norm.gridRes; ix++) {
      for (let iy = 0; iy < norm.gridRes; iy++) {
        const sx = norm.minX + ((ix + 0.5) / norm.gridRes) * norm.spanX;
        const sy = norm.minY + ((iy + 0.5) / norm.gridRes) * norm.spanY;

        if (!hasHoles) {
          samples.push({
            x: Number(sx.toFixed(3)),
            y: Number(sy.toFixed(3)),
            clearanceIn: null
          });
          continue;
        }

        let nearestHoleEdge = Infinity;
        for (const h of norm.normalizedHoles) {
          const dist = Math.hypot(sx - h.x, sy - h.y) - h.radiusIn;
          if (dist < nearestHoleEdge) nearestHoleEdge = dist;
        }

        if (nearestHoleEdge < minClearanceIn) minClearanceIn = nearestHoleEdge;
        if (norm.minFeatureUsed !== null && nearestHoleEdge < norm.minFeatureUsed) {
          violations++;
        }

        samples.push({
          x: Number(sx.toFixed(3)),
          y: Number(sy.toFixed(3)),
          clearanceIn: Number(nearestHoleEdge.toFixed(4))
        });
      }
    }

    const simulatedWorkgroups = Math.ceil(samples.length / 64);

    this.gpuSampleField = {
      executionMode: "CPU_PARITY_SIMULATION_ONLY",
      isRealGpuDispatch: false,
      wgslKernelUsed: false,
      workgroupSize: 64,
      workgroupsDispatched: 0,
      simulatedWorkgroups,
      sampleCount: samples.length,
      minClearanceIn: hasHoles && Number.isFinite(minClearanceIn) ? Number(minClearanceIn.toFixed(4)) : null,
      minFeatureInUsed: norm.minFeatureUsed,
      minFeatureStatus: norm.minFeatureUsed !== null
        ? "EXPLICIT_TIER_MIN_WALL_SUPPLIED"
        : "TIER_MIN_WALL_OMITTED_NO_VIOLATION_CHECK_PERFORMED",
      holeDiameterStatus: !hasHoles
        ? "NO_HOLES_SUPPLIED"
        : (norm.usedUnverifiedDefaultDia
          ? "UNVERIFIED_DEFAULT_0.3125_NEEDING_RAYS_MEASUREMENT"
          : "EXPLICIT_HOLE_DIAMETERS_SUPPLIED"),
      clearanceStatus: hasHoles
        ? "COMPUTED_HOLE_EDGE_CLEARANCE_CPU_PARITY"
        : "NO_HOLES_NO_MEASURED_CLEARANCE",
      violations: hasHoles ? violations : 0,
      samples
    };
    return this.gpuSampleField;
  }

  async dispatchWebGpuComputeGrid(points, holeCenters = [], minFeatureIn = null, gridRes = 24) {
    if (!points || points.length < 3) {
      return this.dispatchClearanceComputeGrid(points, holeCenters, minFeatureIn, gridRes);
    }

    const norm = this._normalizeInputs(points, holeCenters, minFeatureIn, gridRes);
    const hasHoles = norm.normalizedHoles.length > 0;
    const totalSamples = norm.gridRes * norm.gridRes;

    const hasGpuApi = typeof navigator !== "undefined" && Boolean(navigator.gpu);
    if (!hasGpuApi) {
      const cpuRes = this.dispatchClearanceComputeGrid(points, holeCenters, minFeatureIn, norm.gridRes);
      this.gpuSampleField = {
        ...cpuRes,
        executionMode: "NOT_YET_WORKING_WEBGPU_UNAVAILABLE_CPU_FALLBACK",
        isRealGpuDispatch: false,
        fallbackReason: "navigator.gpu unavailable"
      };
      return this.gpuSampleField;
    }

    let device = this._cachedDevice;
    let paramsBuffer = null;
    let holesBuffer = null;
    let outBuffer = null;
    let stagingBuffer = null;

    try {
      const adapter = this._cachedAdapter || await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) {
        throw new Error("WebGPU requestAdapter returned null");
      }
      this._cachedAdapter = adapter;
      if (!device) {
        device = await adapter.requestDevice();
        this._cachedDevice = device;
      }

      const shaderModule = device.createShaderModule({
        code: this.getWgslComputeTemplate()
      });

      const pipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
          module: shaderModule,
          entryPoint: "main"
        }
      });

      // FieldParams: 32 bytes (4xf32 + 4xu32)
      const paramsBufData = new ArrayBuffer(32);
      const paramsF32 = new Float32Array(paramsBufData);
      const paramsU32 = new Uint32Array(paramsBufData);
      paramsF32[0] = norm.minX;
      paramsF32[1] = norm.minY;
      paramsF32[2] = norm.spanX;
      paramsF32[3] = norm.spanY;
      paramsU32[4] = norm.gridRes;
      paramsU32[5] = norm.normalizedHoles.length;
      paramsU32[6] = 0;
      paramsU32[7] = 0;

      const GPUBufferUsageSafe = typeof GPUBufferUsage !== "undefined"
        ? GPUBufferUsage
        : { UNIFORM: 0x0040, STORAGE: 0x0080, COPY_SRC: 0x0004, COPY_DST: 0x0008, MAP_READ: 0x0001 };
      const GPUMapModeSafe = typeof GPUMapMode !== "undefined"
        ? GPUMapMode
        : { READ: 0x0001 };

      paramsBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsageSafe.UNIFORM | GPUBufferUsageSafe.COPY_DST
      });
      device.queue.writeBuffer(paramsBuffer, 0, paramsBufData);

      const holeStrideFloats = 4;
      const holesArray = new Float32Array(Math.max(1, norm.normalizedHoles.length) * holeStrideFloats);
      norm.normalizedHoles.forEach((h, idx) => {
        const base = idx * holeStrideFloats;
        holesArray[base] = h.x;
        holesArray[base + 1] = h.y;
        holesArray[base + 2] = h.radiusIn;
        holesArray[base + 3] = 0;
      });

      holesBuffer = device.createBuffer({
        size: holesArray.byteLength,
        usage: GPUBufferUsageSafe.STORAGE | GPUBufferUsageSafe.COPY_DST
      });
      device.queue.writeBuffer(holesBuffer, 0, holesArray);

      const outByteSize = totalSamples * 4;
      outBuffer = device.createBuffer({
        size: outByteSize,
        usage: GPUBufferUsageSafe.STORAGE | GPUBufferUsageSafe.COPY_SRC
      });
      stagingBuffer = device.createBuffer({
        size: outByteSize,
        usage: GPUBufferUsageSafe.MAP_READ | GPUBufferUsageSafe.COPY_DST
      });

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: paramsBuffer } },
          { binding: 1, resource: { buffer: holesBuffer } },
          { binding: 2, resource: { buffer: outBuffer } }
        ]
      });

      const workgroupsDispatched = Math.ceil(totalSamples / 64);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(workgroupsDispatched);
      pass.end();

      encoder.copyBufferToBuffer(outBuffer, 0, stagingBuffer, 0, outByteSize);
      device.queue.submit([encoder.finish()]);

      await stagingBuffer.mapAsync(GPUMapModeSafe.READ);
      const mappedCopy = new Float32Array(stagingBuffer.getMappedRange().slice(0));
      stagingBuffer.unmap();

      let minClearanceIn = Infinity;
      let violations = norm.minFeatureUsed !== null ? 0 : null;
      const samples = [];

      for (let idx = 0; idx < totalSamples; idx++) {
        const ix = idx % norm.gridRes;
        const iy = Math.floor(idx / norm.gridRes);
        const sx = norm.minX + ((ix + 0.5) / norm.gridRes) * norm.spanX;
        const sy = norm.minY + ((iy + 0.5) / norm.gridRes) * norm.spanY;

        if (!hasHoles) {
          samples.push({ x: Number(sx.toFixed(3)), y: Number(sy.toFixed(3)), clearanceIn: null });
          continue;
        }
        const val = mappedCopy[idx];
        if (val < minClearanceIn) minClearanceIn = val;
        if (norm.minFeatureUsed !== null && val < norm.minFeatureUsed) violations++;
        samples.push({
          x: Number(sx.toFixed(3)),
          y: Number(sy.toFixed(3)),
          clearanceIn: Number(val.toFixed(4))
        });
      }

      this.gpuSampleField = {
        executionMode: "WEBGPU_REAL_COMPUTE_PIPELINE",
        isRealGpuDispatch: true,
        wgslKernelUsed: true,
        workgroupSize: 64,
        workgroupsDispatched,
        simulatedWorkgroups: 0,
        sampleCount: samples.length,
        minClearanceIn: hasHoles && Number.isFinite(minClearanceIn) ? Number(minClearanceIn.toFixed(4)) : null,
        minFeatureInUsed: norm.minFeatureUsed,
        minFeatureStatus: norm.minFeatureUsed !== null
          ? "EXPLICIT_TIER_MIN_WALL_SUPPLIED"
          : "TIER_MIN_WALL_OMITTED_NO_VIOLATION_CHECK_PERFORMED",
        holeDiameterStatus: !hasHoles
          ? "NO_HOLES_SUPPLIED"
          : (norm.usedUnverifiedDefaultDia
            ? "UNVERIFIED_DEFAULT_0.3125_NEEDING_RAYS_MEASUREMENT"
            : "EXPLICIT_HOLE_DIAMETERS_SUPPLIED"),
        clearanceStatus: hasHoles
          ? "COMPUTED_HOLE_EDGE_CLEARANCE_WEBGPU"
          : "NO_HOLES_NO_MEASURED_CLEARANCE",
        violations: hasHoles ? violations : 0,
        samples
      };
      return this.gpuSampleField;
    } catch (err) {
      const cpuRes = this.dispatchClearanceComputeGrid(points, holeCenters, minFeatureIn, norm.gridRes);
      this.gpuSampleField = {
        ...cpuRes,
        executionMode: "NOT_YET_WORKING_WEBGPU_UNAVAILABLE_CPU_FALLBACK",
        isRealGpuDispatch: false,
        fallbackReason: err?.message || "WebGPU pipeline error"
      };
      return this.gpuSampleField;
    } finally {
      paramsBuffer?.destroy?.();
      holesBuffer?.destroy?.();
      outBuffer?.destroy?.();
      stagingBuffer?.destroy?.();
    }
  }

  getWgslComputeTemplate() {
    return `// WGSL Compute Kernel (v20.0.0) - Workgroup(64) Clearance Field Evaluation
struct FieldParams {
  min_x : f32,
  min_y : f32,
  span_x : f32,
  span_y : f32,
  grid_dim : u32,
  hole_count : u32,
  _pad0 : u32,
  _pad1 : u32,
};

struct Hole {
  cx : f32,
  cy : f32,
  radius : f32,
  _pad : f32,
};

@group(0) @binding(0) var<uniform> params : FieldParams;
@group(0) @binding(1) var<storage, read> holes : array<Hole>;
@group(0) @binding(2) var<storage, read_write> out_clearance : array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let idx = gid.x;
  let total = params.grid_dim * params.grid_dim;
  if (idx >= total) { return; }

  let ix = idx % params.grid_dim;
  let iy = idx / params.grid_dim;
  let fx = (f32(ix) + 0.5) / f32(params.grid_dim);
  let fy = (f32(iy) + 0.5) / f32(params.grid_dim);
  let px = params.min_x + fx * params.span_x;
  let py = params.min_y + fy * params.span_y;

  var best_d : f32 = 1e6;
  for (var i : u32 = 0u; i < params.hole_count; i = i + 1u) {
    let h = holes[i];
    let d = length(vec2<f32>(px - h.cx, py - h.cy)) - h.radius;
    if (d < best_d) { best_d = d; }
  }
  out_clearance[idx] = best_d;
}`;
  }

  setSectionCut(enabled, axis = "z", offsetIn = 0) {
    this.clippingActive = Boolean(enabled);
    if (this.renderer) {
      this.renderer.localClippingEnabled = true;
    }
    const normals = {
      x: new THREE.Vector3(-1, 0, 0),
      y: new THREE.Vector3(0, -1, 0),
      z: new THREE.Vector3(0, 0, -1)
    };
    this.clipPlane.normal.copy(normals[axis] || normals.z);
    this.clipPlane.constant = Number.isFinite(offsetIn) ? offsetIn : 0;

    if (!this.scene) return;
    this.scene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat && !mat.isLineBasicMaterial) {
          mat.clippingPlanes = this.clippingActive ? [this.clipPlane] : [];
          mat.clipShadows = this.clippingActive;
          mat.needsUpdate = true;
        }
      });
    });
  }
}

export const WebGpuComputeEngineV20 = WebGPUComputeEngineV20;
export const WebgpuComputeEngineV20 = WebGPUComputeEngineV20;
export default WebGPUComputeEngineV20;