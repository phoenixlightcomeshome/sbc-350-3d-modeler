/**
 * Parametric Feature & DFM Validation Engine (v20.0.0)
 *
 * Honesty & Scope Notice:
 * - Bolt circles are restricted strictly to CIRCULAR FLANGES ONLY and explicitly
 *   blocked for cylinder-head bolt patterns (SBC 350 head bolts use a 17-position
 *   torque sequence, never a circle).
 * - Unverified default dimensions (inset 0.4 in., corner dia 0.375 in., bolt circle
 *   N=6 / BCD=3.0 in. / dia=0.3125 in., slot defaults) are explicitly flagged as
 *   UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT whenever omitted by the caller.
 * - Silent input clamping is prohibited; invalid dimensions throw explicit Errors.
 * - Sheet-metal K-factor and bend radius fallbacks are not invented when missing.
 * - Loft/sweep mode is an EXTRUDE-BASED APPROXIMATION ONLY (not a true multi-station loft).
 * - All internal geometry dimensions are strictly in inches.
 */
export class ParametricFeatureEngineV20 {
  isPointInPolygon(pt, polygon) {
    if (!pt || !Array.isArray(polygon) || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect =
        (yi > pt.y) !== (yj > pt.y) &&
        pt.x < ((xj - xi) * (pt.y - yi)) / ((yj - yi) || 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  distancePointToSegment(pt, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-12) return Math.hypot(pt.x - a.x, pt.y - a.y);
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(pt.x - projX, pt.y - projY);
  }

  distancePointToPolygonEdges(pt, polygon) {
    if (!pt || !Array.isArray(polygon) || polygon.length < 3) return 0;
    let minDist = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const next = polygon[(i + 1) % polygon.length];
      const d = this.distancePointToSegment(pt, polygon[i], next);
      if (d < minDist) minDist = d;
    }
    return Number.isFinite(minDist) ? minDist : 0;
  }

  validateFeaturesAgainstContour(points, features = [], minWallIn = 0) {
    if (!Array.isArray(points) || points.length < 3) return [];
    const wallLimit = Number.isFinite(minWallIn) && minWallIn > 0 ? minWallIn : 0;

    return (Array.isArray(features) ? features : []).map((f) => {
      if (f.kind === "oblong_slot") {
        const rad = ((Number(f.angleDeg) || 0) * Math.PI) / 180;
        const halfSpan = Math.max(0, (f.lengthIn - f.widthIn) / 2);
        const radius = f.widthIn / 2;
        const checkPts = [
          { x: f.x, y: f.y },
          { x: f.x + halfSpan * Math.cos(rad), y: f.y + halfSpan * Math.sin(rad) },
          { x: f.x - halfSpan * Math.cos(rad), y: f.y - halfSpan * Math.sin(rad) }
        ];
        const allInside = checkPts.every((p) => this.isPointInPolygon(p, points));
        const minCenterEdge = Math.min(...checkPts.map((p) => this.distancePointToPolygonEdges(p, points)));
        const edgeClearanceIn = Number((minCenterEdge - radius).toFixed(4));
        return {
          id: f.id,
          kind: f.kind,
          insideContour: allInside,
          edgeClearanceIn,
          meetsMinWall: allInside && edgeClearanceIn >= wallLimit
        };
      }

      const pt = { x: f.x, y: f.y };
      const inside = this.isPointInPolygon(pt, points);
      const edgeDist = this.distancePointToPolygonEdges(pt, points);
      const radius = (Number(f.diameterIn) || 0) / 2;
      const edgeClearanceIn = Number((edgeDist - radius).toFixed(4));
      return {
        id: f.id,
        kind: f.kind,
        insideContour: inside,
        edgeClearanceIn,
        meetsMinWall: inside && edgeClearanceIn >= wallLimit
      };
    });
  }

  generateBoltCircleFeatures({
    count,
    boltCircleDiaIn,
    holeDiaIn,
    startAngleDeg = 0,
    centerX = 0,
    centerY = 0,
    applicationMode = "circular_flange",
    purpose = "",
    isHeadBoltPattern = false,
    contourPoints = null
  } = {}) {
    if (
      isHeadBoltPattern === true ||
      /head[_\-\s]*bolt/i.test(String(applicationMode || "")) ||
      /head[_\-\s]*bolt/i.test(String(purpose || ""))
    ) {
      throw new Error(
        "Bolt-circle guard blocked head-bolt pattern: bolt circles are for CIRCULAR FLANGES ONLY, NEVER head-bolt positions (SBC 350 head bolts use the 17-position torque sequence)."
      );
    }

    const usedUnverifiedDefault =
      count === undefined || boltCircleDiaIn === undefined || holeDiaIn === undefined;

    const resolvedCount = count === undefined ? 6 : Number(count);
    const resolvedBcd = boltCircleDiaIn === undefined ? 3.0 : Number(boltCircleDiaIn);
    const resolvedDia = holeDiaIn === undefined ? 0.3125 : Number(holeDiaIn);
    const resolvedStart = Number(startAngleDeg);
    const resolvedCx = Number(centerX);
    const resolvedCy = Number(centerY);

    if (!Number.isInteger(resolvedCount) || resolvedCount < 1 || resolvedCount > 64) {
      throw new Error(`Invalid bolt-circle count "${count}": must be an integer between 1 and 64.`);
    }
    if (!Number.isFinite(resolvedBcd) || resolvedBcd < 0.1) {
      throw new Error(`Invalid boltCircleDiaIn "${boltCircleDiaIn}": must be a finite number >= 0.1 in.`);
    }
    if (!Number.isFinite(resolvedDia) || resolvedDia < 0.02) {
      throw new Error(`Invalid holeDiaIn "${holeDiaIn}": must be a finite number >= 0.02 in.`);
    }
    if (!Number.isFinite(resolvedStart) || !Number.isFinite(resolvedCx) || !Number.isFinite(resolvedCy)) {
      throw new Error("Invalid bolt-circle center or startAngleDeg: must be finite numbers.");
    }

    const r = resolvedBcd / 2;
    const baseRad = (resolvedStart * Math.PI) / 180;
    const defaultStatus = usedUnverifiedDefault
      ? "UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT"
      : "USER_SUPPLIED_CIRCULAR_FLANGE";

    const features = [];
    for (let i = 0; i < resolvedCount; i++) {
      const theta = baseRad + (i / resolvedCount) * Math.PI * 2;
      const x = Number((resolvedCx + r * Math.cos(theta)).toFixed(4));
      const y = Number((resolvedCy + r * Math.sin(theta)).toFixed(4));

      let insideContour = null;
      let edgeClearanceIn = null;
      if (Array.isArray(contourPoints) && contourPoints.length >= 3) {
        insideContour = this.isPointInPolygon({ x, y }, contourPoints);
        edgeClearanceIn = Number(
          (this.distancePointToPolygonEdges({ x, y }, contourPoints) - resolvedDia / 2).toFixed(4)
        );
      }

      features.push({
        id: `BC_HOLE_${i + 1}`,
        kind: "bolt_circle_hole",
        x,
        y,
        diameterIn: Number(resolvedDia.toFixed(4)),
        flangeOnlyGuard: "CIRCULAR_FLANGES_ONLY_NEVER_HEAD_BOLT_POSITIONS",
        defaultStatus,
        unverifiedDefaultUsed: usedUnverifiedDefault,
        insideContour,
        edgeClearanceIn
      });
    }
    return features;
  }

  generateCornerPatternFeatures(points, insetIn, holeDiaIn) {
    const usedUnverifiedDefault = insetIn === undefined || holeDiaIn === undefined;
    const resolvedInset = insetIn === undefined ? 0.4 : Number(insetIn);
    const resolvedDia = holeDiaIn === undefined ? 0.375 : Number(holeDiaIn);

    if (!Number.isFinite(resolvedInset) || resolvedInset <= 0) {
      throw new Error(`Invalid corner insetIn "${insetIn}": must be finite and > 0 in.`);
    }
    if (!Number.isFinite(resolvedDia) || resolvedDia < 0.02) {
      throw new Error(`Invalid corner holeDiaIn "${holeDiaIn}": must be finite and >= 0.02 in.`);
    }
    if (!Array.isArray(points) || points.length < 3) return [];

    const minX = Math.min(...points.map((p) => p.x)) + resolvedInset;
    const maxX = Math.max(...points.map((p) => p.x)) - resolvedInset;
    const minY = Math.min(...points.map((p) => p.y)) + resolvedInset;
    const maxY = Math.max(...points.map((p) => p.y)) - resolvedInset;
    if (!(maxX > minX && maxY > minY)) return [];

    const coords = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];

    const defaultStatus = usedUnverifiedDefault
      ? "UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT"
      : "USER_SUPPLIED_CORNER_PATTERN";

    return coords.map((c, idx) => {
      const pt = { x: Number(c.x.toFixed(4)), y: Number(c.y.toFixed(4)) };
      const insideContour = this.isPointInPolygon(pt, points);
      const edgeDist = this.distancePointToPolygonEdges(pt, points);
      const edgeClearanceIn = Number((edgeDist - resolvedDia / 2).toFixed(4));
      return {
        id: `CORNER_HOLE_${idx + 1}`,
        kind: "corner_hole",
        x: pt.x,
        y: pt.y,
        diameterIn: Number(resolvedDia.toFixed(4)),
        insetIn: Number(resolvedInset.toFixed(4)),
        insideContour,
        edgeClearanceIn,
        defaultStatus,
        unverifiedDefaultUsed: usedUnverifiedDefault
      };
    });
  }

