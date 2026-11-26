/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TraceEngine = 'vtracer' | 'opencv' | 'manual_contour';

export type TargetManufacturingProcess =
  | 'cnc_5_axis'
  | 'lpbf_slm_dmls'
  | 'ded_am'
  | 'superplastic_forming'
  | 'near_net_forging';

export type ManufacturabilityStatus = 'PASS' | 'WARN_ESTIMATE' | 'FLAG_INFEASIBLE';

export interface Point2D {
  x: number;
  y: number;
}

export interface CalibratedScalePlane {
  planeId: string;
  referencePixels: number;
  referenceInches: number;
  inchesPerPixel: number;
  mmPerInch: number;
  calibrationNote: string;
  needsPhysicalVerification: boolean;
  sourceRef: string;
}

export interface TracedContourInput {
  contourId: string;
  partName: string;
  traceEngine: TraceEngine;
  /** Contour vertices in pixel coordinates on the calibrated scale plane */
  pixelPoints: Point2D[];
  /** Extrusion / feature depth in inches */
  extrudeDepthIn: number;
  /** Draft angle in degrees (0 if none specified) */
  draftAngleDeg?: number;
  /** Minimum wall or feature thickness in inches if known; if omitted, derived from bounding contour */
  minFeatureSizeIn?: number;
  /** Whether part/feature involves an internal/solid-state join rather than an extruded contour */
  isInternalOrSolidStateJoin?: boolean;
  /** Optional density in g/cm^3 from a verified/curated source (e.g. 2.70 or 4.43); never invented */
  densityGCm3?: number;
  sourceRef: string;
}

export interface ProcessManufacturabilityRule {
  process: TargetManufacturingProcess;
  label: string;
  /** Minimum wall/feature size in inches; null when no single published limit exists in chat sources */
  minFeatureSizeIn: number | null;
  /** Maximum recommended extrusion/feature depth in inches; null when unverified in chat sources */
  maxExtrudeDepthIn: number | null;
  /** Minimum draft angle in degrees if required/flagged; null when unverified in chat sources */
  minDraftAngleDeg: number | null;
  /** Whether internal/solid-state join features cannot be represented as a simple extruded contour */
  rejectsExtrudedContour: boolean;
  ruleSummary: string;
  sourceRef: string;
}

export interface ManufacturabilityFinding {
  code:
    | 'BELOW_MIN_FEATURE_SIZE'
    | 'UNVERIFIED_FEATURE_SIZE'
    | 'EXCEEDS_MAX_DEPTH'
    | 'UNVERIFIED_DEPTH'
    | 'INSUFFICIENT_DRAFT'
    | 'UNVERIFIED_DRAFT'
    | 'INCOMPATIBLE_CONTOUR_TOPOLOGY'
    | 'VENDOR_OR_ESTIMATE_LIMIT'
    | 'NEEDS_RAY_MEASUREMENT';
  severity: 'INFO' | 'WARN' | 'BLOCK';
  message: string;
  sourceRef: string;
}

export interface EvaluatedPartGeometry {
  contourId: string;
  partName: string;
  process: TargetManufacturingProcess;
  status: ManufacturabilityStatus;
  scalePlane: CalibratedScalePlane;
  /** Converted vertices in inches */
  pointsIn: Point2D[];
  /** Converted vertices in millimeters */
  pointsMm: Point2D[];
  widthIn: number;
  heightIn: number;
  extrudeDepthIn: number;
  extrudeDepthMm: number;
  draftAngleDeg: number;
  /** 2D area in square inches (from planar polygon shoelace formula) */
  areaIn2: number;
  /** Extruded volume in cubic inches (`areaIn2 * extrudeDepthIn`) */
  volumeIn3: number;
  /** Extruded volume in cubic centimeters (`volumeIn3 * 16.387064`) */
  volumeCm3: number;
  /** Mass in grams only when `densityGCm3` is supplied; otherwise null */
  estimatedMassGrams: number | null;
  findings: ManufacturabilityFinding[];
  browserPreviewSpec: {
    renderer: 'three.js (MIT) ExtrudeGeometry + STLExporter';
    clientSideOnly: boolean;
    note: string;
  };
  serverStepExportSpec: {
    engine: 'build123d (Apache-2.0) on OpenCASCADE / OCCT (LGPL-2.1)';
    format: 'STEP AP242 (ISO 10303-242 MBD)';
    endpointHint: string;
    note: string;
  };
}

