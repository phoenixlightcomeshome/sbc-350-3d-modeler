import { WebGPUComputeEngineV20 } from "./webgpuComputeEngineV20.js";

/**
 * FutureTech MBD JSON Packet Builder & Contour Simplifier (v20.0.0)
 *
 * Honesty & Scope Notice:
 * - Inherits WebGPU capability detection, WebGPU/CPU clearance grid dispatch,
 *   and material-array section clipping from WebGPUComputeEngineV20.
 * - buildMbdAp242Package() exports a JSON metadata packet (QADS_MBD_JSON_PACKET_V20)
 *   with isRealStepAp242File: false — it is NOT a native STEP AP242 ISO 10303-21 file.
 * - simplifyContourRDP() uses exact clamped point-to-segment distance and guards
 *   closed contours against collapsing below 3 vertices.
 * - Governance entries (NIST SP 800-207, NIST AI RMF, NIST IR 8547) are
 *   NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY.
 * - Human engineering sign-off requires humanVerified === true and a non-null
 *   signoffActor; otherwise signoffActor is null and tevvStatus is PENDING_ENGINEERING_REVIEW.
 */
export class FutureTechEngineV20 extends WebGPUComputeEngineV20 {
  _distancePointToSegment(pt, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-12) {
      return Math.hypot(pt.x - a.x, pt.y - a.y);
    }
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(pt.x - projX, pt.y - projY);
  }

  simplifyContourRDP(points, epsilonIn = 0.005, { closed = true } = {}) {
    if (!Array.isArray(points) || points.length < 3) return points;
    const eps = Number.isFinite(epsilonIn) && epsilonIn >= 0 ? epsilonIn : 0.005;

    const rdpOpen = (pts) => {
      if (pts.length <= 2) return pts;
      let maxD = 0;
      let idx = 0;
      const first = pts[0];
      const last = pts[pts.length - 1];
      for (let i = 1; i < pts.length - 1; i++) {
        const d = this._distancePointToSegment(pts[i], first, last);
        if (d > maxD) {
          maxD = d;
          idx = i;
        }
      }
      if (maxD > eps) {
        const left = rdpOpen(pts.slice(0, idx + 1));
        const right = rdpOpen(pts.slice(idx));
        return left.slice(0, -1).concat(right);
      }
      return [first, last];
    };

    if (!closed) {
      return rdpOpen(points);
    }

    const pFirst = points[0];
    const pLast = points[points.length - 1];
    const hasExplicitClosingPt =
      points.length >= 4 && Math.hypot(pLast.x - pFirst.x, pLast.y - pFirst.y) <= 1e-6;
    const openPts = hasExplicitClosingPt ? points.slice(0, -1) : points.slice();
    if (openPts.length < 3) return points;

    let farIdx = 1;
    let farDist = -1;
    for (let i = 1; i < openPts.length; i++) {
      const d = Math.hypot(openPts[i].x - openPts[0].x, openPts[i].y - openPts[0].y);
      if (d > farDist) {
        farDist = d;
        farIdx = i;
      }
    }

    const chain1 = rdpOpen(openPts.slice(0, farIdx + 1));
    const chain2 = rdpOpen(openPts.slice(farIdx).concat([openPts[0]]));
    const merged = chain1.slice(0, -1).concat(chain2.slice(0, -1));

    if (merged.length < 3) {
      return points;
    }

    return hasExplicitClosingPt ? merged.concat([{ ...merged[0] }]) : merged;
  }

  _sanitizeMaterials3dpReport(report) {
    if (!report || typeof report !== "object") return null;
    const gates = report.infrastructureGates
      ? {
          ...report.infrastructureGates,
          certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
          metrologyQualification:
            report.infrastructureGates.metrologyQualification === "CMM_CT_VERIFIED"
              ? "CMM_CT_ENABLED_NOT_VERIFIED"
              : report.infrastructureGates.metrologyQualification
        }
      : null;

    return {
      ...report,
      certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
      warpRiskIndexIsEstimate: report.warpRiskIndexIsEstimate ?? true,
      effectiveDensityIsEstimate: report.effectiveDensityIsEstimate ?? true,
      estimatedBuildHoursIsEstimate: report.estimatedBuildHoursIsEstimate ?? true,
      infraReadinessScoreIsEstimate: report.infraReadinessScoreIsEstimate ?? true,
      materialStatusFlags: report.materialStatusFlags || {
        costIsEstimate: true,
        thermalParamsStatus: "UNVERIFIED_ESTIMATE_STATUS_UNSPECIFIED",
        bendParamsStatus: "UNVERIFIED_ESTIMATE_NEEDING_TOOLING_TEST"
      },
      processStatusFlags: report.processStatusFlags || {
        dataStatus: "UNVERIFIED_ESTIMATE_STATUS_UNSPECIFIED"
      },
      infrastructureGates: gates
    };
  }

  _sanitizeDrawingSheetSummary(sheet) {
    if (!sheet || typeof sheet !== "object") return null;
    return {
      ...sheet,
      sheetType: "2D_PLAN_PROFILE_SUMMARY_AND_THICKNESS_INDICATOR_FIT_TO_VIEW_UNSCALED",
      isScaledOrthographicProjection: false,
      isTrueCrossSection: false,
      projectionNote:
        "2D Plan / Profile Summary + Thickness Indicator (Fit-to-View — Unscaled); NOT a scaled third-angle orthographic, isometric, or true cross-section drawing."
    };
  }

  buildMbdAp242Package({
    item,
    revision = "E",
    pmiCallouts = [],
    humanVerified = false,
    signoffActor = null,
    computeField = null,
    materials3dpReport = null
  } = {}) {
    if (!item || typeof item !== "object") {
      throw new Error("buildMbdAp242Package requires a valid item object (missing item).");
    }
    if (!item.name || !String(item.name).trim()) {
      throw new Error("buildMbdAp242Package requires item.name (missing item.name).");
    }

    const dims = item.metrics || {};
    const validCalloutsInput = Array.isArray(pmiCallouts) ? pmiCallouts : [];
    let placeholderDefaultCount = 0;

    const semanticPMI = validCalloutsInput.map((c, i) => {
      const placeholderFields = [];
      const hasFeatureRef = Boolean(c?.featureRef && String(c.featureRef).trim());
      const hasType = Boolean(c?.type && String(c.type).trim());
      const hasDatumFrame = Boolean(c?.datumFrame && String(c.datumFrame).trim());
      const hasNominal = Number.isFinite(c?.nominalIn);
      const hasPlusMinus = Number.isFinite(c?.plusMinusIn);

      if (!hasFeatureRef) placeholderFields.push("featureRef");
      if (!hasType) placeholderFields.push("type");
      if (!hasDatumFrame) placeholderFields.push("datumFrame");
      if (!hasNominal) placeholderFields.push("nominalIn");
      if (!hasPlusMinus) placeholderFields.push("plusMinusIn");

      const isPlaceholderDefault = placeholderFields.length > 0;
      if (isPlaceholderDefault) placeholderDefaultCount++;

      return {
        id: `PMI_${i + 1}`,
        featureRef: hasFeatureRef ? String(c.featureRef).trim() : null,
        type: hasType ? String(c.type).trim() : null,
        nominalIn: hasNominal ? c.nominalIn : null,
        plusMinusIn: hasPlusMinus ? c.plusMinusIn : null,
        datumFrame: hasDatumFrame ? String(c.datumFrame).trim() : null,
        isPlaceholderDefault,
        placeholderFields
      };
    });

    const pmiStatus =
      semanticPMI.length === 0
        ? "NO_REAL_PMI_CALLOUTS_SUPPLIED"
        : (placeholderDefaultCount > 0
          ? "PARTIAL_OR_UNVERIFIED_PMI_CALLOUTS"
          : "REAL_PMI_CALLOUTS_SUPPLIED");

    const cleanedActor =
      signoffActor && String(signoffActor).trim() ? String(signoffActor).trim() : null;
    const strictVerified = humanVerified === true && cleanedActor !== null;

    const rawMat3dp = materials3dpReport || item.materials3dpReport || null;
    const sanitizedMat3dp = this._sanitizeMaterials3dpReport(rawMat3dp);

    return {
      schema: "QADS_MBD_JSON_PACKET_V20",
      isRealStepAp242File: false,
      exportFormatNote: "JSON_PACKET_NOT_NATIVE_STEP_AP242",
      certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
      studioVersion: this.version,
      exportedAt: new Date().toISOString(),
      partId: item.id ?? null,
      name: String(item.name).trim(),
      revision,
      industryId: item.industryId || null,
      environmentId: item.environmentId || null,
      techniqueId: item.techniqueId || null,
      selectionStatus: {
        industrySpecified: Boolean(item.industryId),
        environmentSpecified: Boolean(item.environmentId),
        techniqueSpecified: Boolean(item.techniqueId),
        materialSpecified: Boolean(item.materialName),
        unitSystemSpecified: Boolean(item.unitSystem)
      },
      domain: item.domain ?? null,
      stage: item.stage ?? null,
      fabricationTier: item.tierLabel ?? null,
      standard: item.standardLabel ?? null,
      material: item.materialName || null,
      materialStatus: item.materialName ? "SPECIFIED" : "UNSPECIFIED_MATERIAL",
      unitSystem: item.unitSystem || null,
      dimensionsIn: {
        widthIn: Number.isFinite(dims.widthIn) ? dims.widthIn : null,
        heightIn: Number.isFinite(dims.heightIn) ? dims.heightIn : null,
        thicknessIn: Number.isFinite(dims.thicknessIn) ? dims.thicknessIn : null,
        volumeIn3: Number.isFinite(dims.volumeIn3) ? dims.volumeIn3 : null,
        massLb: Number.isFinite(dims.massLb) ? dims.massLb : null,
        estMaterialCostUsd: Number.isFinite(dims.estMaterialCostUsd) ? dims.estMaterialCostUsd : null,
        costIsEstimate: dims.costIsEstimate ?? true
      },
      dimensionsMm: {
        widthMm: Number.isFinite(dims.widthIn) ? Number((dims.widthIn * 25.4).toFixed(3)) : null,
        heightMm: Number.isFinite(dims.heightIn) ? Number((dims.heightIn * 25.4).toFixed(3)) : null,
        thicknessMm: Number.isFinite(dims.thicknessIn) ? Number((dims.thicknessIn * 25.4).toFixed(3)) : null,
        volumeCm3: Number.isFinite(dims.volumeIn3) ? Number((dims.volumeIn3 * 16.387064).toFixed(3)) : null,
        massKg: Number.isFinite(dims.massLb) ? Number((dims.massLb * 0.45359237).toFixed(4)) : null
      },
      materialsAnd3dpInfrastructure: sanitizedMat3dp,
      features: Array.isArray(item.features) ? item.features : [],
      computeFieldSummary: computeField
        ? {
            executionMode: computeField.executionMode || "UNSPECIFIED_EXECUTION_MODE",
            isRealGpuDispatch: computeField.isRealGpuDispatch === true,
            wgslKernelUsed: computeField.wgslKernelUsed === true,
            workgroupSize: computeField.workgroupSize ?? 64,
            workgroupsDispatched: computeField.workgroupsDispatched ?? 0,
            simulatedWorkgroups: computeField.simulatedWorkgroups ?? 0,
            sampleCount: computeField.sampleCount ?? 0,
            minClearanceIn: computeField.minClearanceIn ?? null,
            minFeatureInUsed: computeField.minFeatureInUsed ?? null,
            violations: computeField.violations ?? null,
            clearanceStatus: computeField.clearanceStatus || null,
            holeDiameterStatus: computeField.holeDiameterStatus || null
          }
        : null,
      techniqueMetadata: item.techniqueMetadata || null,
      matchReport: item.matchReport || null,
      drawingSheet: this._sanitizeDrawingSheetSummary(item.drawingSheet),
      drawingSheetStatus: item.drawingSheet
        ? "FIT_TO_VIEW_UNSCALED_SUMMARY_ONLY"
        : "NO_DRAWING_SHEET_ATTACHED",
      pmiStatus,
      pmiPlaceholderSummary: {
        totalCallouts: semanticPMI.length,
        placeholderDefaultCount,
        placeholderDefaultsUsed: placeholderDefaultCount > 0,
        status: pmiStatus
      },
      semanticPMI,
      governance: {
        certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
        zeroTrustPolicy: "NIST SP 800-207 (Framework Reference Only — Not Enforced)",
        aiRmfOversight: "NIST AI RMF (Framework Reference Only — Not Certified)",
        pqcStandard: "NIST IR 8547 (Framework Reference Only — Not Active Crypto)",
        humanOversightRequired: true,
        humanVerified: strictVerified,
        signoffActor: strictVerified ? cleanedActor : null,
        tevvStatus: strictVerified ? "VERIFIED_BY_ENGINEER" : "PENDING_ENGINEERING_REVIEW"
      }
    };
  }
}