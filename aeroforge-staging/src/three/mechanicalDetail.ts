import * as THREE from 'three';

export type DetailMaterialKind =
  | 'bronze_bearing'
  | 'copper_gasket'
  | 'mls_steel'
  | 'black_oxide'
  | 'chrome_shaft'
  | 'viton_seal'
  | 'brake_pad'
  | 'brass_fitting'
  | 'anodized_red'
  | 'anodized_blue'
  | 'copper_winding'
  | 'honed_iron';

export function createDetailMaterial(
  kind: DetailMaterialKind,
  clippingPlanes: THREE.Plane[]
): THREE.MeshPhysicalMaterial {
  const base = (
    opts: THREE.MeshPhysicalMaterialParameters
  ): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      ...opts,
      clippingPlanes,
      clipShadows: true,
      side: THREE.DoubleSide,
      envMapIntensity: 1.2,
    });

  switch (kind) {
    case 'bronze_bearing':
      return base({ color: 0xc98a40, metalness: 0.9, roughness: 0.24 });
    case 'copper_gasket':
      return base({ color: 0xd97342, metalness: 0.88, roughness: 0.26 });
    case 'mls_steel':
      return base({ color: 0x475569, metalness: 0.84, roughness: 0.34 });
    case 'black_oxide':
      return base({ color: 0x1e242e, metalness: 0.8, roughness: 0.34 });
    case 'chrome_shaft':
      return base({ color: 0xdde6f0, metalness: 0.96, roughness: 0.12 });
    case 'viton_seal':
      return base({ color: 0x15181e, metalness: 0.04, roughness: 0.82 });
    case 'brake_pad':
      return base({ color: 0x332e2b, metalness: 0.15, roughness: 0.86 });
    case 'brass_fitting':
      return base({ color: 0xd1a345, metalness: 0.9, roughness: 0.26 });
    case 'anodized_red':
      return base({ color: 0xb91c1c, metalness: 0.84, roughness: 0.22, clearcoat: 0.45 });
    case 'anodized_blue':
      return base({ color: 0x1d4ed8, metalness: 0.84, roughness: 0.22, clearcoat: 0.45 });
    case 'copper_winding':
      return base({ color: 0xb96234, metalness: 0.92, roughness: 0.26 });
    case 'honed_iron':
      return base({ color: 0x87929e, metalness: 0.88, roughness: 0.2 });
  }
}

/**
 * Hollow extruded annular cylinder (outerR > innerR), centered at origin along `axis`.
 */
