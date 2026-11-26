/**
 * Parametric Feature & Multi-Technique DFM Engine (v19.0.0 — Quantum Aerospace Design Studio)
 * - Generates circular-flange bolt patterns (STRICTLY NOT SBC head-bolt positions), corner patterns,
 *   and oblong slots with explicit validation (throws on invalid input — never silently clamps).
 * - Checks contour containment, edge wall clearance, feature-to-feature spacing, distinct minHoleDiaIn,
 *   machining L/D rules of thumb across ALL tiers, bend-parameter estimate flags, and honest technique status.
 * - Internal units: strictly inches.
 */
export class ParametricFeatureEngineV19 {
  static FLANGE_ONLY_GUARD_MSG =
    "CIRCULAR FLANGES ONLY — NEVER use bolt-circle generators for SBC 350 head-bolt positions (use the 17-position head-bolt torque sequence).";

  _assertFiniteNumber(val, name) {
    if (typeof val !== "number" || !Number.isFinite(val)) {
      throw new Error(`Invalid ${name}=${val}; expected a finite number (inches).`);
    }
  }

  isPointInPolygon(px, py, points) {
    if (!Array.isArray(points) || points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect =
        (yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  distancePointToPolygonEdges(px, py, points) {
    if (!Array.isArray(points) || points.length < 2) return 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const lenSq = abx * abx + aby * aby;
      let t = 0;
      if (lenSq > 1e-12) {
        t = Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / lenSq));
      }
      const projX = a.x + t * abx;
      const projY = a.y + t * aby;
      const dist = Math.hypot(px - projX, py - projY);
      if (dist < minDist) minDist = dist;
    }
    return minDist === Infinity ? 0 : minDist;
  }

  validateFeatureAgainstContour(points, feature, minWallIn = null) {
    if (!Array.isArray(points) || points.length < 3) {
      return { insideContour: false, edgeClearanceIn: 0, clearanceValid: false, reason: "Contour < 3 points" };
    }

    let samplePoints = [{ x: feature.x, y: feature.y }];
    let radiusIn = (feature.diameterIn || 0) / 2;

    if (feature.kind === "oblong_slot") {
      radiusIn = (feature.widthIn || 0) / 2;
      const halfSpan = Math.max(0, ((feature.lengthIn || 0) - (feature.widthIn || 0)) / 2);
      const rad = ((feature.angleDeg || 0) * Math.PI) / 180;
      const dx = halfSpan * Math.cos(rad);
      const dy = halfSpan * Math.sin(rad);
      samplePoints = [
        { x: feature.x, y: feature.y },
        { x: feature.x + dx, y: feature.y + dy },
        { x: feature.x - dx, y: feature.y - dy }
      ];
    }

    let allInside = true;
    let minEdgeDist = Infinity;
    for (const sp of samplePoints) {
      if (!this.isPointInPolygon(sp.x, sp.y, points)) allInside = false;
      const d = this.distancePointToPolygonEdges(sp.x, sp.y, points);
      if (d < minEdgeDist) minEdgeDist = d;
    }

    const edgeClearanceIn = Number((allInside ? minEdgeDist - radiusIn : -minEdgeDist - radiusIn).toFixed(4));
    const minReq = Number.isFinite(minWallIn) && minWallIn > 0 ? minWallIn : 0;
    const clearanceValid = allInside && edgeClearanceIn >= minReq;

    return {
      insideContour: allInside,
      edgeClearanceIn,
      clearanceValid,
      reason: !allInside
        ? "Center/axis falls outside outer contour"
        : edgeClearanceIn < minReq
          ? `Edge clearance ${edgeClearanceIn.toFixed(4)} in. < minWall ${minReq.toFixed(4)} in.`
          : "OK"
    };
  }

