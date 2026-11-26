import * as THREE from "three";

/**
 * Extrude-Based Solid & Shop Export Engine (v19.0.0 — Quantum Aerospace Design Studio)
 * - Uses THREE.ExtrudeGeometry (an extrude-based mesh approximation — NOT a true B-Rep solid kernel).
 * - NO watertight manifold guarantee unless an external B-Rep kernel (e.g., OpenCASCADE.js) is wired and verified.
 * - Exports Binary .STL (strictly 3D solids; refuses flat reference planes), 2D .DXF (AC1015 + inches header),
 *   and Design Report / Transfer .JSON packets (NOT native ISO 10303-242 STEP files).
 * - Internal units: strictly inches.
 * - Disposal ownership: Caller/MatrixController may call removeProduct(mesh) or clearProducts() to free GPU buffers.
 */
export class ManifoldBrepEngineV19 {
  constructor(scene) {
    this.scene = scene;
    this.productsGroup = new THREE.Group();
    this.productsGroup.name = "ExtrudedProductsV19";
    this.scene.add(this.productsGroup);
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

  /**
   * Computes exact closed-mesh volume (in^3) via signed tetrahedron summation
   * across every triangle in the built BufferGeometry (includes bevels & hole loops).
   */
  computeSignedMeshVolumeIn3(geometry) {
    if (!geometry || !geometry.attributes?.position) return 0;
    const nonIdx = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = nonIdx.attributes.position;
    let signedVol6 = 0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const crossBC = new THREE.Vector3();

    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      crossBC.crossVectors(b, c);
      signedVol6 += a.dot(crossBC);
    }

    if (nonIdx !== geometry) nonIdx.dispose();
    return Math.abs(signedVol6) / 6;
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
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error(`Invalid circular hole center (${cx}, ${cy}).`);
    }
    if (!Number.isFinite(diameterIn) || diameterIn <= 0) {
      throw new Error(`Invalid circular hole diameterIn=${diameterIn}; must be > 0.`);
    }
    const segCount = Math.max(6, Math.round(segments));
    const r = diameterIn / 2;
    const pts = [];
    for (let i = 0; i < segCount; i++) {
      const theta = (i / segCount) * Math.PI * 2;
      pts.push({
        x: Number((cx + r * Math.cos(theta)).toFixed(4)),
        y: Number((cy + r * Math.sin(theta)).toFixed(4))
      });
    }
    return pts;
  }

  createOblongSlotLoop(cx, cy, lengthIn, widthIn, angleDeg = 0, segmentsPerCap = 12) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error(`Invalid slot center (${cx}, ${cy}).`);
    }
    if (!Number.isFinite(lengthIn) || lengthIn <= 0 || !Number.isFinite(widthIn) || widthIn <= 0) {
      throw new Error(`Invalid slot dimensions: lengthIn=${lengthIn}, widthIn=${widthIn}; both must be > 0.`);
    }
    if (lengthIn < widthIn) {
      throw new Error(
        `Invalid oblong slot: lengthIn (${lengthIn} in.) must be >= widthIn (${widthIn} in.).`
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
    if (!Array.isArray(outerLoop) || outerLoop.length < 3) {
      throw new Error("At least 3 points are required to generate an extruded solid.");
    }
    if (!Number.isFinite(thicknessIn) || thicknessIn <= 0) {
      throw new Error(`Invalid thicknessIn=${thicknessIn}; must be greater than zero.`);
    }
    const outerAreaSqIn = this.computePolygonAreaSqIn(outerLoop);
    if (outerAreaSqIn <= 1e-6) {
      throw new Error("Outer contour has near-zero area; cannot extrude degenerate polygon.");
    }

    const stats = this.analyzeContourGeometry(outerLoop);

    const buildPath = (pts, asShape = false) => {
      const p = asShape ? new THREE.Shape() : new THREE.Path();
      p.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        p.lineTo(pts[i].x, pts[i].y);
      }
      p.closePath();
      return p;
    };

    const shape = buildPath(outerLoop, true);
    let holeAreaSqIn = 0;
    let validHoleLoops = 0;
    holes.forEach((h) => {
      if (Array.isArray(h) && h.length >= 3 && this.computePolygonAreaSqIn(h) > 1e-6) {
        shape.holes.push(buildPath(h, false));
        holeAreaSqIn += this.computePolygonAreaSqIn(h);
        validHoleLoops++;
      }
    });

    const isLoftApprox = techniqueId === "loft_sweep_surface";
    const isReverseEngFallback = techniqueId === "reverse_eng_fit";
    const safeNegBevelSize = -Math.min(0.06, stats.widthIn * 0.1, stats.heightIn * 0.1);

    const extrudeOpts = isLoftApprox
      ? {
          depth: thicknessIn,
          bevelEnabled: true,
          bevelThickness: Math.min(bevelIn * 2, thicknessIn * 0.25),
          bevelSize: safeNegBevelSize,
          bevelSegments: 3
        }
      : {
          depth: thicknessIn,
          bevelEnabled: bevelIn > 0,
          bevelThickness: bevelIn,
          bevelSize: bevelIn,
          bevelSegments: techniqueId === "additive_dfam_shell" ? 3 : 2
        };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeOpts);
    geom.rotateX(-Math.PI / 2);

    // Ensure bottom bevel never dips below the Y=0 deck floor datum
    geom.computeBoundingBox();
    if (geom.boundingBox && Math.abs(geom.boundingBox.min.y) > 1e-6) {
      geom.translate(0, -geom.boundingBox.min.y, 0);
      geom.computeBoundingBox();
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
    mesh.userData.isManufacturedProduct = true;
    this.productsGroup.add(mesh);

    const volumeIn3 = Number(this.computeSignedMeshVolumeIn3(geom).toFixed(4));
    const nominalPlanarVolumeIn3 = Number(
      (Math.max(0, outerAreaSqIn - holeAreaSqIn) * thicknessIn).toFixed(4)
    );

    const materialFallbackUsed = !materialSpec || !Number.isFinite(materialSpec.densityLbPerIn3);
    const effectiveDensity = materialFallbackUsed ? 0.0975 : materialSpec.densityLbPerIn3;
    const effectiveCostPerLb = materialSpec && Number.isFinite(materialSpec.costPerLbUsd)
      ? materialSpec.costPerLbUsd
      : (materialFallbackUsed ? 3.85 : null);

    const massLb = Number((volumeIn3 * effectiveDensity).toFixed(3));
    const estMaterialCostUsd = effectiveCostPerLb !== null
      ? Number((massLb * effectiveCostPerLb).toFixed(2))
      : null;

    return {
      mesh,
      manifoldSpec: {
        kernelTarget: "THREE.ExtrudeGeometry (extrude-based approximation — NOT a real B-Rep kernel)",
        isRealBRepKernel: false,
        watertightClosedShell: false,
        watertightVerified: false,
        watertightStatus: "UNVERIFIED — THREE.ExtrudeGeometry approximation has no watertight B-Rep guarantee",
        techniqueLabel: isLoftApprox
          ? "Extrude-Based Approximation (NOT a True Multi-Station Loft/Sweep)"
          : isReverseEngFallback
            ? "Default Extrude Fallback (reverse_eng_fit branch not yet implemented in geometry engine)"
            : techniqueId,
        bevelNote: isLoftApprox
          ? `Provisional tapered bevel approximation (bevelSize=${safeNegBevelSize.toFixed(4)} in.)`
          : (extrudeOpts.bevelEnabled ? `Bottom-shifted +Y so min.y = 0.000 in. (bevel=${extrudeOpts.bevelThickness} in.)` : "No bevel"),
        featureCount: features.length,
        holeLoopCount: validHoleLoops
      },
      metrics: {
        unitsInternal: "inches",
        widthIn: stats.widthIn,
        heightIn: stats.heightIn,
        thicknessIn: Number(thicknessIn.toFixed(3)),
        volumeIn3,
        volumeSource: "SIGNED_TETRAHEDRON_ACTUAL_MESH_SUM",
        nominalPlanarVolumeIn3,
        massLb,
        materialFallbackUsed,
        materialStatus: materialFallbackUsed
          ? "UNVERIFIED_FALLBACK_6061_NEEDING_MATERIAL_SELECTION"
          : "CATALOG_MATERIAL_DENSITY",
        estMaterialCostUsd,
        costIsEstimate: true
      }
    };
  }

  removeProduct(object3D) {
    if (!object3D) return false;
    if (object3D.parent) object3D.parent.remove(object3D);
    object3D.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
    return true;
  }

  clearProducts() {
    while (this.productsGroup.children.length > 0) {
      this.removeProduct(this.productsGroup.children[0]);
    }
  }

  exportDXF(outerLoop, holes = [], filename = "v19_profile.dxf") {
    if (!Array.isArray(outerLoop) || outerLoop.length < 3) {
      throw new Error("Cannot export DXF: outerLoop must contain at least 3 valid vertices.");
    }
    const validateLoop = (pts, label) => {
      pts.forEach((pt, idx) => {
        if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
          throw new Error(`Cannot export DXF: invalid coordinate at ${label}[${idx}].`);
        }
      });
    };
    validateLoop(outerLoop, "outerLoop");

    const lines = [
      "0", "SECTION",
      "2", "HEADER",
      "9", "$ACADVER", "1", "AC1015",
      "9", "$INSUNITS", "70", "1",
      "9", "$MEASUREMENT", "70", "0",
      "0", "ENDSEC",
      "0", "SECTION",
      "2", "ENTITIES"
    ];

    const pushPoly = (pts, layer) => {
      lines.push("0", "LWPOLYLINE", "8", layer, "90", String(pts.length), "70", "1");
      pts.forEach((pt) => {
        lines.push("10", pt.x.toFixed(4), "20", pt.y.toFixed(4));
      });
    };

    pushPoly(outerLoop, "OUTER_PROFILE");
    holes.forEach((h, i) => {
      if (Array.isArray(h) && h.length >= 3) {
        validateLoop(h, `hole[${i}]`);
        pushPoly(h, "INNER_FEATURES");
      }
    });

    lines.push("0", "ENDSEC", "0", "EOF");
    this._downloadBlob(new Blob([lines.join("\n")], { type: "application/dxf" }), filename);
  }

  exportBinarySTL(object3D, filename = "v19_part.stl") {
    if (!object3D) {
      throw new Error("Refused .STL export: no 3D solid object provided.");
    }
    object3D.updateMatrixWorld(true);

    if (object3D.userData?.isReferencePlane || object3D.geometry?.type === "PlaneGeometry") {
      throw new Error("Refused .STL export: reference photo planes / PlaneGeometry cannot be exported as 3D STL.");
    }

    const triangles = [];
    const tempA = new THREE.Vector3();
    const tempB = new THREE.Vector3();
    const tempC = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    let signedVol6 = 0;

    object3D.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.userData?.isReferencePlane || child.userData?.isHelper || child.geometry.type === "PlaneGeometry") {
        return;
      }

      const geom = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry;
      const pos = geom.attributes.position;
      if (!pos || pos.count < 3) {
        if (geom !== child.geometry) geom.dispose();
        return;
      }

      for (let i = 0; i + 2 < pos.count; i += 3) {
        const a = tempA.clone().fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
        const b = tempB.clone().fromBufferAttribute(pos, i + 1).applyMatrix4(child.matrixWorld);
        const c = tempC.clone().fromBufferAttribute(pos, i + 2).applyMatrix4(child.matrixWorld);

        ab.subVectors(b, a);
        ac.subVectors(c, a);
        const rawNormal = new THREE.Vector3().crossVectors(ab, ac);
        if (rawNormal.lengthSq() <= 1e-12) continue;

        signedVol6 += a.dot(new THREE.Vector3().crossVectors(b, c));
        rawNormal.normalize();
        triangles.push({ a, b, c, n: rawNormal });
      }

      if (geom !== child.geometry) geom.dispose();
    });

    if (triangles.length === 0) {
      throw new Error("Refused .STL export: no valid 3D solid triangles found (flat or empty target).");
    }
    if (Math.abs(signedVol6) / 6 <= 1e-7) {
      throw new Error("Refused .STL export: mesh has zero enclosed volume (flat/degenerate geometry).");
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
  }

  exportJsonPacket(packetObj, filename = "qads_v19_design_report_mbd_json.json") {
    this._downloadBlob(
      new Blob([JSON.stringify(packetObj, null, 2)], { type: "application/json" }),
      filename
    );
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}