export function createHollowCylinderGeometry(
  outerR: number,
  innerR: number,
  height: number,
  segments = 32,
  axis: 'x' | 'y' | 'z' = 'y',
  bevel = 0
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  if (innerR > 0.0005 && innerR < outerR - 0.0005) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const depth = Math.max(0.002, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: segments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevel > 0 ? 2 : 1,
  });
  geo.translate(0, 0, -depth / 2);
  if (axis === 'y') {
    geo.rotateX(-Math.PI / 2);
  } else if (axis === 'x') {
    geo.rotateY(Math.PI / 2);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Machined rectangular plate (lengthX × widthZ × thicknessY) with circular through-bores
 * along X at z = 0, used for hollowed cylinder deck blocks and Multi-Layer Steel (MLS) head gaskets.
 */
export function createPunchedBorePlateGeometry(
  lengthX: number,
  widthZ: number,
  thicknessY: number,
  boreOffsetsX: number[],
  boreR: number,
  cornerRadius = 0.04,
  bevel = 0.008
): THREE.BufferGeometry {
  const hx = lengthX / 2;
  const hz = widthZ / 2;
  const r = Math.min(cornerRadius, hx * 0.4, hz * 0.4);
  const shape = new THREE.Shape();
  shape.moveTo(-hx + r, -hz);
  shape.lineTo(hx - r, -hz);
  shape.quadraticCurveTo(hx, -hz, hx, -hz + r);
  shape.lineTo(hx, hz - r);
  shape.quadraticCurveTo(hx, hz, hx - r, hz);
  shape.lineTo(-hx + r, hz);
  shape.quadraticCurveTo(-hx, hz, -hx, hz - r);
  shape.lineTo(-hx, -hz + r);
  shape.quadraticCurveTo(-hx, -hz, -hx + r, -hz);

  for (const bx of boreOffsetsX) {
    const hole = new THREE.Path();
    hole.absarc(bx, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const depth = Math.max(0.002, thicknessY - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 24,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevel > 0 ? 2 : 1,
  });
  geo.translate(0, 0, -depth / 2);
  // Shape X -> X, Shape Y -> -Z after rotateX(-PI/2), Extrude Z -> +Y
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Precision spur or helical gear geometry with trapezoidal involute-approximated teeth
 * and optional central bore, oriented along `axis`.
 */
export function createGearGeometry(
  pitchR: number,
  toothCount: number,
  faceWidth: number,
  helixDeg = 0,
  boreR = 0,
  axis: 'x' | 'y' | 'z' = 'x'
): THREE.BufferGeometry {
  const teeth = Math.max(8, Math.round(toothCount));
  const toothH = Math.min(pitchR * 0.24, (2 * Math.PI * pitchR) / (teeth * 1.45));
  const rootR = Math.max(boreR + 0.015, pitchR - toothH * 0.55);
  const tipR = pitchR + toothH * 0.45;
  const stepAng = (Math.PI * 2) / teeth;

  const shape = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = i * stepAng;
    const a1 = a0 + stepAng * 0.16;
    const a2 = a0 + stepAng * 0.30;
    const a3 = a0 + stepAng * 0.52;
    const a4 = a0 + stepAng * 0.66;

    const p0x = Math.cos(a0) * rootR;
    const p0y = Math.sin(a0) * rootR;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
    shape.lineTo(Math.cos(a2) * tipR, Math.sin(a2) * tipR);
    shape.lineTo(Math.cos(a3) * tipR, Math.sin(a3) * tipR);
    shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
  }
  shape.closePath();

  if (boreR > 0.002 && boreR < rootR - 0.004) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const hasHelix = Math.abs(helixDeg) > 0.5;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: faceWidth,
    steps: hasHelix ? 6 : 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: Math.min(0.006, faceWidth * 0.1),
    bevelSize: Math.min(0.005, toothH * 0.12),
    bevelSegments: 1,
  });
  geo.translate(0, 0, -faceWidth / 2);

  if (hasHelix) {
    const pos = geo.attributes.position;
    const twistRate = Math.tan(THREE.MathUtils.degToRad(helixDeg)) / Math.max(0.05, pitchR);
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const dTheta = vz * twistRate;
      const c = Math.cos(dTheta);
      const s = Math.sin(dTheta);
      pos.setXY(i, vx * c - vy * s, vx * s + vy * c);
    }
    pos.needsUpdate = true;
  }

  if (axis === 'x') {
    geo.rotateY(Math.PI / 2);
  } else if (axis === 'y') {
    geo.rotateX(-Math.PI / 2);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Multi-spline shaft segment (e.g. 26-spline input, 31-spline output, 33-spline EV halfshaft).
 */
export function createSplinedShaftGeometry(
  outerR: number,
  rootR: number,
  splines: number,
  length: number,
  axis: 'x' | 'y' | 'z' = 'x'
): THREE.BufferGeometry {
  const n = Math.max(8, Math.round(splines));
  const step = (Math.PI * 2) / n;
  const shape = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.34;
    const a3 = a0 + step * 0.56;
    const a4 = a0 + step * 0.68;
    const x0 = Math.cos(a0) * rootR;
    const y0 = Math.sin(a0) * rootR;
    if (i === 0) shape.moveTo(x0, y0);
    else shape.lineTo(x0, y0);
    shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
    shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    steps: 1,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: Math.min(0.01, length * 0.08),
    bevelSize: (outerR - rootR) * 0.25,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -length / 2);
  if (axis === 'x') geo.rotateY(Math.PI / 2);
  else if (axis === 'y') geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Hex-head flange bolt geometry aligned along +Y (head top at +headH, washer base at 0).
 */
export function createHexFlangeBoltGeometry(
  hexRadius: number,
  headHeight: number
): THREE.BufferGeometry {
  const washerR = hexRadius * 1.32;
  const washerH = headHeight * 0.24;
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * hexRadius;
    const y = Math.sin(a) * hexRadius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hexGeo = new THREE.ExtrudeGeometry(shape, {
    depth: headHeight - washerH,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: headHeight * 0.1,
    bevelSize: hexRadius * 0.08,
    bevelSegments: 1,
  });
  hexGeo.rotateX(-Math.PI / 2);
  hexGeo.translate(0, washerH, 0);

  // Merge hex head and circular flange washer into one indexed-free BufferGeometry
  const washerGeo = new THREE.CylinderGeometry(washerR, washerR, washerH, 16);
  washerGeo.translate(0, washerH * 0.5, 0);

  const g1 = hexGeo.toNonIndexed();
  const g2 = washerGeo.toNonIndexed();
  const p1 = g1.attributes.position.array as Float32Array;
  const p2 = g2.attributes.position.array as Float32Array;
  const n1 = g1.attributes.normal.array as Float32Array;
  const n2 = g2.attributes.normal.array as Float32Array;

  const mergedPos = new Float32Array(p1.length + p2.length);
  mergedPos.set(p1, 0);
  mergedPos.set(p2, p1.length);

  const mergedNorm = new Float32Array(n1.length + n2.length);
  mergedNorm.set(n1, 0);
  mergedNorm.set(n2, n1.length);

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));

  hexGeo.dispose();
  washerGeo.dispose();
  g1.dispose();
  g2.dispose();
  return out;
}