export const CALIBRATED_TRUE_SCALE_PLANE: CalibratedScalePlane = {
  planeId: 'ray_true_scale_138px_4p400in',
  referencePixels: 138,
  referenceInches: 4.4,
  inchesPerPixel: 4.4 / 138,
  mmPerInch: 25.4,
  calibrationNote:
    'Calibrated true-scale plane: 138 px = 4.400 in (~0.031884058 in/px). Re-verify scale reference on physical print/part before final machining [NEEDS RAY\'S MEASUREMENT].',
  needsPhysicalVerification: true,
  sourceRef: 'Ray calibrated scale spec (138 px = 4.400 in); ISO 2768-1 / ASME Y14.5-2018 units'
};

/**
 * Process capability limits derived strictly from the SOTA manufacturing & aerospace data in this chat.
 * Any unverified or single-source figure is flagged explicitly; nothing is silently passed or invented.
 */
export const PROCESS_CAPABILITY_RULES: Record<TargetManufacturingProcess, ProcessManufacturabilityRule> = {
  cnc_5_axis: {
    process: 'cnc_5_axis',
    label: '5-Axis CNC Machining',
    minFeatureSizeIn: 0.002, // ±0.002 in (0.05 mm) standard CNC reference in manufacturingMatrix/report
    maxExtrudeDepthIn: null, // No universal single max pocket/extrude depth published in chat sources
    minDraftAngleDeg: null, // Not a universal draft-only rule like casting; tool reach/geometry governs
    rejectsExtrudedContour: false,
    ruleSummary:
      'Standard 5-axis CNC tolerance ~±0.05 mm (±0.002 in), Ra 0.8–1.6 µm standard (0.2–0.8 µm fine/fatigue fillets; ±0.005 mm single-shop vendor claim). Deeper pockets/undercuts depend on tool reach & setup [ESTIMATE / VENDOR_CLAIM / NEEDS RAY\'S MEASUREMENT].',
    sourceRef: 'manufacturingMatrix.ts; aerospace-matrix-research-20261126.txt §2 & §5'
  },
  lpbf_slm_dmls: {
    process: 'lpbf_slm_dmls',
    label: 'Laser Powder Bed Fusion (LPBF / SLM / DMLS)',
    minFeatureSizeIn: 0.004, // ~0.10 mm (100 µm) practical thin-feature check vs 20–60 µm layer & ±0.05–0.20 mm build variation
    maxExtrudeDepthIn: null, // No single universal max depth published in chat sources; build envelope & overhang/support rules apply
    minDraftAngleDeg: null, // Down-facing/overhang roughness rises (15–35 µm Ra) and supports/HIP shifts require post-machining on critical faces
    rejectsExtrudedContour: false,
    ruleSummary:
      'LPBF/DMLS (ISO/ASTM 52900 / NASA-STD-6030 / AMS 7003): 20–60 µm layers, ~±0.05–0.10 mm XY / ±0.10–0.20 mm Z as-built, Ra 6–15 µm up / 15–35 µm down; HIP can shift dimensions and critical faces need CNC post-machining [ESTIMATE / VENDOR_CLAIM].',
    sourceRef: 'manufacturingMatrix.ts; aerospace-matrix-research-20261126.txt §2 & §3'
  },
  ded_am: {
    process: 'ded_am',
    label: 'Directed Energy Deposition (DED — Powder or Wire)',
    minFeatureSizeIn: 0.03937, // ~1.0 mm (0.03937 in) wall noted in NASA LP-DED/LW-DED reference; coarser than LPBF
    maxExtrudeDepthIn: null, // No single universal max depth published in chat sources
    minDraftAngleDeg: null, // No single universal draft angle published in chat sources
    rejectsExtrudedContour: false,
    ruleSummary:
      'DED (ISO/ASTM 52900 / NASA-STD-6030): coarser than LPBF with higher heat input/residual stress and heavier machining stock allowance (~1 mm wall noted in NASA source); exact tolerance/Ra not published as a single value [ESTIMATE / NEEDS RAY\'S MEASUREMENT].',
    sourceRef: 'aerospace-matrix-research-20261126.txt §2 & §3'
  },
  superplastic_forming: {
    process: 'superplastic_forming',
    label: 'Superplastic Forming (SPF)',
    minFeatureSizeIn: null, // Sheet/die forming; no single universal min feature size published in chat sources
    maxExtrudeDepthIn: null, // Die/strain-limited; no single universal depth published in chat sources
    minDraftAngleDeg: null, // Unconstrained inner sheets can show large variance; no single universal angle published
    rejectsExtrudedContour: false,
    ruleSummary:
      'SPF: elevates sheet to superplastic strain at temperature with low residual stress and die-conforming geometry, but unconstrained inner sheets can show large variance and no single universal tolerance/Ra is published [ESTIMATE / NEEDS RAY\'S MEASUREMENT].',
    sourceRef: 'aerospace-matrix-research-20261126.txt §2'
  },
  near_net_forging: {
    process: 'near_net_forging',
    label: 'Precision / Near-Net-Shape (NNS) Forging',
    minFeatureSizeIn: 0.03937, // ~1.0 mm lower bound of vendor-reported NNS machining allowance (1.0–3.0 mm/face; 2–5 mm in one source)
    maxExtrudeDepthIn: null, // No single universal depth published in chat sources
    minDraftAngleDeg: 1, // Flag if explicit 0° draft is passed on a forged contour without machining allowance note [ESTIMATE]
    rejectsExtrudedContour: false,
    ruleSummary:
      'NNS Forging: provides directional grain flow/fatigue strength and requires machining stock allowance (1.0–3.0 mm/face or 2–5 mm in one report vs 10–15 mm conventional; buy-to-fly 3.5:1–4.2:1 vendor-claimed) prior to finish machining [VENDOR_CLAIM / NEEDS RAY\'S MEASUREMENT].',
    sourceRef: 'aerospace-matrix-research-20261126.txt §2 & §5'
  }
};

