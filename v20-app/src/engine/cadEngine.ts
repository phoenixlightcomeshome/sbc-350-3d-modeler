/**
 * Quantum Aerospace CAD & Extrude Approximation Engine
 * Honest Implementation: THREE.ExtrudeGeometry Solid Builder, Cutout Loops, Binary .STL, 2D .DXF, and JSON MBD Packet
 * (Extrude Approximation — NOT a Real B-Rep Kernel)
 */
import * as THREE from 'three';
import { MATERIALS, FABRICATION_TIERS } from './standards';

export interface ParametricPartConfig {
  name: string;
  subsystem: string;
  widthIn: number;
  heightIn: number;
  thicknessIn: number;
  cornerRadiusIn: number;
  // Feature flags
  hasCornerHoles: boolean;
  cornerHoleDiaIn: number;
  cornerHoleMarginIn: number;
  hasBoltCircle: boolean;
  boltCircleCount: number;
  boltCirclePcdIn: number;
  boltCircleHoleDiaIn: number;
  hasCenterSlot: boolean;
  slotLengthIn: number;
  slotWidthIn: number;
  // Fabrication
  materialName: string;
  tierId: string;
  // Head bolt pattern (17 head bolts GM SBC)
  hasSbcHeadBoltPattern?: boolean;
}

export interface DfmRuleCheck {
  ruleName: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'NEEDING_MEASUREMENT';
  measuredValue: string;
  thresholdValue: string;
  message: string;
}

export interface DfmAnalysisResult {
  passed: boolean;
  checks: DfmRuleCheck[];
  estimatedVolumeIn3: number;
  estimatedWeightLb: number;
  estimatedRawMaterialCostUsd: number;
}

/**
 * Construct 2D THREE.Shape with cutout paths
 */
export function build2DShape(config: ParametricPartConfig): { shape: THREE.Shape; holes: THREE.Path[] } {
  const { widthIn: w, heightIn: h, cornerRadiusIn: r } = config;
  const shape = new THREE.Shape();

  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, Math.min(hw, hh) * 0.9);

  if (rad > 0.001) {
    // Rounded rectangle
    shape.moveTo(-hw + rad, -hh);
    shape.lineTo(hw - rad, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + rad);
    shape.lineTo(hw, hh - rad);
    shape.quadraticCurveTo(hw, hh, hw - rad, hh);
    shape.lineTo(-hw + rad, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - rad);
    shape.lineTo(-hw, -hh + rad);
    shape.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
  } else {
    // Sharp rectangle
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();
  }

  // Holes / Cutouts
  if (config.hasCornerHoles && config.cornerHoleDiaIn > 0.01) {
    const margin = config.cornerHoleMarginIn;
    const holeRadius = config.cornerHoleDiaIn / 2;
    const cx = hw - margin;
    const cy = hh - margin;

    if (cx > holeRadius && cy > holeRadius) {
      const corners = [
        [cx, cy],
        [-cx, cy],
        [-cx, -cy],
        [cx, -cy],
      ];
      for (const [x, y] of corners) {
        const holePath = new THREE.Path();
        holePath.absarc(x, y, holeRadius, 0, Math.PI * 2, true);
        shape.holes.push(holePath);
      }
    }
  }

  // Bolt Circle
  if (config.hasBoltCircle && config.boltCircleCount > 0 && config.boltCirclePcdIn > 0) {
    const pcdRadius = config.boltCirclePcdIn / 2;
    const holeRadius = config.boltCircleHoleDiaIn / 2;
    const count = config.boltCircleCount;

    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      const x = Math.cos(angle) * pcdRadius;
      const y = Math.sin(angle) * pcdRadius;
      const holePath = new THREE.Path();
      holePath.absarc(x, y, holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(holePath);
    }
  }

  // Center Oblong Slot
  if (config.hasCenterSlot && config.slotLengthIn > 0 && config.slotWidthIn > 0) {
    const sw = config.slotWidthIn;
    const sl = config.slotLengthIn;
    const slotRad = sw / 2;
    const halfSpan = Math.max(0, (sl - sw) / 2);

    const slotPath = new THREE.Path();
    slotPath.moveTo(-halfSpan, -slotRad);
    slotPath.lineTo(halfSpan, -slotRad);
    slotPath.absarc(halfSpan, 0, slotRad, -Math.PI / 2, Math.PI / 2, false);
    slotPath.lineTo(-halfSpan, slotRad);
    slotPath.absarc(-halfSpan, 0, slotRad, Math.PI / 2, (3 * Math.PI) / 2, false);
    slotPath.closePath();
    shape.holes.push(slotPath);
  }

  return { shape, holes: shape.holes };
}

