import * as THREE from "three";

/**
 * Extrude-Based Solid Geometry & CAD Exporter (v20.0.0)
 *
 * Honesty & Scope Notice:
 * - Solid geometry is built using THREE.ExtrudeGeometry (an extrude-based
 *   approximation), NOT a bundled manifold-3d or OpenCascade.js WASM B-Rep kernel.
 * - watertightClosedShell is reported as false unless an external topological B-Rep
 *   kernel verifies closure.
 * - Loft/sweep mode is an extrude-based approximation (not a true multi-section loft).
 * - Volumes are computed directly from the generated triangle mesh using exact
 *   signed-tetrahedron summation (no 0.92 fudge factor).
 * - JSON exports are MBD JSON packets (JSON-not-STEP, isRealStepAp242File: false).
 * - Referenced engineering standards are framework references only
 *   (NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY).
 * - All internal dimensions are strictly in inches.
 */
export class ManifoldBrepEngineV20 {
  constructor(scene) {
    this.scene = scene;
    this.productsGroup = new THREE.Group();
    this.productsGroup.name = "ManifoldProductsV20";
    if (this.scene && typeof this.scene.add === "function") {
      this.scene.add(this.productsGroup);
    }
  }

  computePolygonAreaSqIn(points) {
    if (!points || points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      sum += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(sum) / 2;
  }

  computeMeshSignedVolumeIn3(geometry) {
    if (!geometry || typeof geometry.getAttribute !== "function") return 0;
    const pos = geometry.getAttribute("position");
    if (!pos) return 0;
    const idx = typeof geometry.getIndex === "function" ? geometry.getIndex() : null;
    const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
    if (triCount <= 0) return 0;

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const cross = new THREE.Vector3();
    let signedVol = 0;

    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1);
      c.fromBufferAttribute(pos, i2);
      cross.crossVectors(b, c);
      signedVol += a.dot(cross) / 6.0;
    }
    return Math.abs(signedVol);
  }

  analyzeContourGeometry(points) {
    if (!points || points.length < 3) {
      return { widthIn: 0, heightIn: 0, minEdgeIn: 0, areaSqIn: 0 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let minEdge = Infinity;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const next = points[(i + 1) % points.length];
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      const edgeLen = Math.hypot(next.x - p.x, next.y - p.y);
      if (edgeLen > 0) minEdge = Math.min(minEdge, edgeLen);
    }

    return {
      widthIn: Number((maxX - minX).toFixed(3)),
      heightIn: Number((maxY - minY).toFixed(3)),
      minEdgeIn: Number((minEdge === Infinity ? 0 : minEdge).toFixed(3)),
      areaSqIn: Number(this.computePolygonAreaSqIn(points).toFixed(4))
    };
  }

  createCircularHoleLoop(cx, cy, diameterIn, segments = 24) {
    if (!Number.isFinite(diameterIn) || diameterIn <= 0) {
      throw new Error(`Invalid circular hole diameterIn: ${diameterIn}`);
    }
    const r = diameterIn / 2;
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push({
        x: Number((cx + r * Math.cos(theta)).toFixed(4)),
        y: Number((cy + r * Math.sin(theta)).toFixed(4))
      });
    }
    return pts;
  }

  createOblongSlotLoop(cx, cy, lengthIn, widthIn, angleDeg = 0, segmentsPerCap = 12) {
    if (!Number.isFinite(lengthIn) || lengthIn <= 0) {
      throw new Error(`Invalid oblong slot lengthIn: ${lengthIn}. Must be > 0.`);
    }
    if (!Number.isFinite(widthIn) || widthIn <= 0) {
      throw new Error(`Invalid oblong slot widthIn: ${widthIn}. Must be > 0.`);
    }
    if (lengthIn < widthIn) {
      throw new Error(
        `Invalid oblong slot dimensions: lengthIn (${lengthIn}) must be >= widthIn (${widthIn}).`
      );
    }

    const rad = (angleDeg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const halfSpan = (lengthIn - widthIn) / 2;
    const r = widthIn / 2;
    const localPts = [];

    for (let i = 0; i <= segmentsPerCap; i++) {
      const a = -Math.PI / 2 + (i / segmentsPerCap) * Math.PI;
      localPts.push({ x: halfSpan + r * Math.cos(a), y: r * Math.sin(a) });
    }
    for (let i = 0; i <= segmentsPerCap; i++) {
      const a = Math.PI / 2 + (i / segmentsPerCap) * Math.PI;
      localPts.push({ x: -halfSpan + r * Math.cos(a), y: r * Math.sin(a) });
    }

    return localPts.map((pt) => ({
      x: Number((cx + pt.x * cosA - pt.y * sinA).toFixed(4)),
      y: Number((cy + pt.x * sinA + pt.y * cosA).toFixed(4))
    }));
  }

  _cleanContourForReverseEng(points) {
    const cleaned = [];
    for (const pt of points) {
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
      const prev = cleaned[cleaned.length - 1];
      if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 1e-4) {
        cleaned.push({ x: pt.x, y: pt.y });
      }
    }
    if (cleaned.length >= 2) {
      const first = cleaned[0];
      const last = cleaned[cleaned.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) <= 1e-4) {
        cleaned.pop();
      }
    }
    return cleaned.length >= 3 ? cleaned : points;
  }

  buildManifoldSolid({
    outerLoop,
    holes = [],
    features = [],
    thicknessIn = 0.5,
    bevelIn = 0.02,
    techniqueId = "parametric_2d_extrude",
    materialSpec = null,
    colorHex = 0xc2cbd4
  }) {
    if (!outerLoop || outerLoop.length < 3) {
      throw new Error("At least 3 points are required to generate a solid.");
    }
    if (!Number.isFinite(thicknessIn) || thicknessIn <= 0) {
      throw new Error(`Thickness must be greater than zero (received ${thicknessIn}).`);
    }

    const materialFallbackUsed =
      !materialSpec ||
      typeof materialSpec !== "object" ||
      !Number.isFinite(materialSpec.densityLbPerIn3) ||
      !Number.isFinite(materialSpec.costPerLbUsd);

    const effectiveMatSpec = materialFallbackUsed
      ? {
          densityLbPerIn3: 0.0975,
          densityVerified: false,
          costPerLbUsd: 3.85,
          costIsEstimate: true,
          fallbackSource: "6061-T6_UNVERIFIED_DEFAULT_FALLBACK"
        }
      : {
          ...materialSpec,
          densityVerified: Boolean(materialSpec.densityVerified),
          costIsEstimate: materialSpec.costIsEstimate ?? true
        };

    const isReverseEng = techniqueId === "reverse_eng_fit";
    const activeOuterLoop = isReverseEng ? this._cleanContourForReverseEng(outerLoop) : outerLoop;

    const toPath = (pts) => {
      const p = new THREE.Path();
      p.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
      p.closePath();
      return p;
    };

    const shape = new THREE.Shape(toPath(activeOuterLoop).getPoints(24));
    let holeAreaSqIn = 0;
    holes.forEach((h) => {
      if (Array.isArray(h) && h.length >= 3) {
        shape.holes.push(toPath(h));
        holeAreaSqIn += this.computePolygonAreaSqIn(h);
      }
    });

    const stats = this.analyzeContourGeometry(activeOuterLoop);
    let extrudeOpts;
    let techniqueImplementationNote = "EXTRUDE_GEOMETRY_ACTIVE";

    if (techniqueId === "loft_sweep_surface") {
      // Bounded taper approximation derived from user bevel/contour scale (no hardcoded -0.06)
      const safeBevelThickness = Math.min(Math.max(bevelIn, 0) * 2, thicknessIn * 0.25);
      const safeTaperSize = Math.min(
        Math.max(bevelIn, 0),
        Math.max(0, stats.minEdgeIn * 0.1)
      );
      extrudeOpts = {
        depth: thicknessIn,
        bevelEnabled: safeBevelThickness > 0 && safeTaperSize > 0,
        bevelThickness: safeBevelThickness,
        bevelSize: -safeTaperSize,
        bevelSegments: 3
      };
      techniqueImplementationNote = "EXTRUDE_BASED_APPROXIMATION_NOT_TRUE_LOFT";
    } else if (isReverseEng) {
      // Dedicated reverse_eng_fit branch: zero-bevel contour-preserving fit so measured dims are not bloated by bevels
      extrudeOpts = {
        depth: thicknessIn,
        bevelEnabled: false,
        bevelThickness: 0,
        bevelSize: 0,
        bevelSegments: 1
      };
      techniqueImplementationNote = "REVERSE_ENG_FIT_CONTOUR_CLEANED_ZERO_BEVEL_EXTRUDE";
    } else {
      const activeBevel = Math.max(0, Number(bevelIn) || 0);
      extrudeOpts = {
        depth: thicknessIn,
        bevelEnabled: activeBevel > 0,
        bevelThickness: activeBevel,
        bevelSize: activeBevel,
        bevelSegments: techniqueId === "additive_dfam_shell" ? 3 : 2
      };
    }

    const geom = new THREE.ExtrudeGeometry(shape, extrudeOpts);
    geom.rotateX(-Math.PI / 2);

    // Shift bottom bevel upward so the lowest vertex sits on y = 0 rather than dipping below the build plate
    if (extrudeOpts.bevelEnabled && extrudeOpts.bevelThickness > 0) {
      geom.translate(0, extrudeOpts.bevelThickness, 0);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: techniqueId === "additive_dfam_shell" ? 0.35 : 0.82,
      roughness: techniqueId === "additive_dfam_shell" ? 0.52 : 0.26
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.productsGroup.add(mesh);

    const netAreaSqIn = Math.max(0, this.computePolygonAreaSqIn(activeOuterLoop) - holeAreaSqIn);
    const exactMeshVolumeIn3 = Number(this.computeMeshSignedVolumeIn3(geom).toFixed(4));
    const massLb = Number((exactMeshVolumeIn3 * effectiveMatSpec.densityLbPerIn3).toFixed(3));
    const estMaterialCostUsd = Number((massLb * effectiveMatSpec.costPerLbUsd).toFixed(2));

    return {
      mesh,
      manifoldSpec: {
        kernelTarget: "THREE.ExtrudeGeometry (extrude-based approximation; no bundled manifold-3d or OpenCascade.js WASM)",
        watertightClosedShell: false,
        watertightStatus: "UNVERIFIED_EXTRUDE_GEOMETRY_NO_BREP_WATERTIGHT_PROOF",
        isExtrudeApproximation: true,
        techniqueImplementationNote,
        featureCount: features.length,
        holeLoopCount: holes.length,
        reverseEngPointsCleaned: isReverseEng ? outerLoop.length - activeOuterLoop.length : 0
      },
      metrics: {
        widthIn: stats.widthIn,
        heightIn: stats.heightIn,
        thicknessIn: Number(thicknessIn.toFixed(3)),
        planarNetAreaSqIn: Number(netAreaSqIn.toFixed(4)),
        volumeIn3: exactMeshVolumeIn3,
        volumeMethod: "EXACT_SIGNED_TETRAHEDRON_MESH_VOLUME",
        massLb,
        densityVerified: effectiveMatSpec.densityVerified,
        estMaterialCostUsd,
        costIsEstimate: effectiveMatSpec.costIsEstimate,
        materialFallbackUsed,
        materialFallbackNote: materialFallbackUsed
          ? "No materialSpec passed — mass/cost computed using 6061-T6 estimate fallback."
          : null
      }
    };
  }

  removeProduct(target) {
    if (!target) return false;
    let removed = false;
    if (this.productsGroup && target.parent === this.productsGroup) {
      this.productsGroup.remove(target);
      removed = true;
    } else if (target.parent) {
      target.parent.remove(target);
      removed = true;
    }
    this._disposeObject3D(target);
    return removed;
  }

  clearProducts() {
    if (!this.productsGroup) return 0;
    const children = [...this.productsGroup.children];
    children.forEach((child) => {
      this.productsGroup.remove(child);
      this._disposeObject3D(child);
    });
    return children.length;
  }

  _disposeObject3D(obj) {
    if (!obj || typeof obj.traverse !== "function") return;
    obj.traverse((node) => {
      if (node.geometry && typeof node.geometry.dispose === "function") {
        node.geometry.dispose();
      }
      const mats = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
      mats.forEach((m) => {
        if (!m) return;
        ["map", "alphaMap", "bumpMap", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap"].forEach((k) => {
          if (m[k] && typeof m[k].dispose === "function") m[k].dispose();
        });
        if (typeof m.dispose === "function") m.dispose();
      });
    });
  }

  exportDXF(outerLoop, holes = [], filename = "v20_profile.dxf") {
    if (!Array.isArray(outerLoop) || outerLoop.length < 3) {
      throw new Error("DXF export requires outerLoop with at least 3 valid vertices.");
    }
    for (let i = 0; i < outerLoop.length; i++) {
      const pt = outerLoop[i];
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
        throw new Error(`DXF export rejected non-finite vertex at index ${i}.`);
      }
    }
    if (!Array.isArray(holes)) {
      throw new Error("DXF export holes argument must be an array of loops.");
    }

    const lines = [
      "0", "SECTION",
      "2", "HEADER",
      "9", "$ACADVER",
      "1", "AC1015",
      "9", "$INSUNITS",
      "70", "1",
      "9", "$MEASUREMENT",
      "70", "0",
      "0", "ENDSEC",
      "0", "SECTION",
      "2", "ENTITIES"
    ];

    const pushPoly = (pts, layer) => {
      lines.push("0", "LWPOLYLINE", "8", layer, "90", String(pts.length), "70", "1");
      pts.forEach((pt) => {
        lines.push("10", Number(pt.x).toFixed(4), "20", Number(pt.y).toFixed(4));
      });
    };

    pushPoly(outerLoop, "OUTER_PROFILE");
    holes.forEach((h, hIdx) => {
      if (!Array.isArray(h) || h.length < 3) {
        throw new Error(`DXF export rejected invalid hole loop at index ${hIdx} (needs >= 3 points).`);
      }
      for (const pt of h) {
        if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
          throw new Error(`DXF export rejected non-finite vertex inside hole loop ${hIdx}.`);
        }
      }
      pushPoly(h, "INNER_FEATURES");
    });

    lines.push("0", "ENDSEC", "0", "EOF");
    const dxfContent = lines.join("\n");
    this._downloadBlob(new Blob([dxfContent], { type: "application/dxf" }), filename);
    return dxfContent;
  }

  exportBinarySTL(object3D, filename = "v20_part.stl") {
    if (!object3D || typeof object3D.traverse !== "function") {
      throw new Error("STL export refused: missing 3D object.");
    }
    if (typeof object3D.updateMatrixWorld === "function") {
      object3D.updateMatrixWorld(true);
    }

    const triangles = [];
    let signedVolume = 0;
    let refusedPlaneOrRef = false;
    let refusedReason = "";

    object3D.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.geometry instanceof THREE.PlaneGeometry || child.geometry.type === "PlaneGeometry") {
        refusedPlaneOrRef = true;
        refusedReason = "PlaneGeometry reference planes cannot be exported as STL.";
        return;
      }
      if (child.userData?.isReferencePlane || child.name === "calibrated_reference_plane") {
        refusedPlaneOrRef = true;
        refusedReason = "Calibrated reference planes cannot be exported as STL.";
        return;
      }

      const wasIndexed = Boolean(child.geometry.index);
      const geom = wasIndexed ? child.geometry.toNonIndexed() : child.geometry;
      try {
        const pos = geom.getAttribute ? geom.getAttribute("position") : geom.attributes?.position;
        if (!pos || pos.count < 3) return;
        const triCount = Math.floor(pos.count / 3);
        const crossVol = new THREE.Vector3();

        for (let t = 0; t < triCount; t++) {
          const i = t * 3;
          const a = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
          const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1).applyMatrix4(child.matrixWorld);
          const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2).applyMatrix4(child.matrixWorld);

          crossVol.crossVectors(b, c);
          signedVolume += a.dot(crossVol) / 6.0;

          const ab = new THREE.Vector3().subVectors(b, a);
          const ac = new THREE.Vector3().subVectors(c, a);
          const n = ab.cross(ac);
          if (n.lengthSq() > 0) n.normalize();
          else n.set(0, 0, 1);

          triangles.push({ a, b, c, n });
        }
      } finally {
        if (wasIndexed && typeof geom.dispose === "function") {
          geom.dispose();
        }
      }
    });

    if (refusedPlaneOrRef) {
      throw new Error(`STL export refused: ${refusedReason}`);
    }
    if (triangles.length === 0) {
      throw new Error("STL export refused: zero-triangle geometry.");
    }
    if (!Number.isFinite(signedVolume) || Math.abs(signedVolume) <= 1e-6) {
      throw new Error("STL export refused: zero-volume or open planar geometry.");
    }

    const buffer = new ArrayBuffer(84 + triangles.length * 50);
    const view = new DataView(buffer);
    view.setUint32(80, triangles.length, true);

    let offset = 84;
    triangles.forEach(({ a, b, c, n }) => {
      [n.x, n.y, n.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z].forEach((val) => {
        view.setFloat32(offset, val, true);
        offset += 4;
      });
      view.setUint16(offset, 0, true);
      offset += 2;
    });

    this._downloadBlob(new Blob([buffer], { type: "application/octet-stream" }), filename);
    return buffer;
  }

  exportJsonPacket(packetObj, filename = "qads_v20_design_report_mbd_json.json") {
    const jsonText = JSON.stringify(packetObj, null, 2);
    this._downloadBlob(new Blob([jsonText], { type: "application/json" }), filename);
    return jsonText;
  }

  _downloadBlob(blob, filename) {
    if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}