function computePolygonAreaIn2(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    twiceArea += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(twiceArea) * 0.5;
}

function estimateMinimumSpanIn(pointsIn: Point2D[]): number {
  if (pointsIn.length < 2) return 0;
  let minSpan = Infinity;
  for (let i = 0; i < pointsIn.length; i++) {
    const p1 = pointsIn[i];
    const p2 = pointsIn[(i + 1) % pointsIn.length];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (dist > 0 && dist < minSpan) {
      minSpan = dist;
    }
  }
  return Number.isFinite(minSpan) ? minSpan : 0;
}

/**
 * Evaluates a traced 2D contour + extrusion depth against the calibrated scale plane
 * and target manufacturing process rules, flagging infeasible or unverified features
 * instead of silently fabricating specs.
 */
export function evaluateTracedPart(
  input: TracedContourInput,
  process: TargetManufacturingProcess,
  scalePlane: CalibratedScalePlane = CALIBRATED_TRUE_SCALE_PLANE
): EvaluatedPartGeometry {
  const rule = PROCESS_CAPABILITY_RULES[process];
  const pointsIn: Point2D[] = input.pixelPoints.map((pt) => ({
    x: Number((pt.x * scalePlane.inchesPerPixel).toFixed(5)),
    y: Number((pt.y * scalePlane.inchesPerPixel).toFixed(5))
  }));
  const pointsMm: Point2D[] = pointsIn.map((pt) => ({
    x: Number((pt.x * scalePlane.mmPerInch).toFixed(4)),
    y: Number((pt.y * scalePlane.mmPerInch).toFixed(4))
  }));

  const xs = pointsIn.map((p) => p.x);
  const ys = pointsIn.map((p) => p.y);
  const widthIn = xs.length > 0 ? Number((Math.max(...xs) - Math.min(...xs)).toFixed(5)) : 0;
  const heightIn = ys.length > 0 ? Number((Math.max(...ys) - Math.min(...ys)).toFixed(5)) : 0;

  const extrudeDepthIn = Number(input.extrudeDepthIn.toFixed(5));
  const extrudeDepthMm = Number((extrudeDepthIn * scalePlane.mmPerInch).toFixed(4));
  const draftAngleDeg = input.draftAngleDeg ?? 0;

  const areaIn2 = Number(computePolygonAreaIn2(pointsIn).toFixed(6));
  const volumeIn3 = Number((areaIn2 * extrudeDepthIn).toFixed(6));
  const volumeCm3 = Number((volumeIn3 * 16.387064).toFixed(6));

  const estimatedMassGrams =
    typeof input.densityGCm3 === 'number' && Number.isFinite(input.densityGCm3)
      ? Number((volumeCm3 * input.densityGCm3).toFixed(4))
      : null;

  const findings: ManufacturabilityFinding[] = [
    {
      code: 'NEEDS_RAY_MEASUREMENT',
      severity: 'WARN',
      message: `Scale plane (${scalePlane.referencePixels} px = ${scalePlane.referenceInches.toFixed(3)} in) and final part dimensions/tolerances require physical verification [NEEDS RAY'S MEASUREMENT].`,
      sourceRef: scalePlane.sourceRef
    }
  ];

  let hasBlock = false;
  let hasWarn = false;

  if (input.pixelPoints.length < 3 || areaIn2 <= 0) {
    hasBlock = true;
    findings.push({
      code: 'INCOMPATIBLE_CONTOUR_TOPOLOGY',
      severity: 'BLOCK',
      message: 'Contour has fewer than 3 non-collinear points or zero enclosed area; cannot extrude a valid closed part.',
      sourceRef: input.sourceRef
    });
  }

  if (input.isInternalOrSolidStateJoin || rule.rejectsExtrudedContour) {
    hasBlock = true;
    findings.push({
      code: 'INCOMPATIBLE_CONTOUR_TOPOLOGY',
      severity: 'BLOCK',
      message: `Feature/process (${rule.label}) is not valid as a standalone 2D extruded contour; flag for dedicated solid/process modeling.`,
      sourceRef: rule.sourceRef
    });
  }

  if (extrudeDepthIn <= 0) {
    hasBlock = true;
    findings.push({
      code: 'EXCEEDS_MAX_DEPTH',
      severity: 'BLOCK',
      message: `Extrusion depth (${extrudeDepthIn.toFixed(4)} in) must be greater than zero to form a 3D part.`,
      sourceRef: input.sourceRef
    });
  }

  const effectiveFeatureIn =
    typeof input.minFeatureSizeIn === 'number'
      ? input.minFeatureSizeIn
      : estimateMinimumSpanIn(pointsIn);

  if (typeof input.minFeatureSizeIn !== 'number') {
    hasWarn = true;
    findings.push({
      code: 'UNVERIFIED_FEATURE_SIZE',
      severity: 'WARN',
      message: `Explicit minFeatureSizeIn not provided; using smallest contour segment (${effectiveFeatureIn.toFixed(4)} in) as proxy — verify actual wall/boss thickness.`,
      sourceRef: input.sourceRef
    });
  }

  if (rule.minFeatureSizeIn !== null && effectiveFeatureIn > 0 && effectiveFeatureIn < rule.minFeatureSizeIn) {
    hasBlock = true;
    findings.push({
      code: 'BELOW_MIN_FEATURE_SIZE',
      severity: 'BLOCK',
      message: `Feature size (${effectiveFeatureIn.toFixed(4)} in / ${(effectiveFeatureIn * 25.4).toFixed(2)} mm) is below ${rule.label} reference threshold (${rule.minFeatureSizeIn.toFixed(4)} in / ${(rule.minFeatureSizeIn * 25.4).toFixed(2)} mm).`,
      sourceRef: rule.sourceRef
    });
  }

  if (rule.minDraftAngleDeg !== null && draftAngleDeg < rule.minDraftAngleDeg) {
    hasWarn = true;
    findings.push({
      code: 'INSUFFICIENT_DRAFT',
      severity: 'WARN',
      message: `Draft angle (${draftAngleDeg}°) is below ${rule.label} reference minimum (${rule.minDraftAngleDeg}°) or lacks explicit machining stock allowance.`,
      sourceRef: rule.sourceRef
    });
  }

  if (rule.maxExtrudeDepthIn !== null && extrudeDepthIn > rule.maxExtrudeDepthIn) {
    hasBlock = true;
    findings.push({
      code: 'EXCEEDS_MAX_DEPTH',
      severity: 'BLOCK',
      message: `Extrusion depth (${extrudeDepthIn.toFixed(4)} in) exceeds ${rule.label} limit (${rule.maxExtrudeDepthIn.toFixed(4)} in).`,
      sourceRef: rule.sourceRef
    });
  } else if (rule.maxExtrudeDepthIn === null) {
    hasWarn = true;
    findings.push({
      code: 'UNVERIFIED_DEPTH',
      severity: 'WARN',
      message: `No universal max depth published for ${rule.label} in chat sources; check aspect ratio, tool reach, overhang/support, or die limits [ESTIMATE].`,
      sourceRef: rule.sourceRef
    });
  }

  if (rule.minDraftAngleDeg === null && input.draftAngleDeg === undefined) {
    hasWarn = true;
    findings.push({
      code: 'UNVERIFIED_DRAFT',
      severity: 'WARN',
      message: `No draft angle specified and no universal draft rule published for ${rule.label}; verify process/tooling requirements [ESTIMATE].`,
      sourceRef: rule.sourceRef
    });
  }

  findings.push({
    code: 'VENDOR_OR_ESTIMATE_LIMIT',
    severity: 'INFO',
    message: rule.ruleSummary,
    sourceRef: rule.sourceRef
  });

  const status: ManufacturabilityStatus = hasBlock
    ? 'FLAG_INFEASIBLE'
    : hasWarn
      ? 'WARN_ESTIMATE'
      : 'PASS';

  return {
    contourId: input.contourId,
    partName: input.partName,
    process,
    status,
    scalePlane,
    pointsIn,
    pointsMm,
    widthIn,
    heightIn,
    extrudeDepthIn,
    extrudeDepthMm,
    draftAngleDeg,
    areaIn2,
    volumeIn3,
    volumeCm3,
    estimatedMassGrams,
    findings,
    browserPreviewSpec: {
      renderer: 'three.js (MIT) ExtrudeGeometry + STLExporter',
      clientSideOnly: true,
      note: 'Client-side preview and mesh export only (after vtracer MIT/WASM or OpenCV.js Apache-2.0 contour trace). Use server build123d/OpenCASCADE for real STEP AP242 solids.'
    },
    serverStepExportSpec: {
      engine: 'build123d (Apache-2.0) on OpenCASCADE / OCCT (LGPL-2.1)',
      format: 'STEP AP242 (ISO 10303-242 MBD)',
      endpointHint: '/api/extrude-step',
      note: 'Send calibrated inch/mm points and depth to server build123d/OCCT script to generate a true B-rep STEP AP242 file.'
    }
  };
}