/**
 * Threaded stud shank with machined helical/annular thread ribs via LatheGeometry along Y.
 */
export function createThreadedStudGeometry(
  radius: number,
  length: number,
  threadCount = 10
): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const half = length / 2;
  const threadZone = length * 0.48;
  pts.push(new THREE.Vector2(radius * 0.78, -half));
  pts.push(new THREE.Vector2(radius, -half + 0.008));
  pts.push(new THREE.Vector2(radius, half - threadZone));
  for (let i = 0; i < threadCount; i++) {
    const y0 = half - threadZone + (i / threadCount) * threadZone;
    const yMid = half - threadZone + ((i + 0.5) / threadCount) * threadZone;
    pts.push(new THREE.Vector2(radius * 0.82, y0));
    pts.push(new THREE.Vector2(radius * 1.04, yMid));
  }
  pts.push(new THREE.Vector2(radius * 0.82, half - 0.004));
  pts.push(new THREE.Vector2(0.001, half));
  const geo = new THREE.LatheGeometry(pts, 14);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Cambered asymmetric airfoil extruded along Z (`span`), chord along X.
 */
export function createCamberedAirfoilGeometry(
  chord: number,
  thicknessRatio: number,
  camberRatio: number,
  span: number
): THREE.BufferGeometry {
  const samples = 24;
  const shape = new THREE.Shape();
  const halfC = chord / 2;
  const ptsUpper: THREE.Vector2[] = [];
  const ptsLower: THREE.Vector2[] = [];

  for (let i = 0; i <= samples; i++) {
    const beta = (i / samples) * Math.PI;
    const t = 0.5 * (1 - Math.cos(beta)); // cosine clustering at LE/TE
    const x = -halfC + t * chord;
    const yt =
      5 *
      thicknessRatio *
      chord *
      (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * t * t * t * t);
    const yc = camberRatio * chord * 4 * t * (1 - t);
    ptsUpper.push(new THREE.Vector2(x, yc + yt));
    ptsLower.push(new THREE.Vector2(x, yc - yt));
  }

  shape.moveTo(ptsUpper[0].x, ptsUpper[0].y);
  for (let i = 1; i < ptsUpper.length; i++) shape.lineTo(ptsUpper[i].x, ptsUpper[i].y);
  for (let i = ptsLower.length - 1; i >= 0; i--) shape.lineTo(ptsLower[i].x, ptsLower[i].y);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: span,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -span / 2);
  geo.computeVertexNormals();
  return geo;
}
