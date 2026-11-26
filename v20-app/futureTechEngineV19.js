import { WebGPUComputeEngineV19 } from "./webgpuComputeEngineV19.js";

/**
 * Governance, Closed-Loop RDP Simplification & MBD JSON Packet Builder (v19.0.0 — Quantum Aerospace Design Studio)
 * - Exports Design Report / Modeling-Room Transfer .JSON packets (NOT native ISO 10303-242 STEP files).
 * - NIST SP 800-207, NIST AI RMF, and NIST IR 8547 entries are metadata framework references ONLY (NOT certified).
 * - Preserves closed polygon validity (>= 3 vertices, non-zero area) during RDP contour simplification.
 * - Internal geometry units: strictly inches (exact metric display conversions emitted at export edges).
 */
export class FutureTechEngineV19 extends WebGPUComputeEngineV19 {
  _polygonAreaAbs(pts) {
    if (!Array.isArray(pts) || pts.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      sum += a.x * b.y - b.x * a.y;
    }
    return Math.abs(sum) * 0.5;
  }

  simplifyContourRDP(points, epsilonIn = 0.005) {
    if (!Array.isArray(points) || points.length < 3) return points;
    for (let i = 0; i < points.length; i++) {
      if (!points[i] || !Number.isFinite(points[i].x) || !points[i].y && points[i].y !== 0 || !Number.isFinite(points[i].y)) {
        throw new Error(`simplifyContourRDP received non-finite coordinate at points[${i}].`);
      }
    }
    if (!Number.isFinite(epsilonIn) || epsilonIn < 0) {
      throw new Error(`simplifyContourRDP invalid epsilonIn=${epsilonIn}; must be >= 0.`);
    }

    // Handle explicit closed loop (first point repeated as last point) cleanly
    const first = points[0];
    const last = points[points.length - 1];
    const hasDuplicateClosure =
      points.length >= 4 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-6;
    const ring = hasDuplicateClosure ? points.slice(0, -1) : points.slice();
    if (ring.length <= 3) return points;

    const perpDist = (pt, a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const mag = Math.hypot(dx, dy);
      if (mag === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
      return Math.abs(dy * pt.x - dx * pt.y + b.x * a.y - b.y * a.x) / mag;
    };

    const rdpOpen = (pts) => {
      if (pts.length <= 2) return pts;
      let maxD = 0;
      let idx = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
        if (d > maxD) {
          maxD = d;
          idx = i;
        }
      }
      if (maxD > epsilonIn) {
        return rdpOpen(pts.slice(0, idx + 1)).slice(0, -1).concat(rdpOpen(pts.slice(idx)));
      }
      return [pts[0], pts[pts.length - 1]];
    };

    // Split closed polygon across its maximal chord from ring[0] so closed outlines cannot collapse to 2 endpoints
    let farIdx = 1;
    let maxChordSq = -1;
    for (let i = 1; i < ring.length; i++) {
      const dx = ring[i].x - ring[0].x;
      const dy = ring[i].y - ring[0].y;
      const dSq = dx * dx + dy * dy;
      if (dSq > maxChordSq) {
        maxChordSq = dSq;
        farIdx = i;
      }
    }

    const chainA = ring.slice(0, farIdx + 1);
    const chainB = ring.slice(farIdx).concat([ring[0]]);
    const simpA = rdpOpen(chainA);
    const simpB = rdpOpen(chainB);
    const mergedRing = simpA.slice(0, -1).concat(simpB.slice(0, -1));

    // Guard against degenerate collapse (< 3 points or near-zero area)
    if (mergedRing.length < 3 || this._polygonAreaAbs(mergedRing) <= 1e-5) {
      return points;
    }

    return hasDuplicateClosure ? mergedRing.concat([mergedRing[0]]) : mergedRing;
  }