/**
 * Generate 3D Extrusion Geometry (THREE.ExtrudeGeometry approximation)
 */
export function buildExtrudedGeometry(config: ParametricPartConfig): THREE.BufferGeometry {
  const { shape } = build2DShape(config);
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: config.thicknessIn,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

/**
 * DFM rule evaluator based on chosen tier & material
 */
export function evaluateDfm(config: ParametricPartConfig): DfmAnalysisResult {
  const tier = FABRICATION_TIERS[config.tierId] || FABRICATION_TIERS.tier2_jobshop;
  const material = MATERIALS[config.materialName] || MATERIALS['6061-T6 Aluminum'];

  const checks: DfmRuleCheck[] = [];

  // Minimum wall thickness check
  const minWallThreshold = tier.minWallIn;
  const actualThickness = config.thicknessIn;
  if (actualThickness < minWallThreshold) {
    checks.push({
      ruleName: 'Flange / Wall Thickness',
      status: 'FAIL',
      measuredValue: `${actualThickness.toFixed(3)} in`,
      thresholdValue: `≥ ${minWallThreshold.toFixed(3)} in`,
      message: `Thickness is below Tier threshold (${minWallThreshold} in). Risk of tool chatter or burn-through.`,
    });
  } else {
    checks.push({
      ruleName: 'Flange / Wall Thickness',
      status: 'PASS',
      measuredValue: `${actualThickness.toFixed(3)} in`,
      thresholdValue: `≥ ${minWallThreshold.toFixed(3)} in`,
      message: `Meets minimum wall threshold for ${tier.label.split(':')[0]}.`,
    });
  }

  // Minimum hole diameter check
  if (config.hasCornerHoles) {
    const minHole = tier.minHoleDiaIn;
    if (config.cornerHoleDiaIn < minHole) {
      checks.push({
        ruleName: 'Corner Hole Diameter',
        status: 'WARNING',
        measuredValue: `${config.cornerHoleDiaIn.toFixed(4)} in`,
        thresholdValue: `≥ ${minHole.toFixed(4)} in`,
        message: 'Hole diameter requires micro-machining or EDM drill.',
      });
    } else {
      checks.push({
        ruleName: 'Corner Hole Diameter',
        status: 'PASS',
        measuredValue: `${config.cornerHoleDiaIn.toFixed(4)} in`,
        thresholdValue: `≥ ${minHole.toFixed(4)} in`,
        message: 'Standard drill tooling compatible.',
      });
    }
  }

  // Aspect ratio check
  const maxAspect = tier.maxAspectRatio;
  const aspect = Math.max(config.widthIn, config.heightIn) / Math.max(0.001, config.thicknessIn);
  if (aspect > maxAspect) {
    checks.push({
      ruleName: 'Aspect Ratio (L/T)',
      status: 'WARNING',
      measuredValue: `${aspect.toFixed(1)}:1`,
      thresholdValue: `≤ ${maxAspect}:1`,
      message: `High aspect ratio may lead to thermal warping during CNC surfacing.`,
    });
  } else {
    checks.push({
      ruleName: 'Aspect Ratio (L/T)',
      status: 'PASS',
      measuredValue: `${aspect.toFixed(1)}:1`,
      thresholdValue: `≤ ${maxAspect}:1`,
      message: 'Rigid geometry profile within standard machining ratio.',
    });
  }

  // Material Verification Check (Data Rule)
  if (!material.densityVerified) {
    checks.push({
      ruleName: 'Material Property Verification',
      status: 'NEEDING_MEASUREMENT',
      measuredValue: material.category,
      thresholdValue: 'ASM Verified Spec',
      message: `HANDBOOK ESTIMATE ONLY — Density and bend params flagged NEEDING RAY'S MEASUREMENT.`,
    });
  } else {
    checks.push({
      ruleName: 'Material Property Verification',
      status: 'PASS',
      measuredValue: `${material.densityLbPerIn3.toFixed(4)} lb/in³`,
      thresholdValue: material.densitySource.slice(0, 30) + '...',
      message: 'Verified density baseline reference.',
    });
  }

  // Volume & Weight estimation
  // Approximate rectangular volume minus cutout holes
  let areaIn2 = config.widthIn * config.heightIn;
  if (config.hasCornerHoles) {
    areaIn2 -= 4 * Math.PI * Math.pow(config.cornerHoleDiaIn / 2, 2);
  }
  if (config.hasBoltCircle) {
    areaIn2 -= config.boltCircleCount * Math.PI * Math.pow(config.boltCircleHoleDiaIn / 2, 2);
  }
  if (config.hasCenterSlot) {
    areaIn2 -= (config.slotLengthIn - config.slotWidthIn) * config.slotWidthIn + Math.PI * Math.pow(config.slotWidthIn / 2, 2);
  }
  const volumeIn3 = Math.max(0.01, areaIn2 * config.thicknessIn);
  const weightLb = volumeIn3 * material.densityLbPerIn3;
  const costUsd = weightLb * material.costPerLbUsd;

  const passed = !checks.some((c) => c.status === 'FAIL');

  return {
    passed,
    checks,
    estimatedVolumeIn3: volumeIn3,
    estimatedWeightLb: weightLb,
    estimatedRawMaterialCostUsd: costUsd,
  };
}

/**
 * Generate Real Binary STL File
 */
export function generateBinarySTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  // Convert geometry to non-indexed triangles
  const nonIndexed = geometry.toNonIndexed();
  const posAttr = nonIndexed.getAttribute('position');
  const normalAttr = nonIndexed.getAttribute('normal');

  const triangleCount = posAttr.count / 3;
  const bufferLength = 84 + triangleCount * 50;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const dataView = new DataView(arrayBuffer);

  // 80-byte header
  const headerStr = 'Quantum Aerospace Design Studio v19 Binary STL Export (Extrude Solid)';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
  }

  // 4-byte triangle count
  dataView.setUint32(80, triangleCount, true);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const idx = i * 3;

    // Normal vector
    const nx = normalAttr ? normalAttr.getX(idx) : 0;
    const ny = normalAttr ? normalAttr.getY(idx) : 0;
    const nz = normalAttr ? normalAttr.getZ(idx) : 1;
    dataView.setFloat32(offset, nx, true);
    dataView.setFloat32(offset + 4, ny, true);
    dataView.setFloat32(offset + 8, nz, true);
    offset += 12;

    // 3 Vertices
    for (let v = 0; v < 3; v++) {
      const vx = posAttr.getX(idx + v);
      const vy = posAttr.getY(idx + v);
      const vz = posAttr.getZ(idx + v);
      dataView.setFloat32(offset, vx, true);
      dataView.setFloat32(offset + 4, vy, true);
      dataView.setFloat32(offset + 8, vz, true);
      offset += 12;
    }

    // 2-byte attribute byte count
    dataView.setUint16(offset, 0, true);
    offset += 2;
  }

  return arrayBuffer;
}