/**
 * Generates an ASCII/text STL (in inches) from the extruded top/bottom/side triangles
 * when `allowFlaggedExport` is true; blocks silently exporting infeasible parts unless explicitly overridden.
 */
export function exportPartToStlInches(
  evaluated: EvaluatedPartGeometry,
  options: { allowFlaggedExport?: boolean } = {}
): { ok: boolean; reason?: string; content?: string } {
  if (evaluated.status === 'FLAG_INFEASIBLE' && !options.allowFlaggedExport) {
    return {
      ok: false,
      reason: `Export blocked: part ${evaluated.partName} is flagged INFEASIBLE for ${evaluated.process}. Resolve findings or pass allowFlaggedExport: true.`
    };
  }

  const pts = evaluated.pointsIn;
  if (pts.length < 3 || evaluated.extrudeDepthIn <= 0) {
    return { ok: false, reason: 'Invalid polygon or non-positive extrusion depth in inches.' };
  }

  const z0 = 0;
  const z1 = evaluated.extrudeDepthIn;
  const triangles: Array<[Point2D & { z: number }, Point2D & { z: number }, Point2D & { z: number }]> = [];

  // Fan triangulation across XY contour for bottom and top caps
  for (let i = 1; i < pts.length - 1; i++) {
    triangles.push([
      { x: pts[0].x, y: pts[0].y, z: z0 },
      { x: pts[i + 1].x, y: pts[i + 1].y, z: z0 },
      { x: pts[i].x, y: pts[i].y, z: z0 }
    ]);
    triangles.push([
      { x: pts[0].x, y: pts[0].y, z: z1 },
      { x: pts[i].x, y: pts[i].y, z: z1 },
      { x: pts[i + 1].x, y: pts[i + 1].y, z: z1 }
    ]);
  }

  // Side quads split into two triangles per edge
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const b0 = { x: a.x, y: a.y, z: z0 };
    const b1 = { x: b.x, y: b.y, z: z0 };
    const t1 = { x: b.x, y: b.y, z: z1 };
    const t0 = { x: a.x, y: a.y, z: z1 };
    triangles.push([b0, b1, t1]);
    triangles.push([b0, t1, t0]);
  }

  const lines: string[] = [`solid ${evaluated.contourId}_inches`];
  for (const [v1, v2, v3] of triangles) {
    const ux = v2.x - v1.x;
    const uy = v2.y - v1.y;
    const uz = v2.z - v1.z;
    const vx = v3.x - v1.x;
    const vy = v3.y - v1.y;
    const vz = v3.z - v1.z;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    lines.push(`  facet normal ${nx.toExponential(6)} ${ny.toExponential(6)} ${nz.toExponential(6)}`);
    lines.push('    outer loop');
    lines.push(`      vertex ${v1.x.toExponential(6)} ${v1.y.toExponential(6)} ${v1.z.toExponential(6)}`);
    lines.push(`      vertex ${v2.x.toExponential(6)} ${v2.y.toExponential(6)} ${v2.z.toExponential(6)}`);
    lines.push(`      vertex ${v3.x.toExponential(6)} ${v3.y.toExponential(6)} ${v3.z.toExponential(6)}`);
    lines.push('    endloop');
    lines.push('  endfacet');
  }
  lines.push(`endsolid ${evaluated.contourId}_inches`);

  return { ok: true, content: lines.join('\n') };
}