  createSlotFeature({
    id = "SLOT_1",
    x = 0,
    y = 0,
    lengthIn,
    widthIn,
    angleDeg = 0
  } = {}) {
    const usedUnverifiedDefault = lengthIn === undefined || widthIn === undefined;
    const resolvedX = Number(x);
    const resolvedY = Number(y);
    const resolvedWidth = widthIn === undefined ? 0.375 : Number(widthIn);
    const resolvedLength = lengthIn === undefined ? 1.2 : Number(lengthIn);
    const resolvedAngle = Number(angleDeg);

    if (!Number.isFinite(resolvedX) || !Number.isFinite(resolvedY) || !Number.isFinite(resolvedAngle)) {
      throw new Error(`Invalid slot coordinates or angleDeg for "${id}".`);
    }
    if (!Number.isFinite(resolvedWidth) || resolvedWidth < 0.03) {
      throw new Error(`Invalid slot widthIn "${widthIn}" on "${id}": must be finite >= 0.03 in.`);
    }
    if (!Number.isFinite(resolvedLength) || resolvedLength < 0.03) {
      throw new Error(`Invalid slot lengthIn "${lengthIn}" on "${id}": must be finite >= 0.03 in.`);
    }
    if (resolvedLength < resolvedWidth) {
      throw new Error(
        `Invalid slot feature "${id}": lengthIn (${resolvedLength}) must be >= widthIn (${resolvedWidth}).`
      );
    }

    return {
      id,
      kind: "oblong_slot",
      x: Number(resolvedX.toFixed(4)),
      y: Number(resolvedY.toFixed(4)),
      lengthIn: Number(resolvedLength.toFixed(4)),
      widthIn: Number(resolvedWidth.toFixed(4)),
      angleDeg: Number(resolvedAngle.toFixed(2)),
      defaultStatus: usedUnverifiedDefault
        ? "UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT"
        : "USER_SUPPLIED_SLOT",
      unverifiedDefaultUsed: usedUnverifiedDefault
    };
  }