  _sanitizeDrawingSheetMetadata(rawSheet) {
    const honestScope =
      "2D Plan / Profile Summary + Thickness Indicator (Fit-to-View, Unscaled — NOT Scaled Third-Angle Orthographic / Isometric / True Section)";
    if (!rawSheet || typeof rawSheet !== "object") {
      return {
        sheetPresent: false,
        isScaledOrthographic: false,
        honestScope,
        notes: "No sheet snapshot attached; interactive multi-view CAD drafting runs in Room 3 (2D Drafting)."
      };
    }

    const sanitized = { ...rawSheet };
    const overclaimedText = JSON.stringify(rawSheet);
    const hadLegacyOverclaim = /Third-Angle Orthographic|1:1/i.test(overclaimedText);
    if (hadLegacyOverclaim) {
      delete sanitized.projection;
      delete sanitized.scale;
    }

    return {
      ...sanitized,
      isScaledOrthographic: false,
      honestScope,
      legacyOverclaimStripped: hadLegacyOverclaim
    };
  }

  buildMbdAp242Package({
    item,
    revision = "D",
    pmiCallouts = [],
    humanVerified = false,
    signoffActor = null,
    computeField = null
  } = {}) {
    if (!item || typeof item !== "object") {
      throw new Error("buildMbdAp242Package requires a valid item object (missing item).");
    }
    if (!item.id && !item.name) {
      throw new Error("buildMbdAp242Package requires item.id or item.name.");
    }

    const dims = item.metrics || {};
    const unselectedFields = [];
    if (!item.industryId) unselectedFields.push("industryId");
    if (!item.environmentId) unselectedFields.push("environmentId");
    if (!item.techniqueId) unselectedFields.push("techniqueId");
    if (!item.materialName) unselectedFields.push("materialName");

    // Strict TEVV human verification gate (Flag 3)
    const cleanActor =
      typeof signoffActor === "string" &&
      signoffActor.trim().length >= 2 &&
      !/^unassigned engineer$/i.test(signoffActor.trim())
        ? signoffActor.trim()
        : null;
    const strictlyVerified = humanVerified === true && cleanActor !== null;
    const tevvGateWarning =
      humanVerified === true && cleanActor === null
        ? "humanVerified was true without a real signoffActor name — signoff rejected."
        : null;

    // PMI validation & placeholder tracking (Flags 5 & 6)
    const pmiList = Array.isArray(pmiCallouts) ? pmiCallouts : [];
    const hasRealPmi = pmiList.length > 0;
    const semanticPMI = pmiList.map((c, i) => {
      const placeholderDefaultsUsed = [];
      const refVal = c?.featureRef
        ? c.featureRef
        : (placeholderDefaultsUsed.push("featureRef=UNSPECIFIED"), "UNSPECIFIED");
      const typeVal = c?.type
        ? c.type
        : (placeholderDefaultsUsed.push("type=linear_tolerance_default"), "linear_tolerance");
      const datumVal = c?.datumFrame
        ? c.datumFrame
        : (placeholderDefaultsUsed.push("datumFrame=NONE_SUPPLIED"), null);
      const nominalVal = Number.isFinite(c?.nominalIn) ? c.nominalIn : null;
      if (nominalVal === null) placeholderDefaultsUsed.push("nominalIn=NEEDING_RAYS_MEASUREMENT");

      return {
        id: `PMI_${i + 1}`,
        featureRef: refVal,
        type: typeVal,
        nominalIn: nominalVal,
        plusMinusIn: Number.isFinite(c?.plusMinusIn) ? c.plusMinusIn : null,
        datumFrame: datumVal,
        datumFrameVerified: Boolean(c?.datumFrameVerified),
        isPlaceholderDefault: placeholderDefaultsUsed.length > 0,
        placeholderDefaultsUsed,
        measurementStatus: nominalVal !== null ? "FROM_MODEL_OR_CALIBRATION" : "NEEDING RAY'S MEASUREMENT"
      };
    });

    const hasRealComputeDispatch = Boolean(computeField && computeField.isRealGpuDispatch === true);

    return {
      schema: "QADS_MBD_JSON_PACKET_V19",
      studioName: "Quantum Aerospace Design Studio",
      studioVersion: this.version,
      isRealStepAp242File: false,
      stepAp242Disclaimer:
        "JSON Design Report & Modeling-Room Transfer Packet ONLY — NOT a native ISO 10303-242 STEP (.stp/.step) CAD file (NOT YET WORKING for native STEP).",
      unitsPolicy: {
        internalUnit: "inches",
        metricRole: "DISPLAY_ONLY_EXACT_EDGE_CONVERSION"
      },
      exportedAt: new Date().toISOString(),
      partId: item.id || null,
      name: item.name || null,
      revision,
      industryId: item.industryId || null,
      environmentId: item.environmentId || null,
      techniqueId: item.techniqueId || null,
      domain: item.domain || null,
      stage: item.stage || null,
      fabricationTier: item.tierLabel || null,
      standard: item.standardLabel || null,
      material: item.materialName || null,
      materialStatus: item.materialName
        ? (dims.materialFallbackUsed ? "UNVERIFIED_6061_FALLBACK" : "CATALOG_SELECTED")
        : "UNSPECIFIED_MATERIAL_NEEDING_SELECTION",
      unitSystem: item.unitSystem || "imperial",
      packetAssumptions: {
        unselectedFields,
        hasUnselectedFields: unselectedFields.length > 0
      },
      dimensionsIn: {
        widthIn: dims.widthIn ?? null,
        heightIn: dims.heightIn ?? null,
        thicknessIn: dims.thicknessIn ?? null,
        volumeIn3: dims.volumeIn3 ?? null,
        volumeSource: dims.volumeSource || null,
        massLb: dims.massLb ?? null,
        estMaterialCostUsd: dims.estMaterialCostUsd ?? null,
        costIsEstimate: dims.estMaterialCostUsd != null ? true : null
      },
      dimensionsMm: {
        widthMm: dims.widthIn != null ? Number((dims.widthIn * 25.4).toFixed(3)) : null,
        heightMm: dims.heightIn != null ? Number((dims.heightIn * 25.4).toFixed(3)) : null,
        thicknessMm: dims.thicknessIn != null ? Number((dims.thicknessIn * 25.4).toFixed(3)) : null,
        volumeCm3: dims.volumeIn3 != null ? Number((dims.volumeIn3 * 16.387064).toFixed(3)) : null,
        massKg: dims.massLb != null ? Number((dims.massLb * 0.45359237).toFixed(4)) : null
      },
      features: item.features || [],
      computeFieldSummary: computeField
        ? {
            executionMode: computeField.executionMode || (hasRealComputeDispatch ? "REAL_WEBGPU_COMPUTE_PIPELINE" : "CPU_PARITY_SIMULATION_ONLY"),
            isRealGpuDispatch: hasRealComputeDispatch,
            workgroupSize: computeField.workgroupSize ?? 64,
            workgroupsDispatched: hasRealComputeDispatch ? (computeField.workgroupsDispatched ?? 0) : 0,
            simulatedWorkgroups: computeField.simulatedWorkgroups ?? null,
            sampleCount: computeField.sampleCount ?? 0,
            minClearanceIn: computeField.minClearanceIn ?? null,
            clearanceStatus: computeField.clearanceStatus || (computeField.minClearanceIn === null ? "NO_HOLES_DEFINED" : "EVALUATED"),
            violations: computeField.violations ?? 0,
            warnings: Array.isArray(computeField.warnings) ? computeField.warnings : []
          }
        : null,
      techniqueMetadata: item.techniqueMetadata || null,
      matchReport: item.matchReport || null,
      drawingSheet: this._sanitizeDrawingSheetMetadata(item.drawingSheet),
      pmiStatus: hasRealPmi ? "PMI_SUPPLIED_CHECK_PLACEHOLDERS" : "NO_REAL_PMI_CALLOUTS_SUPPLIED",
      semanticPMI,
      governance: {
        certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
        zeroTrustPolicy: "NIST SP 800-207 Framework Reference Only (NOT Certified)",
        aiRmfOversight: "NIST AI RMF Framework Reference Only (NOT Certified)",
        pqcStandard: "NIST IR 8547 (ML-KEM-768 / ML-DSA / SLH-DSA) — Framework Reference Only (NOT Implemented / NOT Certified)",
        humanOversightRequired: true,
        humanVerified: strictlyVerified,
        signoffActor: strictlyVerified ? cleanActor : null,
        tevvGateWarning,
        tevvStatus: strictlyVerified ? "VERIFIED_BY_ENGINEER" : "PENDING_ENGINEERING_REVIEW"
      }
    };
  }
}