/**
 * Exports the 2D calibrated contour (and optional extrusion depth note) as an inch-unit DXF R12-style LWPOLYLINE/LINE exchange text.
 */
export function exportContourToDxfInches(
  evaluated: EvaluatedPartGeometry,
  options: { allowFlaggedExport?: boolean } = {}
): { ok: boolean; reason?: string; content?: string } {
  if (evaluated.status === 'FLAG_INFEASIBLE' && !options.allowFlaggedExport) {
    return {
      ok: false,
      reason: `DXF export blocked: part ${evaluated.partName} is flagged INFEASIBLE for ${evaluated.process}.`
    };
  }

  const pts = evaluated.pointsIn;
  if (pts.length < 2) {
    return { ok: false, reason: 'At least 2 points are required for DXF export.' };
  }

  // $MEASUREMENT = 0 (Imperial / Inches)
  const dxf: string[] = [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$MEASUREMENT',
    '70', '0',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES'
  ];

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    dxf.push(
      '0', 'LINE',
      '8', `CONTOUR_IN_${evaluated.process.toUpperCase()}`,
      '10', p1.x.toFixed(6),
      '20', p1.y.toFixed(6),
      '30', '0.000000',
      '11', p2.x.toFixed(6),
      '21', p2.y.toFixed(6),
      '31', '0.000000'
    );
  }

  dxf.push('0', 'ENDSEC', '0', 'EOF');
  return { ok: true, content: dxf.join('\n') };
}