  evaluateDfm({
    cadEngine,
    points,
    thicknessIn,
    tierSpec,
    techniqueId = "parametric_2d_extrude",
    materialSpec = {},
    features = []
  } = {}) {
    if (!cadEngine || typeof cadEngine.analyzeContourGeometry !== "function") {
      throw new Error("evaluateDfm requires a valid cadEngine with analyzeContourGeometry().");
    }
    if (!Number.isFinite(thicknessIn) || thicknessIn <= 0) {
      throw new Error(`evaluateDfm requires finite positive thicknessIn (received ${thicknessIn}).`);
    }
    if (!tierSpec || typeof tierSpec !== "object" || !Number.isFinite(tierSpec.minWallIn) || tierSpec.minWallIn <= 0) {
      throw new Error("evaluateDfm requires a valid tierSpec with finite positive minWallIn.");
    }

    const warnings = [];
    const notes = [];
    if (!Array.isArray(points) || points.length < 3) {
      warnings.push("Closed profile requires at least 3 distinct vertices.");
      return { valid: false, warnings, notes };
    }

    const stats = cadEngine.analyzeContourGeometry(points);
    if (thicknessIn < tierSpec.minWallIn) {
      warnings.push(
        `Thickness (${thicknessIn.toFixed(3)} in.) is below ${tierSpec.label || tierSpec.id} minimum wall (${tierSpec.minWallIn.toFixed(3)} in.).`
      );
    }
    if (stats.minEdgeIn < tierSpec.minWallIn) {
      warnings.push(
        `Shortest edge (${stats.minEdgeIn.toFixed(3)} in.) is below tier limit (${tierSpec.minWallIn.toFixed(3)} in.).`
      );
    }

    const hasK = Number.isFinite(materialSpec?.kFactor) && materialSpec.kFactor > 0 && materialSpec.kFactor <= 1;
    const hasR = Number.isFinite(materialSpec?.minBendRadiusIn) && materialSpec.minBendRadiusIn > 0;
    const kFactor = hasK ? materialSpec.kFactor : null;
    const minBendRadiusIn = hasR ? materialSpec.minBendRadiusIn : null;
    const bendParamsStatus =
      materialSpec?.bendParamsStatus ||
      (hasK && hasR
        ? "UNVERIFIED_ESTIMATE_NEEDING_TOOLING_TEST"
        : "MISSING_K_FACTOR_OR_MIN_BEND_RADIUS_NO_INVENTED_FALLBACK");

    const bendAllowanceIn =
      hasK && hasR
        ? Number((Math.PI * (minBendRadiusIn + kFactor * thicknessIn) * (90 / 180)).toFixed(4))
        : null;

    const loftIsApproximation = techniqueId === "loft_sweep_surface";
    let reverseEngFitStatus = null;

    if (techniqueId === "sheet_metal_bend") {
      if (!hasK || !hasR) {
        warnings.push(
          "Sheet metal bend parameters missing (kFactor or minBendRadiusIn): cannot compute bend allowance without invented fallback."
        );
      } else {
        if (thicknessIn < minBendRadiusIn && minBendRadiusIn > 0.05) {
          warnings.push(
            `Sheet metal thickness (${thicknessIn.toFixed(3)} in.) is tight for ${materialSpec.category || "alloy"} min bend radius (${minBendRadiusIn.toFixed(3)} in.).`
          );
        }
        notes.push(
          `[Estimate — ${bendParamsStatus}] K-factor=${kFactor}, minBendRadius=${minBendRadiusIn} in., est. 90 deg bend allowance=${bendAllowanceIn} in.`
        );
      }
    } else if (techniqueId === "additive_dfam_shell") {
      const aspect = stats.minEdgeIn > 0 ? Number((thicknessIn / stats.minEdgeIn).toFixed(2)) : 0;
      if (aspect > (tierSpec.maxAspectRatio || 15)) {
        warnings.push(`High overhang/aspect ratio (${aspect}) exceeds tier advisory limit.`);
      }
      notes.push("DfAM check: verify self-supporting overhangs (<45 deg from vertical) and escape holes.");
    } else if (techniqueId === "loft_sweep_surface") {
      notes.push(
        "EXTRUDE-BASED APPROXIMATION ONLY (not a true multi-station loft); verify station continuity, loft fidelity, and curvature externally before toolpath generation."
      );
    } else if (techniqueId === "reverse_eng_fit") {
      reverseEngFitStatus = "CONTOUR_CLEANED_ZERO_BEVEL_EXTRUDE_ONLY_NOT_3D_SCAN_FIT";
      notes.push(
        "reverse_eng_fit: geometry uses contour-cleaned zero-bevel extrude approximation (not 3D surface scan fitting); confirm 2-click calibration scale before cutting."
      );
    }

    const featureClearanceReport = this.validateFeaturesAgainstContour(points, features, tierSpec.minWallIn);
    for (const fc of featureClearanceReport) {
      if (!fc.insideContour) {
        warnings.push(`Feature ${fc.id} falls outside the closed contour outline.`);
      } else if (fc.edgeClearanceIn < tierSpec.minWallIn) {
        warnings.push(
          `Feature ${fc.id} edge clearance (${fc.edgeClearanceIn.toFixed(3)} in.) is below tier minWall (${tierSpec.minWallIn.toFixed(3)} in.).`
        );
      }
    }

    const minHoleDiaIn = Number.isFinite(tierSpec.minHoleDiaIn) && tierSpec.minHoleDiaIn > 0
      ? tierSpec.minHoleDiaIn
      : null;
    if (minHoleDiaIn === null && features.length > 0) {
      notes.push("tierSpec.minHoleDiaIn not defined — skipped separate minHoleDiaIn check without borrowing minWallIn.");
    }

    for (const f of features) {
      if (f.unverifiedDefaultUsed) {
        notes.push(`Feature ${f.id} uses unverified default dimensions (${f.defaultStatus}).`);
      }
      const minSpan = f.kind === "oblong_slot" ? f.widthIn : f.diameterIn;
      if (!Number.isFinite(minSpan) || minSpan <= 0) continue;

      if (minHoleDiaIn !== null && minSpan < minHoleDiaIn) {
        warnings.push(
          `Feature ${f.id} (${minSpan.toFixed(3)} in.) is below tier minHoleDiaIn (${minHoleDiaIn.toFixed(3)} in.).`
        );
      }
      if (minSpan < thicknessIn) {
        warnings.push(
          `[Rule-of-Thumb 1:1] Feature ${f.id} (${minSpan.toFixed(3)} in.) is narrower than plate thickness (${thicknessIn.toFixed(3)} in.) across tier ${tierSpec.id || "active"}.`
        );
      }
      const depthRatio = thicknessIn / minSpan;
      if (depthRatio > 4) {
        warnings.push(
          `[Rule-of-Thumb >4:1] Feature ${f.id} depth-to-diameter ratio (${depthRatio.toFixed(2)}:1) exceeds 4:1 drilling rule-of-thumb.`
        );
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
      notes,
      stats,
      featureClearanceReport,
      techniqueMetadata: {
        techniqueId,
        loftIsApproximation,
        reverseEngFitStatus,
        kFactor,
        minBendRadiusIn,
        bendAllowance90DegIn: bendAllowanceIn,
        bendParamsStatus,
        featureCount: features.length
      }
    };
  }
}