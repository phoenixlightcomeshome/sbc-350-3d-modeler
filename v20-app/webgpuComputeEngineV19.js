import * as THREE from "three";

/**
 * WebGPU Compute & Shader Capability Manager (v19.0.0 — Quantum Aerospace Design Studio)
 * - Active 3D viewport uses THREE.WebGLRenderer (WebGL2/WebGL1), NOT WebGPURenderer.
 * - inspectCapabilities() probes navigator.gpu adapter + device honestly.
 * - dispatchWebGpuComputeGrid() executes a real @workgroup_size(64) WGSL GPU compute pass
 *   when navigator.gpu acquires a GPUDevice; otherwise falls back to CPU parity and labels
 *   the result clearly as Detection-Only / CPU Fallback (NOT a running GPU pipeline).
 * - Internal geometry units: strictly inches.
 */
export class WebGPUComputeEngineV19 {
  constructor(renderer, scene, version = "19.0.0") {
    this.version = version;
    this.renderer = renderer;
    this.scene = scene;
    this.renderer.localClippingEnabled = true;
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
    this.clippingActive = false;
    this.gpuSampleField = null;
    this._cachedDevice = null;
  }

  async inspectCapabilities() {
    const hasNavigatorGpu = typeof navigator !== "undefined" && Boolean(navigator.gpu);
    let adapterInfo = null;
    let limitsSummary = null;
    let adapterDetected = false;
    let deviceAcquired = false;
    let probeError = null;

    if (hasNavigatorGpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (adapter) {
          adapterDetected = true;
          limitsSummary = {
            maxComputeWorkgroupSizeX: adapter.limits?.maxComputeWorkgroupSizeX ?? 256,
            maxStorageBufferBindingSize: adapter.limits?.maxStorageBufferBindingSize ?? null
          };
          adapterInfo = adapter.info?.description || adapter.info?.architecture || "WebGPU Adapter";
          try {
            const dev = this._cachedDevice || await adapter.requestDevice();
            if (dev) {
              this._cachedDevice = dev;
              deviceAcquired = true;
            }
          } catch (devErr) {
            probeError = `Adapter detected, requestDevice failed: ${devErr?.message || "Unknown"}`;
          }
        } else {
          probeError = "navigator.gpu present, but requestAdapter() returned null.";
        }
      } catch (err) {
        probeError = `WebGPU adapter probe failed: ${err?.message || "Unknown"}`;
      }
    }

    const gl = typeof this.renderer?.getContext === "function" ? this.renderer.getContext() : null;
    const isWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    const viewportLabel = isWebGL2 ? "WebGL2 Active (THREE.WebGLRenderer)" : "WebGL1/Renderer Active (THREE.WebGLRenderer)";

    let webGpuComputeStatus = "WebGPU NOT YET WORKING / Not Detected on Browser";
    let activeBackend = `${isWebGL2 ? "WebGL2" : "WebGL"} Viewport · WebGPU Not Detected`;
    if (deviceAcquired) {
      webGpuComputeStatus = "WebGPU Compute Device Ready (Pipeline Supported)";
      activeBackend = `${isWebGL2 ? "WebGL2" : "WebGL"} Viewport · WebGPU Compute Ready`;
    } else if (adapterDetected) {
      webGpuComputeStatus = "WebGPU Adapter Detected Only — Device Not Acquired (Detection-Only)";
      activeBackend = `${isWebGL2 ? "WebGL2" : "WebGL"} Viewport · WebGPU Detection-Only`;
    }