/**
 * Exports the extruded part as a Wavefront OBJ mesh in inches (1 unit = 1 inch).
 */
export function exportPartToObjInches(
  evaluated: EvaluatedPartGeometry,
  options: { allowFlaggedExport?: boolean } = {}
): { ok: boolean; reason?: string; content?: string } {
  if (evaluated.status === 'FLAG_INFEASIBLE' && !options.allowFlaggedExport) {
    return {
      ok: false,
      reason: `OBJ export blocked: part ${evaluated.partName} is flagged INFEASIBLE for ${evaluated.process}.`
    };
  }

  const pts = evaluated.pointsIn;
  if (pts.length < 3 || evaluated.extrudeDepthIn <= 0) {
    return { ok: false, reason: 'Invalid polygon or non-positive extrusion depth in inches.' };
  }

  const z0 = 0;
  const z1 = evaluated.extrudeDepthIn;
  const n = pts.length;
  const lines: string[] = [
    `# Unit: inches (1 OBJ unit = 1 in); calibrated scale: ${evaluated.scalePlane.referencePixels} px = ${evaluated.scalePlane.referenceInches.toFixed(3)} in`,
    `# Process: ${evaluated.process} | Status: ${evaluated.status}`,
    `o ${evaluated.contourId}_in`
  ];

  // Bottom vertices 1..n, top vertices (n+1)..(2n)
  for (const p of pts) {
    lines.push(`v ${p.x.toFixed(6)} ${p.y.toFixed(6)} ${z0.toFixed(6)}`);
  }
  for (const p of pts) {
    lines.push(`v ${p.x.toFixed(6)} ${p.y.toFixed(6)} ${z1.toFixed(6)}`);
  }

  // Bottom cap
  const botIndices = Array.from({ length: n }, (_, idx) => n - idx).join(' ');
  lines.push(`f ${botIndices}`);

  // Top cap
  const topIndices = Array.from({ length: n }, (_, idx) => n + 1 + idx).join(' ');
  lines.push(`f ${topIndices}`);

  // Side faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const b1 = i + 1;
    const b2 = next + 1;
    const t2 = n + next + 1;
    const t1 = n + i + 1;
    lines.push(`f ${b1} ${b2} ${t2} ${t1}`);
  }

  return { ok: true, content: lines.join('\n') };
}