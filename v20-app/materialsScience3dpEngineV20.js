/**
 * Materials Science & 3D Printing Infrastructure Estimator (v20.0.0)
 *
 * Honesty & Scope Notice:
 * - Standards referenced (ISO/ASTM 52900, 52907, 52920, AS9100D, AS9102) are
 *   NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY.
 * - Warp-risk index, HIP density adjustments, layer-count build hours, and
 *   checklist readiness scores are UNVERIFIED HEURISTIC ESTIMATES / rule-of-thumb
 *   indicators unless backed by verified aerospace-matrix test data.
 * - Internal linear dimensions (thicknessIn, widthIn, heightIn) are strictly inches.
 */
export class MaterialsScience3dpEngineV20 {
  constructor(catalog = {}) {
    this.processFamilies = catalog.additiveProcessFamilies || {};
    this.infrastructurePillars = catalog.infrastructurePillars || {};
    this.aerospaceMatrixMaterials = catalog.aerospaceMatrixMaterials || {};
  }

  registerAerospaceMatrixMaterials(materialsMap = {}) {
    if (materialsMap && typeof materialsMap === "object") {
      this.aerospaceMatrixMaterials = { ...this.aerospaceMatrixMaterials, ...materialsMap };
    }
  }

  evaluateMaterialAnd3dpInfrastructure({
    materialName,
    materialSpec,
    processId,
    thicknessIn,
    widthIn,
    heightIn,
    layerThicknessMm = 0.05,
    hasHipOrAnneal = true,
    hasInSituTelemetry = true,
    hasCmmOrCtInspection = true
  } = {}) {
    if (!materialName || typeof materialName !== "string") {
      throw new Error("MaterialsScience3dpEngineV20 requires a valid materialName.");
    }
    const resolvedSpec =
      (materialSpec && typeof materialSpec === "object" && Object.keys(materialSpec).length > 0
        ? materialSpec
        : this.aerospaceMatrixMaterials[materialName]) || null;

    if (!resolvedSpec || typeof resolvedSpec !== "object") {
      throw new Error(`Missing materialSpec for "${materialName}" — cannot invent material properties.`);
    }
    if (!processId || typeof processId !== "string" || !this.processFamilies[processId]) {
      const known = Object.keys(this.processFamilies).join(", ");
      throw new Error(
        `Unknown 3DP processId "${processId}". Refusing to invent fallback process data. Known IDs: [${known}]`
      );
    }

    if (!Number.isFinite(thicknessIn) || thicknessIn <= 0) {
      throw new Error(
        `MaterialsScience3dpEngineV20 requires finite positive thicknessIn (received ${thicknessIn}).`
      );
    }
    if (!Number.isFinite(widthIn) || widthIn <= 0 || !Number.isFinite(heightIn) || heightIn <= 0) {
      throw new Error(
        `MaterialsScience3dpEngineV20 requires explicit finite positive widthIn and heightIn (no invented 4.4 x 2.6 defaults; received ${widthIn} x ${heightIn}).`
      );
    }
    if (!Number.isFinite(layerThicknessMm) || layerThicknessMm <= 0) {
      throw new Error(
        `MaterialsScience3dpEngineV20 requires finite positive layerThicknessMm (received ${layerThicknessMm}).`
      );
    }

    const proc = this.processFamilies[processId];
    const matrixOverride = this.aerospaceMatrixMaterials[materialName] || null;
    const effectiveSpec = matrixOverride ? { ...resolvedSpec, ...matrixOverride } : resolvedSpec;
    const hasAerospaceVerifiedMatrix = effectiveSpec.aerospaceMatrixVerified === true;

    // Never invent kThermal=50 or shrinkagePct=1.5 when omitted
    const hasThermal = Number.isFinite(effectiveSpec.thermalConductivityWmk) && effectiveSpec.thermalConductivityWmk > 0;
    const hasShrinkage = Number.isFinite(effectiveSpec.shrinkagePct) && effectiveSpec.shrinkagePct >= 0;
    const kThermal = hasThermal ? effectiveSpec.thermalConductivityWmk : null;
    const shrinkagePct = hasShrinkage ? effectiveSpec.shrinkagePct : null;

    const thermalParamsStatus =
      effectiveSpec.thermalParamsStatus ||
      (hasThermal && hasShrinkage
        ? (hasAerospaceVerifiedMatrix ? "AEROSPACE_MATRIX_VERIFIED" : "UNVERIFIED_ESTIMATE_NO_SOURCE_CITED")
        : "MISSING_THERMAL_OR_SHRINKAGE_DATA_NO_INVENTED_FALLBACK");

    const bendParamsStatus =
      effectiveSpec.bendParamsStatus || "UNVERIFIED_ESTIMATE_NEEDING_TOOLING_TEST";

    const maxSpanIn = Math.max(widthIn, heightIn);
    const spanToThicknessRatio = Number((maxSpanIn / Math.max(thicknessIn, 0.05)).toFixed(3));

    // Heuristic rule-of-thumb warp risk index (only computed when thermal & shrinkage values exist on spec)
    let thermalConductivityBandFactor = null;
    let warpRiskIndex = null;
    let warpRiskStatus = "UNAVAILABLE_MISSING_THERMAL_OR_SHRINKAGE_DATA";

    if (hasThermal && hasShrinkage) {
      thermalConductivityBandFactor = kThermal < 20 ? 1.35 : kThermal < 100 ? 1.1 : 0.85;
      warpRiskIndex = Number(
        (spanToThicknessRatio * (shrinkagePct / 1.5) * thermalConductivityBandFactor * 0.12).toFixed(2)
      );
      warpRiskStatus = hasAerospaceVerifiedMatrix
        ? "COMPUTED_WITH_VERIFIED_MATERIAL_DATA_HEURISTIC_INDEX"
        : "ESTIMATE_FROM_UNVERIFIED_THERMAL_PARAMS_AND_HEURISTIC_COEFFICIENTS";
    }

    // Never invent typicalDensityPct=99.2 when omitted on process
    const hasProcDensity = Number.isFinite(proc.typicalDensityPct);
    const hipDeltaPct = hasHipOrAnneal ? 0.35 : -0.4;
    const effectiveDensityPct = hasProcDensity
      ? Number(Math.min(99.98, proc.typicalDensityPct + hipDeltaPct).toFixed(2))
      : null;

    // Layer-count-only build time heuristic (ignores XY area, volume, scan vectors, recoater overhead)
    const clampedLayerMm = Math.max(layerThicknessMm, 0.02);
    const estimatedLayerCount = Math.ceil((thicknessIn * 25.4) / clampedLayerMm);
    const estimatedBuildHours = Number((estimatedLayerCount * 0.018 + 0.6).toFixed(2));

    const advisories = [];
    if (!hasAerospaceVerifiedMatrix) {
      advisories.push(
        `[Estimate Notice] Material thermal/shrinkage status="${thermalParamsStatus}" & bend status="${bendParamsStatus}" (not verified against published aerospace-matrix test coupons).`
      );
    }
    if (!hasThermal || !hasShrinkage) {
      advisories.push(
        `Thermal conductivity or shrinkage missing on "${materialName}": warpRiskIndex omitted (no invented fallback applied).`
      );
    } else if (warpRiskIndex > 3.5 && !hasHipOrAnneal) {
      advisories.push(
        `[Rule-of-Thumb Advisory] Heuristic warpRiskIndex (${warpRiskIndex} > 3.5 rule-of-thumb) without stress-relief/HIP on ${materialName}.`
      );
    }

    if (Number.isFinite(proc.anisotropyRatioXYtoZ) && proc.anisotropyRatioXYtoZ < 0.82) {
      advisories.push(
        `[Rule-of-Thumb Advisory] Estimated Z-axis anisotropy (${proc.anisotropyRatioXYtoZ} XY/Z < 0.82 rule-of-thumb on ${proc.isoAstMCode}): orient primary load path in XY plane.`
      );
    }
    if (Array.isArray(proc.layerThicknessRangeMm) && proc.layerThicknessRangeMm.length === 2) {
      const [minL, maxL] = proc.layerThicknessRangeMm;
      if (layerThicknessMm < minL || layerThicknessMm > maxL) {
        advisories.push(
          `[Estimate Advisory] Layer thickness ${layerThicknessMm.toFixed(3)} mm is outside estimated ${proc.isoAstMCode} range [${minL}-${maxL} mm].`
        );
      }
    }
    if (!hasInSituTelemetry || !hasCmmOrCtInspection) {
      advisories.push(
        "[Framework Reference — ISO/ASTM 52920] Both in-situ telemetry and CMM/CT inspection checkboxes are recommended for production review."
      );
    }
    advisories.push(
      `[Estimate Scope] Build-time (${estimatedBuildHours}h) counts Z-layers only (${estimatedLayerCount} layers); ignores part area, volume, and machine geometry.`
    );

    const enabledChecklistCount =
      (hasHipOrAnneal ? 1 : 0) + (hasInSituTelemetry ? 1 : 0) + (hasCmmOrCtInspection ? 1 : 0);

    // Heuristic checklist score preserved under infraReadinessScorePct for UI compatibility, explicitly flagged as non-certified estimate
    const warpPenalty = warpRiskIndex !== null && warpRiskIndex > 4 ? 5 : 0;
    const heuristicReadinessScorePct = Math.max(
      45,
      Math.min(
        100,
        Number(
          (
            72 +
            (hasHipOrAnneal ? 10 : -8) +
            (hasInSituTelemetry ? 9 : -6) +
            (hasCmmOrCtInspection ? 9 : -6) -
            warpPenalty
          ).toFixed(1)
        )
      )
    );

    return {
      certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
      isAerospaceMatrixVerified: hasAerospaceVerifiedMatrix,
      aerospaceMatrixSource: effectiveSpec.aerospaceMatrixSource || null,
      processId: proc.id,
      isoAstMCode: proc.isoAstMCode,
      processLabel: proc.label,
      materialName,
      materialCategory: effectiveSpec.category || "Unspecified Category",
      materialStatusFlags: {
        densityVerified: Boolean(effectiveSpec.densityVerified),
        costPerLbUsd: effectiveSpec.costPerLbUsd ?? null,
        costIsEstimate: effectiveSpec.costIsEstimate ?? true,
        thermalParamsStatus,
        bendParamsStatus
      },
      processStatusFlags: {
        dataStatus: proc.dataStatus || "UNVERIFIED_ESTIMATE_NO_SOURCE_CITED",
        anisotropyIsEstimate: proc.anisotropyIsEstimate ?? true,
        densityIsEstimate: proc.densityIsEstimate ?? true,
        layerRangeIsEstimate: proc.layerRangeIsEstimate ?? true
      },
      thermalConductivityWmk: kThermal,
      shrinkagePct,
      spanToThicknessRatio,
      anisotropyRatioXYtoZ: proc.anisotropyRatioXYtoZ ?? null,
      effectiveDensityPct,
      effectiveDensityIsEstimate: true,
      effectiveDensityNote:
        "Heuristic HIP adjustment (+0.35% / -0.40% rule-of-thumb) applied to estimated process typicalDensityPct.",
      layerThicknessMm: Number(layerThicknessMm.toFixed(3)),
      estimatedLayerCount,
      estimatedBuildHours,
      estimatedBuildHoursIsEstimate: true,
      estimatedBuildHoursScope:
        "LAYER_COUNT_ONLY_ESTIMATE_IGNORES_AREA_AND_VOLUME_NOT_REAL_BUILD_TIME_MODEL",
      warpRiskIndex,
      warpRiskIndexIsEstimate: true,
      warpRiskStatus,
      warpRiskFormulaNote:
        "Heuristic rule-of-thumb formula (0.12 scaling, kThermal band factors 1.35/1.1/0.85), not a published thermal distortion equation.",
      infraReadinessScorePct: heuristicReadinessScorePct,
      infraReadinessScoreIsEstimate: true,
      infraReadinessScoreStatus:
        "HEURISTIC_CHECKLIST_ESTIMATE_NOT_CERTIFICATION_OR_QUALIFICATION",
      infraReadinessChecklistEnabledCount: enabledChecklistCount,
      infraReadinessChecklistTotalCount: 3,
      ruleOfThumbThresholds: {
        warpAdvisoryThreshold: 3.5,
        warpPenaltyThreshold: 4.0,
        anisotropyAdvisoryThreshold: 0.82,
        status: "UNVERIFIED_RULE_OF_THUMB_THRESHOLDS"
      },
      postProcessingChain: proc.postProcessing || [],
      infrastructureGates: {
        certificationStatus: "NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY",
        feedstockTraceability: "FRAMEWORK_REFERENCE_ONLY_ISO_ASTM_52907_NOT_VERIFIED_BY_APP",
        inSituMonitoring: hasInSituTelemetry
          ? "TELEMETRY_CHECKBOX_ENABLED_FRAMEWORK_REF_ONLY"
          : "TELEMETRY_NOT_ENABLED",
        thermalPostProcess: hasHipOrAnneal
          ? "STRESS_RELIEF_HIP_CHECKBOX_ENABLED"
          : "AS_BUILT_ONLY",
        metrologyQualification: hasCmmOrCtInspection
          ? "CMM_CT_ENABLED_NOT_VERIFIED"
          : "METROLOGY_NOT_ENABLED"
      },
      advisories
    };
  }
}