  generateBoltCircleFeatures({
    count,
    boltCircleDiaIn,
    holeDiaIn,
    startAngleDeg,
    centerX,
    centerY,
    purpose = "circular_flange",
    outerLoop = null,
    minWallIn = null
  } = {}) {
    if (/head.?bolt|sbc.?350.?head|cylinder.?head/i.test(String(purpose))) {
      throw new Error(ParametricFeatureEngineV19.FLANGE_ONLY_GUARD_MSG);
    }

    const defaultsUsed = [];
    const nRaw = count === undefined ? (defaultsUsed.push("count=6"), 6) : Number(count);
    const bcdRaw = boltCircleDiaIn === undefined ? (defaultsUsed.push("boltCircleDiaIn=3.0"), 3.0) : Number(boltCircleDiaIn);
    const diaRaw = holeDiaIn === undefined ? (defaultsUsed.push("holeDiaIn=0.3125"), 0.3125) : Number(holeDiaIn);
    const angRaw = startAngleDeg === undefined ? 0 : Number(startAngleDeg);
    const cxRaw = centerX === undefined ? 0 : Number(centerX);
    const cyRaw = centerY === undefined ? 0 : Number(centerY);

    if (!Number.isInteger(nRaw) || nRaw < 1 || nRaw > 64) {
      throw new Error(`Invalid bolt circle count=${count}; must be an integer between 1 and 64.`);
    }
    this._assertFiniteNumber(bcdRaw, "boltCircleDiaIn");
    if (bcdRaw < 0.1) {
      throw new Error(`Invalid boltCircleDiaIn=${boltCircleDiaIn}; must be >= 0.100 in.`);
    }
    this._assertFiniteNumber(diaRaw, "holeDiaIn");
    if (diaRaw < 0.02) {
      throw new Error(`Invalid holeDiaIn=${holeDiaIn}; must be >= 0.020 in.`);
    }
    this._assertFiniteNumber(angRaw, "startAngleDeg");
    this._assertFiniteNumber(cxRaw, "centerX");
    this._assertFiniteNumber(cyRaw, "centerY");

    const r = bcdRaw / 2;
    const baseRad = (angRaw * Math.PI) / 180;
    const measurementStatus = defaultsUsed.length > 0
      ? "UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT"
      : "USER_PROVIDED_VERIFY_PHYSICAL_FLANGE";

    const features = [];
    for (let i = 0; i < nRaw; i++) {
      const theta = baseRad + (i / nRaw) * Math.PI * 2;
      const feat = {
        id: `BC_HOLE_${i + 1}`,
        kind: "bolt_circle_hole",
        x: Number((cxRaw + r * Math.cos(theta)).toFixed(4)),
        y: Number((cyRaw + r * Math.sin(theta)).toFixed(4)),
        diameterIn: Number(diaRaw.toFixed(4)),
        flangeOnlyGuard: ParametricFeatureEngineV19.FLANGE_ONLY_GUARD_MSG,
        defaultsUsed,
        measurementStatus,
        verified: false
      };
      if (Array.isArray(outerLoop) && outerLoop.length >= 3) {
        feat.clearanceCheck = this.validateFeatureAgainstContour(outerLoop, feat, minWallIn);
      }
      features.push(feat);
    }
    return features;
  }

  generateCornerPatternFeatures(points, insetIn, holeDiaIn, minWallIn = null) {
    if (!Array.isArray(points) || points.length < 3) {
      throw new Error("generateCornerPatternFeatures requires points array with at least 3 vertices.");
    }

    const defaultsUsed = [];
    const inset = insetIn === undefined ? (defaultsUsed.push("insetIn=0.4"), 0.4) : Number(insetIn);
    const dia = holeDiaIn === undefined ? (defaultsUsed.push("holeDiaIn=0.375"), 0.375) : Number(holeDiaIn);

    this._assertFiniteNumber(inset, "insetIn");
    if (inset <= 0) {
      throw new Error(`Invalid corner insetIn=${insetIn}; must be > 0 in.`);
    }
    this._assertFiniteNumber(dia, "holeDiaIn");
    if (dia < 0.02) {
      throw new Error(`Invalid corner holeDiaIn=${holeDiaIn}; must be >= 0.020 in.`);
    }

    const minX = Math.min(...points.map((p) => p.x)) + inset;
    const maxX = Math.max(...points.map((p) => p.x)) - inset;
    const minY = Math.min(...points.map((p) => p.y)) + inset;
    const maxY = Math.max(...points.map((p) => p.y)) - inset;
    if (!(maxX > minX && maxY > minY)) {
      throw new Error(
        `Corner hole insetIn=${inset} in. leaves no valid interior bounding box (minX=${minX.toFixed(3)}, maxX=${maxX.toFixed(3)}).`
      );
    }

    const measurementStatus = defaultsUsed.length > 0
      ? "UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT"
      : "USER_PROVIDED_VERIFY_PHYSICAL_PART";

    const coords = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];