    return {
      studioVersion: this.version,
      unitsInternal: "inches",
      webGpuHardwareDetected: hasNavigatorGpu,
      webGpuAdapterDetected: adapterDetected,
      webGpuDeviceAcquired: deviceAcquired,
      webGpuComputeStatus,
      probeError,
      adapterInfo,
      limitsSummary,
      webglVersion: isWebGL2 ? "WebGL2" : "WebGL1/Renderer",
      viewportBackend: viewportLabel,
      activeBackend,
      shaderPipeline: deviceAcquired
        ? "GLSL Viewport (WebGLRenderer) + WGSL @workgroup_size(64) Compute Supported (No TSL Nodes)"
        : "GLSL Viewport (WebGLRenderer) + WGSL Compute Template-Only (Detection-Only / CPU Fallback)",
      wgslPipelineLive: deviceAcquired,
      pqcStandard: "NIST IR 8547 (ML-KEM-768 / ML-DSA / SLH-DSA) — Framework Reference Only",
      certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY"
    };
  }

  _normalizeComputeInputs(points, holeCenters, minFeatureIn) {
    const warnings = [];
    const UNVERIFIED_FALLBACK_HOLE_DIA_IN = 0.3125; // Matches index.html unverified hole input
    const UNVERIFIED_FALLBACK_MIN_WALL_IN = 0.06;

    let effectiveMinFeatureIn = minFeatureIn;
    let minFeatureInIsEstimate = false;
    if (!Number.isFinite(effectiveMinFeatureIn) || effectiveMinFeatureIn <= 0) {
      effectiveMinFeatureIn = UNVERIFIED_FALLBACK_MIN_WALL_IN;
      minFeatureInIsEstimate = true;
      warnings.push(
        `No fabrication tier minWallIn provided — using unverified ${UNVERIFIED_FALLBACK_MIN_WALL_IN.toFixed(3)} in. estimate (NEEDING TIER SELECTION / RAY'S MEASUREMENT).`
      );
    }

    let unverifiedHoleDefaultsCount = 0;
    const normalizedHoles = (Array.isArray(holeCenters) ? holeCenters : []).map((h, idx) => {
      const rawDia = Number.isFinite(h?.diameterIn) && h.diameterIn > 0
        ? h.diameterIn
        : (Number.isFinite(h?.widthIn) && h.widthIn > 0 ? h.widthIn : null);
      if (rawDia === null) {
        unverifiedHoleDefaultsCount++;
        return {
          id: h?.id || `HOLE_${idx + 1}`,
          x: Number(h?.x) || 0,
          y: Number(h?.y) || 0,
          diameterIn: UNVERIFIED_FALLBACK_HOLE_DIA_IN,
          diameterVerified: false
        };
      }
      return {
        id: h?.id || `HOLE_${idx + 1}`,
        x: Number(h?.x) || 0,
        y: Number(h?.y) || 0,
        diameterIn: rawDia,
        diameterVerified: true
      };
    });

    if (unverifiedHoleDefaultsCount > 0) {
      warnings.push(
        `${unverifiedHoleDefaultsCount} hole(s) lacked diameterIn — applied UNVERIFIED DEFAULT (${UNVERIFIED_FALLBACK_HOLE_DIA_IN} in. — NEEDING RAY'S MEASUREMENT).`
      );
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    return {
      minX,
      maxX,
      minY,
      maxY,
      spanX: Math.max(maxX - minX, 0.01),
      spanY: Math.max(maxY - minY, 0.01),
      effectiveMinFeatureIn,
      minFeatureInIsEstimate,
      normalizedHoles,
      warnings
    };
  }

  /**
   * Real WebGPU Compute Pipeline dispatch (@workgroup_size(64)).
   * Falls back explicitly to CPU parity simulation when WebGPU device is unavailable.
   */
  async dispatchWebGpuComputeGrid(points, holeCenters = [], minFeatureIn = null, gridRes = 24) {
    if (!points || points.length < 3) {
      return {
        executionMode: "SKIPPED_INSUFFICIENT_CONTOUR",
        isRealGpuDispatch: false,
        unitsInternal: "inches",
        workgroupSize: 64,
        workgroupsDispatched: 0,
        sampleCount: 0,
        minClearanceIn: null,
        violations: 0,
        warnings: ["Need at least 3 contour points."]
      };
    }

    const prep = this._normalizeComputeInputs(points, holeCenters, minFeatureIn);
    if (prep.normalizedHoles.length === 0) {
      return {
        executionMode: "SKIPPED_NO_HOLES_TO_EVALUATE",
        isRealGpuDispatch: false,
        unitsInternal: "inches",
        workgroupSize: 64,
        workgroupsDispatched: 0,
        sampleCount: gridRes * gridRes,
        minClearanceIn: null,
        clearanceStatus: "NO_HOLES_DEFINED_NOTHING_TO_EVALUATE",
        violations: 0,
        warnings: prep.warnings
      };
    }

    // Attempt real WebGPU compute execution
    const caps = await this.inspectCapabilities();
    if (caps.webGpuDeviceAcquired && this._cachedDevice) {
      try {
        const device = this._cachedDevice;
        const totalSamples = gridRes * gridRes;
        const workgroups = Math.ceil(totalSamples / 64);

        const paramsBufData = new ArrayBuffer(24);
        const fView = new Float32Array(paramsBufData, 0, 4);
        const uView = new Uint32Array(paramsBufData, 16, 2);
        fView[0] = prep.minX;
        fView[1] = prep.minY;
        fView[2] = prep.spanX;
        fView[3] = prep.spanY;
        uView[0] = gridRes;
        uView[1] = prep.normalizedHoles.length;

        const holeFloatData = new Float32Array(prep.normalizedHoles.length * 4);
        prep.normalizedHoles.forEach((h, i) => {
          holeFloatData[i * 4] = h.x;
          holeFloatData[i * 4 + 1] = h.y;
          holeFloatData[i * 4 + 2] = h.diameterIn / 2;
          holeFloatData[i * 4 + 3] = 0;
        });

        const paramsBuf = device.createBuffer({
          size: 32,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(paramsBuf, 0, paramsBufData);

        const holesBuf = device.createBuffer({
          size: holeFloatData.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(holesBuf, 0, holeFloatData);

        const outByteSize = totalSamples * 4;
        const outBuf = device.createBuffer({
          size: outByteSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        const readBuf = device.createBuffer({
          size: outByteSize,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        const module = device.createShaderModule({ code: this.getWgslComputeTemplate() });
        const pipeline = device.createComputePipeline({
          layout: "auto",
          compute: { module, entryPoint: "main" }
        });
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: paramsBuf } },
            { binding: 1, resource: { buffer: holesBuf } },
            { binding: 2, resource: { buffer: outBuf } }
          ]
        });

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(workgroups);
        pass.end();
        encoder.copyBufferToBuffer(outBuf, 0, readBuf, 0, outByteSize);
        device.queue.submit([encoder.finish()]);

        await readBuf.mapAsync(GPUMapMode.READ);
        const gpuOut = new Float32Array(readBuf.getMappedRange().slice(0));
        readBuf.unmap();

        let minClearanceIn = Infinity;
        let violations = 0;
        const samples = [];
        for (let idx = 0; idx < totalSamples; idx++) {
          const ix = idx % gridRes;
          const iy = Math.floor(idx / gridRes);
          const sx = prep.minX + ((ix + 0.5) / gridRes) * prep.spanX;
          const sy = prep.minY + ((iy + 0.5) / gridRes) * prep.spanY;
          const clearance = gpuOut[idx];
          if (clearance < minClearanceIn) minClearanceIn = clearance;
          if (clearance < prep.effectiveMinFeatureIn) violations++;
          samples.push({
            x: Number(sx.toFixed(3)),
            y: Number(sy.toFixed(3)),
            clearanceIn: Number(clearance.toFixed(4))
          });
        }

        this.gpuSampleField = {
          executionMode: "REAL_WEBGPU_COMPUTE_PIPELINE",
          isRealGpuDispatch: true,
          unitsInternal: "inches",
          workgroupSize: 64,
          workgroupsDispatched: workgroups,
          sampleCount: samples.length,
          minClearanceIn: Number(minClearanceIn.toFixed(4)),
          minFeatureInUsed: prep.effectiveMinFeatureIn,
          minFeatureInIsEstimate: prep.minFeatureInIsEstimate,
          violations,
          warnings: prep.warnings,
          samples
        };
        return this.gpuSampleField;
      } catch (gpuErr) {
        prep.warnings.push(`WebGPU compute dispatch failed (${gpuErr?.message || "Error"}) — fell back to CPU parity.`);
      }
    } else {
      prep.warnings.push("WebGPU device unavailable in this browser — running Detection-Only CPU Parity fallback.");
    }

    const cpuFallback = this.dispatchClearanceComputeGrid(points, holeCenters, minFeatureIn, gridRes);
    cpuFallback.executionMode = "NOT_YET_WORKING_WEBGPU_UNAVAILABLE_CPU_FALLBACK";
    cpuFallback.warnings = Array.from(new Set([...prep.warnings, ...(cpuFallback.warnings || [])]));
    return cpuFallback;
  }

  /**
   * Synchronous CPU parity evaluator (NOT a GPU compute dispatch).
   * Preserved for deterministic offline evaluation and caller compatibility.
   */
  dispatchClearanceComputeGrid(points, holeCenters = [], minFeatureIn = null, gridRes = 24) {
    if (!points || points.length < 3) {
      return {
        executionMode: "CPU_PARITY_SIMULATION_ONLY",
        isRealGpuDispatch: false,
        unitsInternal: "inches",
        workgroupSize: 64,
        workgroupsDispatched: 0,
        simulatedWorkgroups: 0,
        sampleCount: 0,
        minClearanceIn: null,
        violations: 0,
        warnings: ["Need at least 3 contour points."]
      };
    }

    const prep = this._normalizeComputeInputs(points, holeCenters, minFeatureIn);
    if (prep.normalizedHoles.length === 0) {
      this.gpuSampleField = {
        executionMode: "CPU_PARITY_SIMULATION_ONLY",
        isRealGpuDispatch: false,
        unitsInternal: "inches",
        workgroupSize: 64,
        workgroupsDispatched: 0,
        simulatedWorkgroups: 0,
        sampleCount: gridRes * gridRes,
        minClearanceIn: null,
        clearanceStatus: "NO_HOLES_DEFINED_NOTHING_TO_EVALUATE",
        minFeatureInUsed: prep.effectiveMinFeatureIn,
        minFeatureInIsEstimate: prep.minFeatureInIsEstimate,
        violations: 0,
        warnings: prep.warnings,
        samples: []
      };
      return this.gpuSampleField;
    }

    let minClearanceIn = Infinity;
    let violations = 0;
    const samples = [];

    for (let ix = 0; ix < gridRes; ix++) {
      for (let iy = 0; iy < gridRes; iy++) {
        const sx = prep.minX + ((ix + 0.5) / gridRes) * prep.spanX;
        const sy = prep.minY + ((iy + 0.5) / gridRes) * prep.spanY;

        let nearestHoleEdge = Infinity;
        for (const h of prep.normalizedHoles) {
          const r = h.diameterIn / 2;
          const dist = Math.hypot(sx - h.x, sy - h.y) - r;
          if (dist < nearestHoleEdge) nearestHoleEdge = dist;
        }

        if (nearestHoleEdge < minClearanceIn) minClearanceIn = nearestHoleEdge;
        if (nearestHoleEdge < prep.effectiveMinFeatureIn) violations++;

        samples.push({
          x: Number(sx.toFixed(3)),
          y: Number(sy.toFixed(3)),
          clearanceIn: Number(nearestHoleEdge.toFixed(4))
        });
      }
    }

    this.gpuSampleField = {
      executionMode: "CPU_PARITY_SIMULATION_ONLY",
      isRealGpuDispatch: false,
      unitsInternal: "inches",
      workgroupSize: 64,
      workgroupsDispatched: 0,
      simulatedWorkgroups: Math.ceil(samples.length / 64),
      sampleCount: samples.length,
      minClearanceIn: Number((minClearanceIn === Infinity ? 0 : minClearanceIn).toFixed(4)),
      minFeatureInUsed: prep.effectiveMinFeatureIn,
      minFeatureInIsEstimate: prep.minFeatureInIsEstimate,
      violations,
      warnings: prep.warnings,
      samples
    };
    return this.gpuSampleField;
  }

  getWgslComputeTemplate() {
    return `// WGSL Compute Kernel (v19.0.0) - Workgroup(64) Clearance Field Evaluation (inches)
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
  if (params.hole_count == 0u) {
    out_clearance[idx] = 0.0;
    return;
  }

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
    const normals = {
      x: new THREE.Vector3(-1, 0, 0),
      y: new THREE.Vector3(0, -1, 0),
      z: new THREE.Vector3(0, 0, -1)
    };
    this.clipPlane.normal.copy(normals[axis] || normals.z);
    this.clipPlane.constant = Number(offsetIn) || 0;

    this.scene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (mat && !mat.isLineBasicMaterial) {
          mat.clippingPlanes = this.clippingActive ? [this.clipPlane] : [];
          mat.clipShadows = this.clippingActive;
          mat.needsUpdate = true;
        }
      }
    });
  }
}