/**
 * Generate Real 2D DXF Cut Profile (ASCII DXF R12 standard)
 */
export function generateDXF(config: ParametricPartConfig): string {
  const { widthIn: w, heightIn: h } = config;
  const hw = w / 2;
  const hh = h / 2;

  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n1\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Outer Rectangle Polyline
  dxf += `0\nPOLYLINE\n8\nPROFILE_OUTER\n66\n1\n70\n1\n`;
  const rectPts = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  for (const [x, y] of rectPts) {
    dxf += `0\nVERTEX\n8\nPROFILE_OUTER\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
  }
  dxf += `0\nSEQEND\n`;

  // Corner Holes
  if (config.hasCornerHoles && config.cornerHoleDiaIn > 0.01) {
    const margin = config.cornerHoleMarginIn;
    const rad = config.cornerHoleDiaIn / 2;
    const cx = hw - margin;
    const cy = hh - margin;
    const corners = [
      [cx, cy],
      [-cx, cy],
      [-cx, -cy],
      [cx, -cy],
    ];
    for (const [x, y] of corners) {
      dxf += `0\nCIRCLE\n8\nHOLES_CORNER\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n40\n${rad.toFixed(4)}\n`;
    }
  }

  // Bolt Circle Holes
  if (config.hasBoltCircle && config.boltCircleCount > 0) {
    const pcdRad = config.boltCirclePcdIn / 2;
    const rad = config.boltCircleHoleDiaIn / 2;
    for (let i = 0; i < config.boltCircleCount; i++) {
      const angle = (i * 2 * Math.PI) / config.boltCircleCount;
      const x = Math.cos(angle) * pcdRad;
      const y = Math.sin(angle) * pcdRad;
      dxf += `0\nCIRCLE\n8\nBOLT_CIRCLE\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n40\n${rad.toFixed(4)}\n`;
    }
  }

  // Center Slot
  if (config.hasCenterSlot) {
    const sw = config.slotWidthIn;
    const sl = config.slotLengthIn;
    const halfSpan = Math.max(0, (sl - sw) / 2);
    const sRad = sw / 2;
    // Slot center arc 1
    dxf += `0\nCIRCLE\n8\nSLOT_CENTER\n10\n0.0\n20\n0.0\n30\n0.0\n40\n${sRad.toFixed(4)}\n`;
    if (halfSpan > 0.05) {
      dxf += `0\nLINE\n8\nSLOT_CENTER\n10\n${(-halfSpan).toFixed(4)}\n20\n${(-sRad).toFixed(4)}\n30\n0.0\n11\n${halfSpan.toFixed(4)}\n21\n${(-sRad).toFixed(4)}\n31\n0.0\n`;
      dxf += `0\nLINE\n8\nSLOT_CENTER\n10\n${(-halfSpan).toFixed(4)}\n20\n${sRad.toFixed(4)}\n30\n0.0\n11\n${halfSpan.toFixed(4)}\n21\n${sRad.toFixed(4)}\n31\n0.0\n`;
    }
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

/**
 * Generate Modeling-Room Transfer & MBD JSON Packet
 */
export function generateMbdPacket(
  config: ParametricPartConfig,
  signOff: { engineerName: string; verified: boolean; notes: string; timestamp: string }
): object {
  const dfm = evaluateDfm(config);
  const tier = FABRICATION_TIERS[config.tierId] || FABRICATION_TIERS.tier2_jobshop;
  const material = MATERIALS[config.materialName] || MATERIALS['6061-T6 Aluminum'];

  return {
    transferProtocol: 'BM-04-FUTURE-TECH-V19',
    packetType: 'MODELING_ROOM_TRANSFER_PACKET',
    studioName: 'Quantum Aerospace Design Studio',
    version: '19.0.0',
    appletTarget: 'SBC 350 v20.0.0',
    exportTimestamp: new Date().toISOString(),
    honestCapabilityNotice: {
      geometryKernel: 'THREE.ExtrudeGeometry extrude approximation (NOT true B-Rep kernel; NO watertight manifold guarantee)',
      isRealStepAp242File: false,
      iso10303_242_role: 'JSON MBD schema field reference ONLY; NOT a binary/Part 21 STEP file',
      standardsDisclaimers: 'NIST SP 800-207, NIST AI RMF, NIST IR 8547 PQC are framework metadata references only (NOT certified)',
    },
    partDefinition: {
      name: config.name,
      subsystem: config.subsystem,
      boundingEnvelopeIn: {
        width: config.widthIn,
        height: config.heightIn,
        thickness: config.thicknessIn,
      },
      parametricFeatures: {
        cornerHoles: {
          enabled: config.hasCornerHoles,
          diameterIn: config.cornerHoleDiaIn,
          marginIn: config.cornerHoleMarginIn,
        },
        boltCircle: {
          enabled: config.hasBoltCircle,
          holeCount: config.boltCircleCount,
          pcdIn: config.boltCirclePcdIn,
          holeDiameterIn: config.boltCircleHoleDiaIn,
        },
        centerSlot: {
          enabled: config.hasCenterSlot,
          lengthIn: config.slotLengthIn,
          widthIn: config.slotWidthIn,
        },
      },
      material: {
        name: config.materialName,
        densityLbPerIn3: material.densityLbPerIn3,
        densityVerified: material.densityVerified,
        status: material.densityVerified ? 'ASM_VERIFIED' : "NEEDING RAY'S MEASUREMENT",
      },
      fabricationTier: {
        tierId: tier.id,
        label: tier.label,
        toleranceIn: tier.toleranceIn,
      },
      massProperties: {
        volumeIn3: Number(dfm.estimatedVolumeIn3.toFixed(4)),
        weightLb: Number(dfm.estimatedWeightLb.toFixed(4)),
        rawMaterialCostUsd: Number(dfm.estimatedRawMaterialCostUsd.toFixed(2)),
      },
      dfmChecks: dfm.checks,
    },
    photoCalibrationReference: {
      spanPixels: 335.5,
      spanInches: 19.685,
      spanMm: 500,
      scalePxPerIn: 17.043,
      source: "Ray 2-click 500 mm span on 688x532 camless head photo (335.5 px = 19.685 in -> 17.043 px/in)",
    },
    tevvSignOff: {
      status: signOff.verified ? 'VERIFIED_BY_ENGINEER' : "PENDING_VERIFICATION_NEEDING_RAY'S_MEASUREMENT",
      engineer: signOff.engineerName || 'Unassigned',
      timestamp: signOff.timestamp || new Date().toISOString(),
      notes: signOff.notes || 'Default transfer packet generated in Quantum Aerospace Design Studio',
    },
  };
}