    return coords.map((c, idx) => {
      const feat = {
        id: `CORNER_HOLE_${idx + 1}`,
        kind: "corner_hole",
        x: Number(c.x.toFixed(4)),
        y: Number(c.y.toFixed(4)),
        diameterIn: Number(dia.toFixed(4)),
        defaultsUsed,
        measurementStatus,
        verified: false
      };
      feat.clearanceCheck = this.validateFeatureAgainstContour(points, feat, minWallIn);
      return feat;
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
    const defaultsUsed = [];
    const lenRaw = lengthIn === undefined ? (defaultsUsed.push("lengthIn=1.2"), 1.2) : Number(lengthIn);
    const widRaw = widthIn === undefined ? (defaultsUsed.push("widthIn=0.375"), 0.375) : Number(widthIn);
    const xRaw = Number(x);
    const yRaw = Number(y);
    const angRaw = Number(angleDeg);

    this._assertFiniteNumber(xRaw, "slot.x");
    this._assertFiniteNumber(yRaw, "slot.y");
    this._assertFiniteNumber(lenRaw, "slot.lengthIn");
    this._assertFiniteNumber(widRaw, "slot.widthIn");
    this._assertFiniteNumber(angRaw, "slot.angleDeg");

    if (widRaw < 0.02) {
      throw new Error(`Invalid slot "${id}" widthIn=${widthIn}; must be >= 0.020 in.`);
    }
    if (lenRaw < widRaw) {
      throw new Error(
        `Invalid oblong slot "${id}": lengthIn (${lenRaw} in.) must be >= widthIn (${widRaw} in.).`
      );
    }

    return {
      id,
      kind: "oblong_slot",
      x: Number(xRaw.toFixed(4)),
      y: Number(yRaw.toFixed(4)),
      lengthIn: Number(lenRaw.toFixed(4)),
      widthIn: Number(widRaw.toFixed(4)),
      angleDeg: Number(angRaw.toFixed(2)),
      defaultsUsed,
      measurementStatus: defaultsUsed.length > 0
        ? "UNVERIFIED_DEFAULT_NEEDING_RAYS_MEASUREMENT"
        : "USER_PROVIDED_VERIFY_PHYSICAL_PART",
      verified: false
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
  }) {
    if (!cadEngine || typeof cadEngine.analyzeContourGeometry !== "function") {
      throw new Error("evaluateDfm requires a valid cadEngine with analyzeContourGeometry().");
    }
    if (!Number.isFinite(thicknessIn) || thicknessIn <= 0) {
      throw new Error(`evaluateDfm invalid thicknessIn=${thicknessIn}; must be a finite number > 0 in.`);
    }
    if (!tierSpec || typeof tierSpec !== "object" || !Number.isFinite(tierSpec.minWallIn) || tierSpec.minWallIn <= 0) {
      throw new Error("evaluateDfm requires a valid tierSpec with finite minWallIn > 0 in.");
    }

    const warnings = [];
    const notes = [];
    if (!Array.isArray(points) || points.length < 3) {
      warnings.push("Closed profile requires at least 3 distinct vertices.");
      return { valid: false, warnings, notes };
    }

    const stats = cadEngine.analyzeContourGeometry(points);
    const minWallIn = tierSpec.minWallIn;
    const minHoleDiaIn = Number.isFinite(tierSpec.minHoleDiaIn) ? tierSpec.minHoleDiaIn : minWallIn;
    const minHoleDiaBorrowed = !Number.isFinite(tierSpec.minHoleDiaIn);

    if (thicknessIn < minWallIn) {
      warnings.push(
        `Thickness (${thicknessIn.toFixed(3)} in.) is below ${tierSpec.label || tierSpec.id} minimum wall preset (${minWallIn.toFixed(3)} in.).`
      );
    }
    if (stats.minEdgeIn < minWallIn) {
      warnings.push(
        `Shortest outer edge (${stats.minEdgeIn.toFixed(3)} in.) is below minimum wall preset (${minWallIn.toFixed(3)} in.).`
      );
    }

    // Surface bend parameters honestly — never invent 0.4 / 0.06 silently
    const hasK = Number.isFinite(materialSpec?.kFactor);
    const hasBendR = Number.isFinite(materialSpec?.minBendRadiusIn);
    const kFactor = hasK ? materialSpec.kFactor : null;
    const minBendRadiusIn = hasBendR ? materialSpec.minBendRadiusIn : null;
    const bendAllowanceIn = hasK && hasBendR
      ? Number((Math.PI * (minBendRadiusIn + kFactor * thicknessIn) * (90 / 180)).toFixed(4))
      : null;
    const bendParamsAreEstimate =
      !hasK || !hasBendR || Boolean(materialSpec?.kFactorIsEstimate) || Boolean(materialSpec?.minBendRadiusIsEstimate);

    let techniqueBranchStatus = "IMPLEMENTED_EXTRUDE_APPROXIMATION";

    if (techniqueId === "sheet_metal_bend") {
      if (!hasK || !hasBendR) {
        warnings.push(
          "Sheet metal bend parameters (kFactor / minBendRadiusIn) missing — UNVERIFIED_ESTIMATE_NEEDING_TOOLING_TEST."
        );
      } else {
        if (thicknessIn < minBendRadiusIn && minBendRadiusIn > 0.05) {
          warnings.push(
            `Sheet metal thickness (${thicknessIn.toFixed(3)} in.) is tight for ${materialSpec.category || "alloy"} est. min bend radius (${minBendRadiusIn.toFixed(3)} in.).`
          );
        }
        notes.push(
          `Est. K-factor=${kFactor}, est. minR=${minBendRadiusIn} in., 90° bend allowance=${bendAllowanceIn} in. (${bendParamsAreEstimate ? "UNVERIFIED ESTIMATE — tooling test needed" : "verified"}).`
        );
      }
    } else if (techniqueId === "additive_dfam_shell") {
      const aspect = stats.minEdgeIn > 0 ? Number((thicknessIn / stats.minEdgeIn).toFixed(2)) : 0;
      if (aspect > (tierSpec.maxAspectRatio || 15)) {
        warnings.push(`High overhang/aspect ratio (${aspect}) exceeds tier advisory preset (${tierSpec.maxAspectRatio || 15}).`);
      }
      notes.push("DfAM check: verify self-supporting overhangs (<45° from vertical) and powder/resin escape holes.");
    } else if (techniqueId === "loft_sweep_surface") {
      techniqueBranchStatus = "EXTRUDE_BASED_APPROXIMATION_NOT_TRUE_LOFT";
      notes.push(
        "EXTRUDE-BASED APPROXIMATION ONLY (NOT a true multi-station loft/sweep): verify real station cross-sections before toolpath generation."
      );
    } else if (techniqueId === "reverse_eng_fit") {
      techniqueBranchStatus = "UNIMPLEMENTED_AS_TECHNIQUE_BRANCH_FALLS_BACK_TO_DEFAULT_EXTRUDE";
      notes.push(
        "reverse_eng_fit branch is UNIMPLEMENTED as a dedicated CAD technique (falls back to default extrude); verify contour against calibrated 500 mm photo."
      );
    }

    // Check every feature across ALL tiers: containment, edge clearance, minHoleDia, L/D rules of thumb, and feature-to-feature spacing
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      if (Array.isArray(f.defaultsUsed) && f.defaultsUsed.length > 0) {
        notes.push(`${f.id} uses unverified defaults (${f.defaultsUsed.join(", ")}) — NEEDING RAY'S MEASUREMENT.`);
      }

      const chk = this.validateFeatureAgainstContour(points, f, minWallIn);
      if (!chk.insideContour) {
        warnings.push(`Feature ${f.id} lies OUTSIDE the outer profile contour.`);
      } else if (!chk.clearanceValid) {
        warnings.push(`Feature ${f.id}: ${chk.reason}`);
      }

      const minSpan = f.kind === "oblong_slot" ? f.widthIn : f.diameterIn;
      if (Number.isFinite(minSpan) && minSpan > 0) {
        if (minSpan < minHoleDiaIn) {
          warnings.push(
            `Feature ${f.id} (${minSpan.toFixed(4)} in.) is below minHoleDia preset (${minHoleDiaIn.toFixed(4)} in.${minHoleDiaBorrowed ? " [borrowed from minWallIn]" : ""}).`
          );
        }
        const ldRatio = thicknessIn / minSpan;
        // Applied across ALL tiers (Flag 4) and labeled honestly as machining rules of thumb
        if (ldRatio > 4.0) {
          warnings.push(
            `Feature ${f.id} (${minSpan.toFixed(3)} in. vs ${thicknessIn.toFixed(3)} in. thick, L/D=${ldRatio.toFixed(2)}:1) exceeds 4:1 general drilling rule of thumb.`
          );
        } else if (minSpan < thicknessIn) {
          warnings.push(
            `Feature ${f.id} (${minSpan.toFixed(3)} in.) is smaller than plate thickness (${thicknessIn.toFixed(3)} in., L/D=${ldRatio.toFixed(2)}:1 > 1:1 general machining advisory across all tiers).`
          );
        }
      }

      // Feature-to-feature web clearance check (circular holes)
      const r1 = (f.kind === "oblong_slot" ? f.widthIn : f.diameterIn || 0) / 2;
      for (let j = i + 1; j < features.length; j++) {
        const g = features[j];
        const r2 = (g.kind === "oblong_slot" ? g.widthIn : g.diameterIn || 0) / 2;
        const webDist = Math.hypot(f.x - g.x, f.y - g.y) - r1 - r2;
        if (webDist < minWallIn) {
          warnings.push(
            `Web clearance between ${f.id} and ${g.id} (${webDist.toFixed(4)} in.) is below tier minWall preset (${minWallIn.toFixed(4)} in.).`
          );
        }
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
      notes,
      stats,
      techniqueMetadata: {
        unitsInternal: "inches",
        techniqueId,
        techniqueBranchStatus,
        kFactor,
        minBendRadiusIn,
        bendAllowance90DegIn: bendAllowanceIn,
        bendParamsStatus: bendParamsAreEstimate ? "UNVERIFIED_ESTIMATE_NEEDING_TOOLING_TEST" : "VERIFIED",
        tierPresetNotice: tierSpec.isPreset ? "SHOP_PRESET_NEEDING_RAY_CONFIRMATION" : "VERIFIED_SHOP_CAPABILITY",
        featureCount: features.length
      }
    };
  }
}