/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Procedural Canvas Textures (Zero-404, Performance CAD Surface Finishes)
 */
export interface ProceduralTextureSet {
  castIronBump: THREE.CanvasTexture;
  castIronNormal: THREE.CanvasTexture;
  crosshatchHone: THREE.CanvasTexture;
  machinedSwirl: THREE.CanvasTexture;
  machinedNormal: THREE.CanvasTexture;
  boltThreadBump: THREE.CanvasTexture;
  pistonSkirtMoly: THREE.CanvasTexture;
  harmonicTimingTape: THREE.CanvasTexture;
  blueprintScaleMap: THREE.CanvasTexture;
  braidedSteelMap: THREE.CanvasTexture;
  studioFloorShadowMap: THREE.CanvasTexture;
  radiatorCoreMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Sand-cast iron micro-grain bump/roughness map
  const castCanvas = document.createElement('canvas');
  castCanvas.width = 256;
  castCanvas.height = 256;
  const castCtx = castCanvas.getContext('2d')!;
  const imgData = castCtx.createImageData(256, 256);
  for (let i = 0; i < imgData.data.length; i += 4) {
    // Deterministic pseudo-random grain
    const p = i / 4;
    const n = ((Math.sin(p * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1;
    const v = Math.floor(110 + n * 70);
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  castCtx.putImageData(imgData, 0, 0);
  const castIronBump = new THREE.CanvasTexture(castCanvas);
  castIronBump.wrapS = THREE.RepeatWrapping;
  castIronBump.wrapT = THREE.RepeatWrapping;
  castIronBump.repeat.set(4, 4);
  castIronBump.anisotropy = maxAnisotropy;

  // 1B. Sand-Cast Tangent-Space Normal Map derived from granular heightfield
  const castNormCanvas = document.createElement('canvas');
  castNormCanvas.width = 256;
  castNormCanvas.height = 256;
  const cnCtx = castNormCanvas.getContext('2d')!;
  const cnData = cnCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const idxR = (y * 256 + ((x + 1) & 255)) * 4;
      const idxD = (((y + 1) & 255) * 256 + x) * 4;
      const hL = imgData.data[idx] / 255;
      const hR = imgData.data[idxR] / 255;
      const hD = imgData.data[idxD] / 255;
      const dx = (hL - hR) * 2.2;
      const dy = (hL - hD) * 2.2;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      cnData.data[idx] = Math.floor((dx * invLen * 0.5 + 0.5) * 255);
      cnData.data[idx + 1] = Math.floor((dy * invLen * 0.5 + 0.5) * 255);
      cnData.data[idx + 2] = Math.floor((dz * invLen * 0.5 + 0.5) * 255);
      cnData.data[idx + 3] = 255;
    }
  }
  cnCtx.putImageData(cnData, 0, 0);
  const castIronNormal = new THREE.CanvasTexture(castNormCanvas);
  castIronNormal.wrapS = THREE.RepeatWrapping;
  castIronNormal.wrapT = THREE.RepeatWrapping;
  castIronNormal.repeat.set(5, 5);
  castIronNormal.anisotropy = maxAnisotropy;

  // 2. High-DPI 45-degree cylinder bore CBN plateau crosshatch hone pattern
  const honeCanvas = document.createElement('canvas');
  honeCanvas.width = 512;
  honeCanvas.height = 512;
  const honeCtx = honeCanvas.getContext('2d')!;
  const honeGrad = honeCtx.createLinearGradient(0, 0, 0, 512);
  honeGrad.addColorStop(0, '#788496');
  honeGrad.addColorStop(0.15, '#94a3b8');
  honeGrad.addColorStop(0.5, '#64748b');
  honeGrad.addColorStop(0.85, '#8592a3');
  honeGrad.addColorStop(1, '#586475');
  honeCtx.fillStyle = honeGrad;
  honeCtx.fillRect(0, 0, 512, 512);
  honeCtx.strokeStyle = 'rgba(241, 245, 249, 0.42)';
  honeCtx.lineWidth = 1.4;
  for (let i = -512; i < 1024; i += 14) {
    honeCtx.beginPath();
    honeCtx.moveTo(i, 0);
    honeCtx.lineTo(i + 512, 512);
    honeCtx.stroke();
    honeCtx.beginPath();
    honeCtx.moveTo(i + 512, 0);
    honeCtx.lineTo(i, 512);
    honeCtx.stroke();
  }
  // Fine secondary plateau polish grooves
  honeCtx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
  honeCtx.lineWidth = 0.8;
  for (let i = -512; i < 1024; i += 28) {
    honeCtx.beginPath();
    honeCtx.moveTo(i + 7, 0);
    honeCtx.lineTo(i + 519, 512);
    honeCtx.stroke();
  }
  const crosshatchHone = new THREE.CanvasTexture(honeCanvas);
  crosshatchHone.colorSpace = THREE.SRGBColorSpace;
  crosshatchHone.wrapS = THREE.RepeatWrapping;
  crosshatchHone.wrapT = THREE.RepeatWrapping;
  crosshatchHone.repeat.set(3, 2);
  crosshatchHone.anisotropy = maxAnisotropy;

  // 3. CNC Fly-Cut / Brushed Aluminum Machined Deck Swirl
  const swirlCanvas = document.createElement('canvas');
  swirlCanvas.width = 256;
  swirlCanvas.height = 256;
  const swirlCtx = swirlCanvas.getContext('2d')!;
  swirlCtx.fillStyle = '#cbd5e1';
  swirlCtx.fillRect(0, 0, 256, 256);
  swirlCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  swirlCtx.lineWidth = 1;
  for (let y = 0; y < 256; y += 6) {
    swirlCtx.beginPath();
    swirlCtx.arc(128, y, 90, 0, Math.PI, false);
    swirlCtx.stroke();
  }
  const machinedSwirl = new THREE.CanvasTexture(swirlCanvas);
  machinedSwirl.colorSpace = THREE.SRGBColorSpace;
  machinedSwirl.wrapS = THREE.RepeatWrapping;
  machinedSwirl.wrapT = THREE.RepeatWrapping;
  machinedSwirl.repeat.set(2, 2);
  machinedSwirl.anisotropy = maxAnisotropy;

  // 3B. CNC Fly-Cut Normal Map for Realistic Grazing Specular Highlights
  const mnCanvas = document.createElement('canvas');
  mnCanvas.width = 256;
  mnCanvas.height = 256;
  const mnCtx = mnCanvas.getContext('2d')!;
  const mnImg = mnCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const dist = Math.hypot(x - 128, y - 128);
      const groove = Math.sin(dist * 0.95) * 0.25 + Math.sin(y * 1.4) * 0.12;
      const dx = ((x - 128) / Math.max(1, dist)) * groove;
      const dy = ((y - 128) / Math.max(1, dist)) * groove;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      mnImg.data[idx] = Math.floor((dx * invLen * 0.5 + 0.5) * 255);
      mnImg.data[idx + 1] = Math.floor((dy * invLen * 0.5 + 0.5) * 255);
      mnImg.data[idx + 2] = Math.floor((dz * invLen * 0.5 + 0.5) * 255);
      mnImg.data[idx + 3] = 255;
    }
  }
  mnCtx.putImageData(mnImg, 0, 0);
  const machinedNormal = new THREE.CanvasTexture(mnCanvas);
  machinedNormal.wrapS = THREE.RepeatWrapping;
  machinedNormal.wrapT = THREE.RepeatWrapping;
  machinedNormal.repeat.set(3, 3);
  machinedNormal.anisotropy = maxAnisotropy;

  // 3C. Helical Fastener Thread Bump Map
  const thCanvas = document.createElement('canvas');
  thCanvas.width = 128;
  thCanvas.height = 128;
  const thCtx = thCanvas.getContext('2d')!;
  thCtx.fillStyle = '#404040';
  thCtx.fillRect(0, 0, 128, 128);
  for (let y = -32; y < 160; y += 8) {
    thCtx.strokeStyle = '#e5e5e5';
    thCtx.lineWidth = 3.2;
    thCtx.beginPath();
    thCtx.moveTo(0, y);
    thCtx.lineTo(128, y + 12);
    thCtx.stroke();
  }
  const boltThreadBump = new THREE.CanvasTexture(thCanvas);
  boltThreadBump.wrapS = THREE.RepeatWrapping;
  boltThreadBump.wrapT = THREE.RepeatWrapping;
  boltThreadBump.repeat.set(1, 5);
  boltThreadBump.anisotropy = maxAnisotropy;

  // 3D. Forged Piston PTFE/Moly Skirt Coating Map
  const skCanvas = document.createElement('canvas');
  skCanvas.width = 256;
  skCanvas.height = 256;
  const skCtx = skCanvas.getContext('2d')!;
  skCtx.fillStyle = '#d8dee6';
  skCtx.fillRect(0, 0, 256, 256);
  skCtx.fillStyle = '#262b33';
  skCtx.fillRect(28, 118, 72, 112);
  skCtx.fillRect(156, 118, 72, 112);
  skCtx.strokeStyle = '#475569';
  skCtx.lineWidth = 2;
  for (let l = 126; l < 224; l += 8) {
    skCtx.beginPath();
    skCtx.moveTo(32, l);
    skCtx.lineTo(96, l);
    skCtx.moveTo(160, l);
    skCtx.lineTo(224, l);
    skCtx.stroke();
  }
  const pistonSkirtMoly = new THREE.CanvasTexture(skCanvas);
  pistonSkirtMoly.colorSpace = THREE.SRGBColorSpace;
  pistonSkirtMoly.anisotropy = maxAnisotropy;

  // 4. SFI Harmonic Balancer Timing Degree Tape (0-50 BTDC / ATDC)
  const tapeCanvas = document.createElement('canvas');
  tapeCanvas.width = 1024;
  tapeCanvas.height = 128;
  const tapeCtx = tapeCanvas.getContext('2d')!;
  tapeCtx.fillStyle = '#0f172a';
  tapeCtx.fillRect(0, 0, 1024, 128);
  tapeCtx.strokeStyle = '#f8fafc';
  tapeCtx.fillStyle = '#f8fafc';
  tapeCtx.font = 'bold 18px monospace';
  tapeCtx.textAlign = 'center';
  for (let deg = 0; deg < 360; deg += 2) {
    const x = (deg / 360) * 1024;
    const isMajor = deg % 10 === 0;
    const isTDC = deg === 0 || deg === 90 || deg === 180 || deg === 270;
    tapeCtx.strokeStyle = isTDC ? '#f97316' : isMajor ? '#38bdf8' : '#94a3b8';
    tapeCtx.lineWidth = isMajor ? 3 : 1.5;
    tapeCtx.beginPath();
    tapeCtx.moveTo(x, 128);
    tapeCtx.lineTo(x, isMajor ? 58 : 88);
    tapeCtx.stroke();
    if (deg <= 50 && deg % 10 === 0) {
      tapeCtx.fillStyle = deg === 0 ? '#f97316' : '#f8fafc';
      tapeCtx.fillText(`${deg}°`, x, 40);
    } else if (deg === 90 || deg === 180 || deg === 270) {
      tapeCtx.fillStyle = '#38bdf8';
      tapeCtx.fillText(`TDC`, x, 40);
    }
  }
  const harmonicTimingTape = new THREE.CanvasTexture(tapeCanvas);
  harmonicTimingTape.colorSpace = THREE.SRGBColorSpace;
  harmonicTimingTape.wrapS = THREE.RepeatWrapping;
  harmonicTimingTape.anisotropy = maxAnisotropy;

  // 5. Technical CAD Floor Stage Reticle & Datum Grid
  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = 512;
  stageCanvas.height = 512;
  const sCtx = stageCanvas.getContext('2d')!;
  sCtx.clearRect(0, 0, 512, 512);
  const grad = sCtx.createRadialGradient(256, 256, 20, 256, 256, 250);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.65, 'rgba(6, 18, 28, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 512, 512);

  sCtx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  sCtx.lineWidth = 1.5;
  [120, 185, 240].forEach((r) => {
    sCtx.beginPath();
    sCtx.arc(256, 256, r, 0, Math.PI * 2);
    sCtx.stroke();
  });
  // Degree ticks around outer datum circle
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    const r1 = a % 45 === 0 ? 226 : 233;
    sCtx.beginPath();
    sCtx.moveTo(256 + Math.cos(rad) * r1, 256 + Math.sin(rad) * r1);
    sCtx.lineTo(256 + Math.cos(rad) * 240, 256 + Math.sin(rad) * 240);
    sCtx.stroke();
  }
  const blueprintScaleMap = new THREE.CanvasTexture(stageCanvas);
  blueprintScaleMap.colorSpace = THREE.SRGBColorSpace;
  blueprintScaleMap.anisotropy = maxAnisotropy;

  // 6. Stainless-Steel Braided AN Fuel / High-Voltage Hose Weave
  const braidCanvas = document.createElement('canvas');
  braidCanvas.width = 128;
  braidCanvas.height = 128;
  const bCtx = braidCanvas.getContext('2d')!;
  bCtx.fillStyle = '#475569';
  bCtx.fillRect(0, 0, 128, 128);
  for (let i = -128; i < 256; i += 12) {
    bCtx.strokeStyle = '#e2e8f0';
    bCtx.lineWidth = 4.2;
    bCtx.beginPath();
    bCtx.moveTo(i, 0);
    bCtx.lineTo(i + 128, 128);
    bCtx.stroke();

    bCtx.strokeStyle = '#94a3b8';
    bCtx.lineWidth = 2.6;
    bCtx.beginPath();
    bCtx.moveTo(i + 128, 0);
    bCtx.lineTo(i, 128);
    bCtx.stroke();
  }
  const braidedSteelMap = new THREE.CanvasTexture(braidCanvas);
  braidedSteelMap.colorSpace = THREE.SRGBColorSpace;
  braidedSteelMap.wrapS = THREE.RepeatWrapping;
  braidedSteelMap.wrapT = THREE.RepeatWrapping;
  braidedSteelMap.repeat.set(16, 3);
  braidedSteelMap.anisotropy = maxAnisotropy;

  // 7. Soft Studio Cyclorama Floor Contact Shadow & Clean Showroom Grid
  const studioCanvas = document.createElement('canvas');
  studioCanvas.width = 512;
  studioCanvas.height = 512;
  const stCtx = studioCanvas.getContext('2d')!;
  stCtx.clearRect(0, 0, 512, 512);
  const stGrad = stCtx.createRadialGradient(256, 256, 30, 256, 256, 248);
  stGrad.addColorStop(0, 'rgba(15, 23, 42, 0.24)');
  stGrad.addColorStop(0.55, 'rgba(30, 41, 59, 0.10)');
  stGrad.addColorStop(1, 'rgba(203, 213, 225, 0)');
  stCtx.fillStyle = stGrad;
  stCtx.fillRect(0, 0, 512, 512);

  stCtx.strokeStyle = 'rgba(100, 116, 139, 0.16)';
  stCtx.lineWidth = 1;
  [130, 195, 245].forEach((r) => {
    stCtx.beginPath();
    stCtx.arc(256, 256, r, 0, Math.PI * 2);
    stCtx.stroke();
  });
  const studioFloorShadowMap = new THREE.CanvasTexture(studioCanvas);
  studioFloorShadowMap.colorSpace = THREE.SRGBColorSpace;
  studioFloorShadowMap.anisotropy = maxAnisotropy;

  // 8. TIG-Welded Aluminum Crossflow Radiator Core Fin Louvers
  const radCanvas = document.createElement('canvas');
  radCanvas.width = 256;
  radCanvas.height = 256;
  const rCtx = radCanvas.getContext('2d')!;
  rCtx.fillStyle = '#94a3b8';
  rCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) {
    rCtx.fillStyle = '#cbd5e1';
    rCtx.fillRect(0, y, 256, 3);
    rCtx.fillStyle = '#334155';
    rCtx.fillRect(0, y + 4, 256, 2);
  }
  rCtx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
  rCtx.lineWidth = 1.2;
  for (let x = 0; x < 256; x += 6) {
    rCtx.beginPath();
    rCtx.moveTo(x, 0);
    rCtx.lineTo(x + 3, 256);
    rCtx.stroke();
  }
  const radiatorCoreMap = new THREE.CanvasTexture(radCanvas);
  radiatorCoreMap.colorSpace = THREE.SRGBColorSpace;
  radiatorCoreMap.wrapS = THREE.RepeatWrapping;
  radiatorCoreMap.wrapT = THREE.RepeatWrapping;
  radiatorCoreMap.repeat.set(3, 3);
  radiatorCoreMap.anisotropy = maxAnisotropy;

  return {
    castIronBump,
    castIronNormal,
    crosshatchHone,
    machinedSwirl,
    machinedNormal,
    boltThreadBump,
    pistonSkirtMoly,
    harmonicTimingTape,
    blueprintScaleMap,
    braidedSteelMap,
    studioFloorShadowMap,
    radiatorCoreMap,
    dispose: () => {
      castIronBump.dispose();
      castIronNormal.dispose();
      crosshatchHone.dispose();
      machinedSwirl.dispose();
      machinedNormal.dispose();
      boltThreadBump.dispose();
      pistonSkirtMoly.dispose();
      harmonicTimingTape.dispose();
      blueprintScaleMap.dispose();
      braidedSteelMap.dispose();
      studioFloorShadowMap.dispose();
      radiatorCoreMap.dispose();
    }
  };
}

/**
 * Generates an ARP 12-Point Flange Bolt Mesh (performance racing fastener)
 */
export function createARP12PointBolt(
  radius: number,
  shankLength: number,
  mat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  // Hardened chamfered washer
  const washer = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.98, radius * 2.08, radius * 0.28, 20),
    mat
  );
  washer.position.y = -radius * 0.14;
  // 12-point flange seat + scalloped 12-pt wrenching head
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.48, radius * 1.82, radius * 0.24, 18),
    mat
  );
  flange.position.y = radius * 0.10;
  const head12 = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.38, radius * 1.44, radius * 0.85, 12),
    mat
  );
  head12.position.y = radius * 0.58;
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.05, radius * 1.38, radius * 0.2, 12),
    mat
  );
  collar.position.y = radius * 1.08;
  // Undercut shank + rolled thread ribs on lower 65%
  const shank = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, shankLength, 14),
    mat
  );
  shank.position.y = -shankLength / 2 - radius * 0.28;
  const threadPitch = Math.max(0.032, radius * 0.42);
  const threadStart = -shankLength * 0.36 - radius * 0.28;
  const threadEnd = -shankLength - radius * 0.24;
  for (let ty = threadStart; ty >= threadEnd; ty -= threadPitch) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.96, radius * 0.085, 6, 12),
      mat
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.y = ty;
    g.add(rib);
  }
  g.add(washer, flange, head12, collar, shank);
  return g;
}

/**
 * Generates an extruded gear or timing sprocket geometry with real involute-style teeth
 */
export function createGearGeometry(
  pitchRadius: number,
  teeth: number,
  thickness: number,
  boreRadius: number,
  toothDepth = 0.14
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const innerR = pitchRadius - toothDepth * 0.55;
  const outerR = pitchRadius + toothDepth * 0.45;
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.34;
    const a3 = a0 + step * 0.62;
    const a4 = a0 + step * 0.74;

    if (i === 0) {
      shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    } else {
      shape.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    }
    shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
    shape.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  shape.closePath();

  if (boreRadius > 0.05) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: Math.min(0.03, thickness * 0.12),
    bevelSize: Math.min(0.025, toothDepth * 0.2),
    bevelSegments: 2,
    curveSegments: 16
  });
  geo.center();
  return geo;
}

/**
 * Generates an extruded cam lobe profile (base circle + symmetric nose lift)
 */
export function createCamLobeGeometry(
  baseRadius: number,
  lift: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const segments = 36;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    // Nose centered at +Y (theta = PI/2) with smooth cosine ramp over ~130 deg duration
    const angleDiff = Math.atan2(Math.sin(theta - Math.PI / 2), Math.cos(theta - Math.PI / 2));
    const rampHalf = 1.12;
    let r = baseRadius;
    if (Math.abs(angleDiff) < rampHalf) {
      const t = Math.cos((angleDiff / rampHalf) * (Math.PI / 2));
      r += lift * t * t;
    }
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2
  });
  geo.center();
  return geo;
}

/**
 * Generates a teardrop / knife-edged 4340 forged crankshaft counterweight
 */
export function createCounterweightGeometry(
  radius: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-radius * 0.42, 0.25);
  shape.quadraticCurveTo(-radius * 0.95, -0.35, -radius * 0.72, -radius * 0.85);
  shape.quadraticCurveTo(0, -radius * 1.18, radius * 0.72, -radius * 0.85);
  shape.quadraticCurveTo(radius * 0.95, -0.35, radius * 0.42, 0.25);
  shape.quadraticCurveTo(0, 0.55, -radius * 0.42, 0.25);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

/**
 * Generates a true helical coil valve spring using TubeGeometry
 */
export function createHelicalSpringGeometry(
  coilRadius: number,
  wireRadius: number,
  height: number,
  turns: number
): THREE.TubeGeometry {
  const points: THREE.Vector3[] = [];
  const steps = turns * 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    // Closed end coils at bottom and top
    let yNorm = t;
    if (t < 0.08) yNorm = t * 0.4;
    else if (t > 0.92) yNorm = 1 - (1 - t) * 0.4;
    else yNorm = 0.032 + ((t - 0.08) / 0.84) * 0.936;

    points.push(
      new THREE.Vector3(
        Math.cos(angle) * coilRadius,
        (yNorm - 0.5) * height,
        Math.sin(angle) * coilRadius
      )
    );
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, steps, wireRadius, 8, false);
}

/**
 * Generates a 4340 Forged H-Beam Connecting Rod with machined beam pocket,
 * bronze wrist pin eye, and split 2-bolt big-end cap.
 */
export function createHBeamConnectingRod(
  centerToCenter: number,
  bigEndRadius: number,
  smallEndRadius: number,
  rodMat: THREE.Material,
  bronzeMat: THREE.Material,
  boltMat: THREE.Material
): THREE.Group {
  const rodGroup = new THREE.Group();

  // Origin (0,0,0) = Big-End Crankpin Center; Small-End Wrist Pin Center = (0, centerToCenter, 0)
  // 1. Tapered Forged H-Beam Shank Flanges + Recessed Web + CNC Pocket Ribs
  const beamLen = Math.max(0.6, centerToCenter - bigEndRadius * 0.72 - smallEndRadius * 0.72);
  const beamMidY = bigEndRadius * 0.72 + beamLen / 2;

  const web = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, beamLen, 0.11),
    rodMat
  );
  web.position.y = beamMidY;
  rodGroup.add(web);

  // Tapered Left & Right H-beam structural flanges (wider near big end)
  [-0.14, 0.14].forEach((xOff, sIdx) => {
    const flange = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, beamLen, 0.36),
      rodMat
    );
    flange.position.set(xOff, beamMidY, 0);
    flange.rotation.z = (sIdx === 0 ? -1 : 1) * 0.032;
    rodGroup.add(flange);
  });

  // Big-End Transitional Shoulder Gussets + Center Oil Squirt Boss
  [-0.22, 0.22].forEach((gx) => {
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.34), rodMat);
    gusset.position.set(gx, bigEndRadius * 1.18, 0);
    gusset.rotation.z = gx > 0 ? -0.35 : 0.35;
    rodGroup.add(gusset);
  });

  // 2. Small-End Eye, Bronze Bushing + Top Pin Oiling Hole
  const smallEnd = new THREE.Mesh(
    new THREE.CylinderGeometry(smallEndRadius * 1.48, smallEndRadius * 1.48, 0.42, 24),
    rodMat
  );
  smallEnd.rotation.x = Math.PI / 2;
  smallEnd.position.y = centerToCenter;
  rodGroup.add(smallEnd);

  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(smallEndRadius * 1.06, smallEndRadius * 1.06, 0.44, 20, 1, true),
    bronzeMat
  );
  bushing.rotation.x = Math.PI / 2;
  bushing.position.y = centerToCenter;
  rodGroup.add(bushing);

  const oilHoleRim = new THREE.Mesh(
    new THREE.CylinderGeometry(smallEndRadius * 0.22, smallEndRadius * 0.22, 0.08, 12),
    boltMat
  );
  oilHoleRim.position.set(0, centerToCenter + smallEndRadius * 1.45, 0);
  rodGroup.add(oilHoleRim);

  // 3. Big-End Housing + Split Precision Cap + Copper-Lead Bearing Shell Liner
  const bigHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(bigEndRadius * 1.42, bigEndRadius * 1.42, 0.46, 28, 1, false, -Math.PI * 0.1, Math.PI * 1.2),
    rodMat
  );
  bigHousing.rotation.x = Math.PI / 2;
  bigHousing.rotation.y = Math.PI * 0.4;
  rodGroup.add(bigHousing);

  const bigCap = new THREE.Mesh(
    new THREE.CylinderGeometry(bigEndRadius * 1.42, bigEndRadius * 1.42, 0.46, 28),
    rodMat
  );
  bigCap.rotation.x = Math.PI / 2;
  rodGroup.add(bigCap);

  // Clevite Tri-Metal Bearing Shell inside Big-End Bore + Oil Groove
  const bearingShell = new THREE.Mesh(
    new THREE.CylinderGeometry(bigEndRadius * 1.01, bigEndRadius * 1.01, 0.40, 24, 1, true),
    bronzeMat
  );
  bearingShell.rotation.x = Math.PI / 2;
  rodGroup.add(bearingShell);

  // Parting-line witness seam + cap stiffening rib
  const capRib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.48), rodMat);
  capRib.position.set(0, -bigEndRadius * 1.46, 0);
  rodGroup.add(capRib);

  // Bolt bosses + Twin ARP 2000 12-pt cap screws + cap dowel collars
  [-bigEndRadius * 1.32, bigEndRadius * 1.32].forEach((xOff) => {
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.58, 0.44), rodMat);
    boss.position.set(xOff, -0.05, 0);
    rodGroup.add(boss);

    const partingSeam = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.025, 0.47), boltMat);
    partingSeam.position.set(xOff, 0, 0);
    rodGroup.add(partingSeam);

    const bolt = createARP12PointBolt(0.068, 0.54, boltMat);
    bolt.position.set(xOff, -0.35, 0);
    bolt.rotation.x = Math.PI;
    rodGroup.add(bolt);
  });

  return rodGroup;
}

/**
 * Generates an SBC 90-degree V8 cast-iron block cross-section extruded along Z
 */
export function createV8BlockProfileGeometry(lengthZ: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  // Cross-section in XY plane (90-degree V banks + deep skirt oil pan rail)
  shape.moveTo(-2.7, -2.55); // Left pan rail
  shape.lineTo(2.7, -2.55);  // Right pan rail
  shape.lineTo(3.1, -1.3);
  shape.lineTo(4.25, 0.25);  // Right bank lower water jacket
  shape.lineTo(2.15, 2.35);  // Right cylinder deck outer edge
  shape.lineTo(0.85, 1.45);  // Lifter valley right edge
  shape.lineTo(-0.85, 1.45); // Lifter valley left edge
  shape.lineTo(-2.15, 2.35); // Left cylinder deck outer edge
  shape.lineTo(-4.25, 0.25); // Left bank lower water jacket
  shape.lineTo(-3.1, -1.3);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthZ,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 2
  });
  geo.translate(0, 0, -lengthZ / 2);
  return geo;
}

/**
 * Generates an extruded Billet Roller Rocker Arm with fulcrum & roller tip
 */
export function createRollerRockerGroup(
  bodyMat: THREE.Material,
  steelMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.46, -0.14);
  shape.lineTo(0.45, -0.1);
  shape.lineTo(0.54, 0.08);
  shape.lineTo(0.1, 0.19);
  shape.lineTo(-0.38, 0.15);
  shape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.025,
    bevelSegments: 2
  });
  bodyGeo.translate(0, 0, -0.14);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  g.add(body);

  // Side CNC lightening pocket ribs + pushrod cup socket
  const pushrodCup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.07, 0.12, 12),
    steelMat
  );
  pushrodCup.position.set(-0.34, -0.12, 0);
  g.add(pushrodCup);

  // Trunnion needle-bearing shaft + twin retaining snap rings
  const trunnion = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.38, 16), steelMat);
  trunnion.rotation.x = Math.PI / 2;
  g.add(trunnion);

  [-0.19, 0.19].forEach((sz) => {
    const snapRing = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 16), steelMat);
    snapRing.position.z = sz;
    g.add(snapRing);
  });

  // Stepped Billet Polylock + internal Allen set screw
  const polylock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 6), steelMat);
  polylock.position.y = 0.22;
  g.add(polylock);

  const setScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 6), steelMat);
  setScrew.position.y = 0.35;
  g.add(setScrew);

  // Roller tip wheel + hardened dowel axle pin + side tip forks
  const rollerTip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 18), steelMat);
  rollerTip.rotation.x = Math.PI / 2;
  rollerTip.position.set(0.47, -0.05, 0);
  g.add(rollerTip);

  const tipAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.31, 12), steelMat);
  tipAxle.rotation.x = Math.PI / 2;
  tipAxle.position.set(0.47, -0.05, 0);
  g.add(tipAxle);

  return g;
}

/**
 * Adds crisp technical CAD EdgesGeometry linework to a mesh or group for
 * Technical Drawing / Blueprint rendering mode.
 */
export function applyTechnicalEdges(
  root: THREE.Object3D,
  lineMaterial: THREE.LineBasicMaterial,
  thresholdAngle = 22
): THREE.LineSegments[] {
  const created: THREE.LineSegments[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      // Skip tiny/high-poly tubes like helical springs or wires to keep drawing clean
      const vertexCount = child.geometry.attributes.position?.count || 0;
      if (vertexCount > 2400) return;
      const edges = new THREE.EdgesGeometry(child.geometry, thresholdAngle);
      const lines = new THREE.LineSegments(edges, lineMaterial);
      lines.raycast = () => {}; // Never intercept CAD pointer raycasts
      child.add(lines);
      created.push(lines);
    }
  });
  return created;
}

/**
 * Generates a CNC-machined 60-2 Crankshaft Reluctor Trigger Wheel
 * (60 tooth positions around circumference with 2 consecutive teeth omitted at TDC index)
 */
export function createCrankTriggerWheelGeometry(
  pitchRadius: number,
  totalTeeth = 60,
  missingTeeth = 2,
  thickness = 0.22,
  boreRadius = 0.68
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const innerR = pitchRadius - 0.11;
  const outerR = pitchRadius + 0.09;
  const step = (Math.PI * 2) / totalTeeth;

  for (let i = 0; i < totalTeeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.24;
    const a2 = a0 + step * 0.34;
    const a3 = a0 + step * 0.66;
    const a4 = a0 + step * 0.76;
    const isGap = i >= totalTeeth - missingTeeth;
    const tipR = isGap ? innerR : outerR;

    if (i === 0) {
      shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    } else {
      shape.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    }
    shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    shape.lineTo(Math.cos(a2) * tipR, Math.sin(a2) * tipR);
    shape.lineTo(Math.cos(a3) * tipR, Math.sin(a3) * tipR);
    shape.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  // 4 lightening / mounting pockets
  for (let w = 0; w < 4; w++) {
    const ang = (w / 4) * Math.PI * 2 + Math.PI / 4;
    const wHole = new THREE.Path();
    const midR = (boreRadius + innerR) * 0.52;
    wHole.absarc(Math.cos(ang) * midR, Math.sin(ang) * midR, (innerR - boreRadius) * 0.22, 0, Math.PI * 2, true);
    shape.holes.push(wHole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 1,
    curveSegments: 16
  });
  geo.center();
  return geo;
}

/**
 * Generates a Heavy-Duty Vented High-Output Alternator / Generator with exposed
 * copper stator windings, slotted aluminum cooling frame, rear rectifier,
 * cooling fan, pulley, and CNC slotted billet bracket.
 */
export function createVentedAlternatorGroup(
  housingMat: THREE.Material,
  copperMat: THREE.Material,
  pulleyMat: THREE.Material,
  darkMat: THREE.Material,
  redMat: THREE.Material,
  boltMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // Exposed Copper Stator Core & Winding Stack (visible through case cooling slots)
  const statorCore = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.16, 0.72, 24),
    copperMat
  );
  statorCore.rotation.x = Math.PI / 2;
  g.add(statorCore);

  // Individual radial copper coil bridges along stator perimeter
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const coilSeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.14, 0.86),
      copperMat
    );
    coilSeg.position.set(Math.cos(a) * 1.12, Math.sin(a) * 1.12, 0);
    coilSeg.rotation.z = a;
    g.add(coilSeg);
  }

  // Front & Rear Slotted Cast Aluminum Frame Shells
  const frontShell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.38, 0.62, 24),
    housingMat
  );
  frontShell.rotation.x = Math.PI / 2;
  frontShell.position.z = 0.56;
  g.add(frontShell);

  const rearShell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.34, 1.24, 0.56, 24),
    housingMat
  );
  rearShell.rotation.x = Math.PI / 2;
  rearShell.position.z = -0.54;
  g.add(rearShell);

  // 8 Structural Aluminum Tie-Struts & Through-Bolts bridging front & rear shells
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.24, 1.45),
      housingMat
    );
    strut.position.set(Math.cos(a) * 1.28, Math.sin(a) * 1.28, 0.02);
    strut.rotation.z = a;
    g.add(strut);
  }

  // Mounting Ear Bosses (top & bottom pivot)
  const topEar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.9), housingMat);
  topEar.position.set(-0.85, 1.38, 0.15);
  const botEar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.9), housingMat);
  botEar.position.set(-0.85, -1.38, 0.15);
  g.add(topEar, botEar);

  // Internal Cooling Fan behind nose pulley
  for (let f = 0; f < 10; f++) {
    const a = (f / 10) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.14), pulleyMat);
    blade.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.95);
    blade.rotation.z = a + 0.35;
    g.add(blade);
  }

  // Front Multi-Rib Pulley + Center Nut
  const pulley = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.66, 0.46, 22),
    pulleyMat
  );
  pulley.rotation.x = Math.PI / 2;
  pulley.position.z = 1.22;
  g.add(pulley);

  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 6), boltMat);
  nut.rotation.x = Math.PI / 2;
  nut.position.z = 1.48;
  g.add(nut);

  // Rear Black Brush Regulator Housing + Red Insulated B+ Terminal Stud
  const rearCap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.08, 1.15, 0.38, 20),
    darkMat
  );
  rearCap.rotation.x = Math.PI / 2;
  rearCap.position.z = -0.96;
  g.add(rearCap);

  const bPlusBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.36, 12), redMat);
  bPlusBoot.rotation.x = Math.PI / 2;
  bPlusBoot.position.set(0.62, 0.45, -1.16);
  g.add(bPlusBoot);

  return g;
}

/**
 * Generates anSBC Deep-Sump Oil Pan, Gasket Rail, Perimeter Bolts, Drain Plug & Dipstick Tube
 */
export function createDetailedOilPanGroup(
  panMat: THREE.Material,
  gasketMat: THREE.Material,
  boltMat: THREE.Material,
  brassMat: THREE.Material,
  chromeMat: THREE.Material,
  handleMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // Oil pan perimeter rail flange (at y = -2.75)
  const flange = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.14, 11.65), panMat);
  flange.position.set(0, -2.78, 0);
  g.add(flange);

  const gasket = new THREE.Mesh(new THREE.BoxGeometry(5.72, 0.06, 11.72), gasketMat);
  gasket.position.set(0, -2.69, 0);
  g.add(gasket);

  // Contoured stepped sump shell (shallow front clearing steering linkage, deep rear sump)
  const frontShallow = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.95, 5.4), panMat);
  frontShallow.position.set(0, -3.28, 2.85);
  g.add(frontShallow);

  const deepSump = new THREE.Mesh(new THREE.BoxGeometry(4.85, 2.25, 6.2), panMat);
  deepSump.position.set(0, -3.92, -2.45);
  g.add(deepSump);

  // Sump floor cooling fins (3 longitudinal ribs)
  [-1.3, 0, 1.3].forEach((rx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 5.8), chromeMat);
    fin.position.set(rx, -5.06, -2.45);
    g.add(fin);
  });

  // Brass Magnetic Oil Drain Plug
  const drainPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 6), brassMat);
  drainPlug.rotation.x = Math.PI / 2;
  drainPlug.position.set(0.85, -4.75, -5.58);
  g.add(drainPlug);

  // 16 Pan Rail Bolts (8 per side)
  [-2.62, 2.62].forEach((bx) => {
    for (let i = 0; i < 8; i++) {
      const bz = -5.1 + i * 1.45;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 6), boltMat);
      b.position.set(bx, -2.92, bz);
      g.add(b);
    }
  });

  // Curved Chrome Engine Oil Dipstick Tube + Billet Handle (Driver Side)
  const dipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.65, -2.95, -2.2),
    new THREE.Vector3(-3.35, -1.85, -2.0),
    new THREE.Vector3(-3.85, 0.45, -1.6),
    new THREE.Vector3(-3.95, 2.55, -1.2)
  ]);
  const dipTube = new THREE.Mesh(new THREE.TubeGeometry(dipCurve, 18, 0.085, 8, false), chromeMat);
  g.add(dipTube);

  const dipHandle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.065, 8, 16), handleMat);
  dipHandle.position.set(-3.95, 2.78, -1.16);
  g.add(dipHandle);

  return g;
}

/**
 * Generates Contoured Aluminum Front Timing Chain Cover + Crank Seal + Timing Pointer Tab
 */
export function createTimingCoverGroup(
  alumMat: THREE.Material,
  sealMat: THREE.Material,
  boltMat: THREE.Material,
  pointerMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  const coverShape = new THREE.Shape();
  coverShape.moveTo(-2.35, -2.65);
  coverShape.lineTo(2.35, -2.65);
  coverShape.lineTo(2.55, -1.0);
  coverShape.lineTo(1.75, 2.45);
  coverShape.quadraticCurveTo(0, 2.95, -1.75, 2.45);
  coverShape.lineTo(-2.55, -1.0);
  coverShape.closePath();

  const coverGeo = new THREE.ExtrudeGeometry(coverShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2
  });
  coverGeo.translate(0, 0, -0.21);
  const coverMesh = new THREE.Mesh(coverGeo, alumMat);
  g.add(coverMesh);

  // Raised cam gear clearance dome
  const camDome = new THREE.Mesh(
    new THREE.CylinderGeometry(1.58, 1.72, 0.35, 24),
    alumMat
  );
  camDome.rotation.x = Math.PI / 2;
  camDome.position.set(0, 1.05, 0.25);
  g.add(camDome);

  // Front Crankshaft Harmonic Balancer Seal Housing + Lip Seal
  const sealBoss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.05, 0.45, 22),
    alumMat
  );
  sealBoss.rotation.x = Math.PI / 2;
  sealBoss.position.set(0, -1.0, 0.25);
  g.add(sealBoss);

  const lipSeal = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.11, 10, 24),
    sealMat
  );
  lipSeal.position.set(0, -1.0, 0.46);
  g.add(lipSeal);

  // Billet TDC Timing Pointer Tab pointing toward ATI Damper Degree Tape
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.55), pointerMat);
  pointer.position.set(-1.35, 0.22, 0.65);
  pointer.rotation.z = -0.52;
  g.add(pointer);

  // 10 Perimeter Fasteners
  const boltCoords: Array<[number, number]> = [
    [-2.05, -2.3], [0, -2.42], [2.05, -2.3],
    [-2.25, -0.9], [2.25, -0.9],
    [-1.85, 0.75], [1.85, 0.75],
    [-1.45, 2.25], [0, 2.55], [1.45, 2.25]
  ];
  boltCoords.forEach(([bx, by]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.56, 6), boltMat);
    b.rotation.x = Math.PI / 2;
    b.position.set(bx, by, 0.12);
    g.add(b);
  });

  return g;
}

/**
 * Generates Top-Mounted Intake & Exhaust Billet Solenoid Valve Actuators + Clear Waterproof Connectors + High-Voltage Braided Rail
 */
export function createSolenoidActuatorBank(
  side: number,
  billetMat: THREE.Material,
  copperMat: THREE.Material,
  clearConnMat: THREE.Material,
  braidedMat: THREE.Material,
  darkMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const zPositions = [-3.9, -1.3, 1.3, 3.9].map((z) => z + (side === 1 ? 0.22 : -0.22));

  // Two rows per head: Intake Solenoids (inner x = -side*0.58) & Exhaust Solenoids (outer x = side*0.58)
  [-side * 0.58, side * 0.58].forEach((rowX, rIdx) => {
    const railPts: THREE.Vector3[] = [];
    zPositions.forEach((zPos, cIdx) => {
      const actuator = new THREE.Group();
      actuator.position.set(rowX, 2.65, zPos);

      // CNC Billet Cylindrical Solenoid Canister
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.85, 18),
        billetMat
      );
      actuator.add(body);

      // Machined Copper Internal Coil Collar Ring
      const copperBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.375, 0.375, 0.14, 18),
        copperMat
      );
      copperBand.position.y = -0.18;
      actuator.add(copperBand);

      // Stepped Billet Top Cap + Mounting Base
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.36, 0.16, 18),
        billetMat
      );
      cap.position.y = 0.48;
      actuator.add(cap);

      const baseFlange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.44, 0.12, 16),
        darkMat
      );
      baseFlange.position.y = -0.44;
      actuator.add(baseFlange);

      // Clear Waterproof Deutsch Connector & Individual Control Leads
      const conn = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.30),
        clearConnMat
      );
      conn.position.set(-side * 0.32, 0.25, 0);
      actuator.add(conn);

      actuator.userData = {
        name: `${rIdx === 0 ? 'Intake' : 'Exhaust'} Solenoid Valve Actuator #${cIdx + 1} (${side === 1 ? 'Right' : 'Left'})`,
        category: 'Electromagnetic Valvetrain',
        desc: 'CNC billet free-valve linear electromagnetic solenoid actuator with pneumatic cushioning & waterproof Deutsch plug.',
        partNumber: rIdx === 0 ? 'FV-INT-800' : 'FV-EXH-800'
      };
      g.add(actuator);
      railPts.push(new THREE.Vector3(rowX - side * 0.34, 2.92, zPos));
    });

    // High-Voltage Braided Rail connecting all 4 actuators in this row
    const hvCurve = new THREE.CatmullRomCurve3(railPts);
    const hvRail = new THREE.Mesh(
      new THREE.TubeGeometry(hvCurve, 24, 0.085, 8, false),
      braidedMat
    );
    hvRail.userData = {
      name: `High-Voltage Braided Actuator Rail (${rIdx === 0 ? 'Intake' : 'Exhaust'})`,
      category: 'Electromagnetic Valvetrain',
      desc: 'Shielded stainless-braided 48V high-current solenoid bus harness.'
    };
    g.add(hvRail);
  });

  return g;
}

/**
 * Generates Grounded Hot-Rod Boxed Chassis Frame Rails, Urethane Motor Mounts,
 * Aluminum Crossflow Radiator, Coolant Hoses, and Rear Wiring Bulkhead.
 */
export function createChassisAndRadiatorGroup(
  chassisMat: THREE.Material,
  alumMat: THREE.Material,
  radiatorMat: THREE.Material,
  hoseMat: THREE.Material,
  redMat: THREE.Material,
  blueMat: THREE.Material,
  chromeMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // 1. Boxed Steel Hot-Rod Chassis Frame Rails (Left & Right)
  [-4.65, 4.65].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 22.0), chassisMat);
    rail.position.set(rx, -2.55, 1.2);
    rail.castShadow = true;
    rail.receiveShadow = true;
    rail.userData = {
      name: 'Hot-Rod Boxed Steel Chassis Frame Rail',
      category: 'Chassis & Mounts',
      desc: 'TIG-welded 2"×4" boxed 1018 steel frame rail with polyurethane engine mount pedestals.'
    };
    g.add(rail);

    // Side Motor Mount Pedestal + Urethane Cushion Pad bolted cleanly to SBC 3-bolt side boss
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.48, 1.15), chassisMat);
    pedestal.position.set(rx * 0.78, -2.05, 0.55);
    pedestal.rotation.z = rx > 0 ? -0.32 : 0.32;
    g.add(pedestal);

    const mountPad = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.92), redMat);
    mountPad.position.set(rx * 0.64, -1.65, 0.55);
    mountPad.userData = {
      name: 'Energy Suspension Polyurethane Motor Mount',
      category: 'Chassis & Mounts',
      desc: 'Interlocking safety polyurethane SBC 3-bolt side engine mount.'
    };
    g.add(mountPad);
  });

  // 2. Tubular Front Crossmember & Rear Transmission Crossmember
  const frontCross = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 9.4, 16), chromeMat);
  frontCross.rotation.z = Math.PI / 2;
  frontCross.position.set(0, -2.65, 9.8);
  g.add(frontCross);

  const rearCross = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.38, 0.65), chassisMat);
  rearCross.position.set(0, -2.75, -7.8);
  g.add(rearCross);

  // 3. TIG-Welded Aluminum Crossflow Radiator (Front Core + Billet End Tanks + Cap)
  const radGroup = new THREE.Group();
  radGroup.position.set(0, 0.85, 10.65);

  const core = new THREE.Mesh(new THREE.BoxGeometry(6.8, 5.1, 0.68), radiatorMat);
  core.userData = {
    name: 'Griffin 2-Row Aluminum Crossflow Radiator',
    category: 'Cooling System',
    desc: 'TIG-welded 1.25" dual-tube aluminum crossflow radiator rated to 700 HP.'
  };
  radGroup.add(core);

  [-3.68, 3.68].forEach((tx) => {
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.62, 5.35, 0.95), alumMat);
    tank.position.x = tx;
    radGroup.add(tank);
  });
  const radCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.24, 16), chromeMat);
  radCap.position.set(3.68, 2.78, 0);
  radGroup.add(radCap);

  // Upper & Lower Molded Coolant Hoses connecting Radiator to Water Neck & Water Pump
  const upperHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.15, 4.45),
    new THREE.Vector3(1.15, 4.35, 6.8),
    new THREE.Vector3(2.85, 3.45, 9.4),
    new THREE.Vector3(3.45, 2.45, 10.25)
  ]);
  const upperHose = new THREE.Mesh(new THREE.TubeGeometry(upperHoseCurve, 22, 0.26, 12, false), hoseMat);
  g.add(upperHose);

  const lowerHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.95, 0.85, 6.3),
    new THREE.Vector3(-2.45, -0.45, 8.1),
    new THREE.Vector3(-3.45, -1.15, 10.25)
  ]);
  const lowerHose = new THREE.Mesh(new THREE.TubeGeometry(lowerHoseCurve, 20, 0.28, 12, false), hoseMat);
  g.add(lowerHose);

  g.add(radGroup);

  // 4. Firewall Harness Bulkhead & AN-8 Fuel Feed Pass-Through Fittings
  const bulkheadBar = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 0.28), alumMat);
  bulkheadBar.position.set(0, 3.15, -7.2);
  g.add(bulkheadBar);

  [-1.25, 1.25].forEach((ax, idx) => {
    const anBulk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.45, 6),
      idx === 0 ? redMat : blueMat
    );
    anBulk.rotation.x = Math.PI / 2;
    anBulk.position.set(ax, 3.15, -7.0);
    g.add(anBulk);
  });

  // 5. Dual Rear Wiring Harness Loom sweeping into valley
  [-0.85, 0.85].forEach((hx) => {
    const loomCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx * 0.7, 3.15, -7.0),
      new THREE.Vector3(hx, 3.25, -5.6),
      new THREE.Vector3(hx, 2.85, -3.5)
    ]);
    const loom = new THREE.Mesh(new THREE.TubeGeometry(loomCurve, 14, 0.13, 8, false), hoseMat);
    loom.userData = {
      name: 'Mil-Spec Braided Engine Wiring Harness',
      category: 'Electrical',
      desc: 'Tefzel-jacketed Deutsch-terminated harness connecting ECU, coils, injectors, and Hall sensor.'
    };
    g.add(loom);
  });

  return g;
}

/**
 * Generates a Hollow Finned Racing Aluminum Valve Cover (U-channel shell so cutaways
 * accurately reveal the valvetrain, blue stud girdle, and springs inside).
 */
export function createHollowValveCoverGroup(
  side: number,
  bodyMat: THREE.Material,
  finMat: THREE.Material,
  boltMat: THREE.Material,
  breatherMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // Hollow U-channel profile in XY plane (bottom sits at y = 1.10, top at y = 2.42)
  const vcShape = new THREE.Shape();
  vcShape.moveTo(-1.18, 1.10);
  vcShape.lineTo(-1.18, 2.25);
  vcShape.lineTo(-0.85, 2.42);
  vcShape.lineTo(0.85, 2.42);
  vcShape.lineTo(1.18, 2.25);
  vcShape.lineTo(1.18, 1.10);
  vcShape.lineTo(1.04, 1.10);
  vcShape.lineTo(1.04, 2.18);
  vcShape.lineTo(0.78, 2.28);
  vcShape.lineTo(-0.78, 2.28);
  vcShape.lineTo(-1.04, 2.18);
  vcShape.lineTo(-1.04, 1.10);
  vcShape.closePath();

  const shellGeo = new THREE.ExtrudeGeometry(vcShape, {
    depth: 10.9,
    bevelEnabled: false
  });
  shellGeo.translate(0, 0, -5.45);
  const shell = new THREE.Mesh(shellGeo, bodyMat);
  g.add(shell);

  // Front & Rear End Caps closing the hollow valve cover
  [-5.42, 5.42].forEach((ez) => {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.28, 1.24, 0.14), bodyMat);
    cap.position.set(0, 1.74, ez);
    g.add(cap);
  });

  // Top Cooling Fins along Valve Cover Roof
  [-0.56, -0.28, 0, 0.28, 0.56].forEach((fx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 10.4), finMat);
    fin.position.set(fx, 2.48, 0);
    g.add(fin);
  });

  // 8 Perimeter Valve Cover Mounting Bolts
  for (let vb = 0; vb < 4; vb++) {
    const vbZ = -4.35 + vb * 2.9;
    [-1.11, 1.11].forEach((vx) => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.25, 6), boltMat);
      bolt.position.set(vx, 1.16, vbZ);
      g.add(bolt);
    });
  }

  // Billet Breather / Oil Fill Cap on Top
  const breather = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.36, 0.45, 16),
    breatherMat
  );
  breather.position.set(0, 2.66, side === 1 ? 4.1 : -4.1);
  g.add(breather);

  return g;
}

/**
 * Generates an Anodized Blue Billet Stud Girdle / Shaft Rocker Bar
 * spanning all 8 rocker pivots along the cylinder head.
 */
export function createStudGirdleBarGroup(
  barMat: THREE.Material,
  nutMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 9.8), barMat);
  g.add(bar);

  // 8 Billet Polylock Adjuster Nuts seated through top of stud girdle
  const zVals = [-4.25, -3.55, -1.65, -0.95, 0.95, 1.65, 3.55, 4.25];
  zVals.forEach((vz) => {
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.46, 6), nutMat);
    nut.position.set(0, 0.08, vz);
    g.add(nut);
  });
  return g;
}

/**
 * Generates an Authentic Holley 4150 Double-Pumper 4-Barrel Carburetor
 * with 1" Billet Carb Spacer, 4 Venturis, Dual Metering Blocks, Front & Rear Fuel Bowls,
 * Dual-Feed Braided Fuel Line, and Inline Fuel Pressure Gauge.
 */
export function createHolley4150CarburetorGroup(
  goldZincMat: THREE.Material,
  alumMat: THREE.Material,
  darkMat: THREE.Material,
  brassMat: THREE.Material,
  redMat: THREE.Material,
  blueMat: THREE.Material,
  braidedMat: THREE.Material,
  options?: {
    style?: '2bbl' | '4150_dp' | '4500_dominator' | 'dual_quad' | 'mpfi_tb';
    venturiRatio?: number;
    cfm?: number;
    airBonus?: number;
  }
): THREE.Group {
  const g = new THREE.Group();
  const style = options?.style || '4150_dp';
  const isTwoBbl = style === '2bbl';
  const isDominator = style === '4500_dominator';
  const isEfiTb = style === 'mpfi_tb';
  const ventScale = THREE.MathUtils.clamp(options?.venturiRatio ?? 1.0, 0.85, 1.32);
  const bodyScale = isDominator ? 1.18 : isTwoBbl ? 0.84 : 1.0;

  // 1" CNC Billet Open Carburetor Spacer + Base Gasket
  const spacer = new THREE.Mesh(
    new THREE.BoxGeometry(2.05 * bodyScale, 0.36, (isTwoBbl ? 1.45 : 2.15) * bodyScale),
    alumMat
  );
  spacer.position.y = -0.68;
  g.add(spacer);

  // Throttle Base Plate & Linkage Arm
  const basePlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.08 * bodyScale, 0.24, (isTwoBbl ? 1.48 : 2.18) * bodyScale),
    darkMat
  );
  basePlate.position.y = -0.38;
  g.add(basePlate);

  const throttleLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.42), goldZincMat);
  throttleLever.position.set(-1.12 * bodyScale, -0.35, -0.15);
  g.add(throttleLever);

  // Main Carburetor / Throttle Body Casting + Air Horn
  const bodyMat = isEfiTb ? alumMat : goldZincMat;
  const mainBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.78 * bodyScale, isEfiTb ? 0.64 : 0.96, (isTwoBbl ? 1.12 : 1.72) * bodyScale),
    bodyMat
  );
  mainBody.position.y = isEfiTb ? 0.08 : 0.22;
  g.add(mainBody);

  const hornR = 1.04 * bodyScale * (0.94 + (ventScale - 1) * 0.28);
  const airHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(hornR, hornR * 1.08, 0.42, 24),
    alumMat
  );
  airHorn.position.y = isEfiTb ? 0.56 : 0.88;
  g.add(airHorn);

  // Optional Velocity Stack / Cold-Air Ring when scoop >= +30 CFM
  if ((options?.airBonus ?? 15) >= 30) {
    const scoopRing = new THREE.Mesh(
      new THREE.TorusGeometry(hornR * 1.02, 0.11, 10, 28),
      blueMat
    );
    scoopRing.rotation.x = Math.PI / 2;
    scoopRing.position.y = (isEfiTb ? 0.78 : 1.12);
    g.add(scoopRing);
  }

  // Venturi Barrels + Center Discharge Booster Rings (2 for 2BBL, 4 for 4BBL/Dominator)
  const vxList = [-0.38 * bodyScale, 0.38 * bodyScale];
  const vzList = isTwoBbl ? [0] : [-0.36 * bodyScale, 0.36 * bodyScale];
  const barrelR = THREE.MathUtils.clamp(0.28 * ventScale * (isDominator ? 1.12 : 1.0), 0.21, 0.41);
  vxList.forEach((vx) => {
    vzList.forEach((vz) => {
      const venturi = new THREE.Mesh(
        new THREE.CylinderGeometry(barrelR, barrelR, 0.18, 20),
        darkMat
      );
      venturi.position.set(vx, isEfiTb ? 0.74 : 1.04, vz);
      g.add(venturi);

      if (!isEfiTb) {
        const booster = new THREE.Mesh(
          new THREE.TorusGeometry(barrelR * 0.45, 0.03, 8, 16),
          brassMat
        );
        booster.rotation.x = Math.PI / 2;
        booster.position.set(vx, 1.12, vz);
        g.add(booster);
      }
    });
  });

  if (isEfiTb) {
    // TPS Sensor + IAC Motor on Billet EFI Throttle Body
    const tpsBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, 0.42), darkMat);
    tpsBox.position.set(1.12, 0.04, 0.15);
    g.add(tpsBox);
    const fuelReg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.38, 12), redMat);
    fuelReg.position.set(0.95, 0.12, -0.72);
    g.add(fuelReg);
    return g;
  }

  // Metering Blocks & Center-Hung Fuel Bowls (Single front bowl for 2BBL, dual for 4BBL)
  const bowlOffsets = isTwoBbl ? [0.98] : [-1.46, 1.46];
  const meterOffsets = isTwoBbl ? [0.64] : [-1.02, 1.02];

  meterOffsets.forEach((mz) => {
    const metering = new THREE.Mesh(new THREE.BoxGeometry(1.78 * bodyScale, 0.90, 0.28), alumMat);
    metering.position.set(0, 0.18, mz * bodyScale);
    g.add(metering);

    [-0.92 * bodyScale, 0.92 * bodyScale].forEach((ix) => {
      const idleScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), brassMat);
      idleScrew.rotation.z = Math.PI / 2;
      idleScrew.position.set(ix, -0.04, mz * bodyScale);
      g.add(idleScrew);
    });
  });

  bowlOffsets.forEach((bz, idx) => {
    const zPos = bz * bodyScale;
    const bowl = new THREE.Mesh(new THREE.BoxGeometry(1.62 * bodyScale, 0.86, 0.62), goldZincMat);
    bowl.position.set(0, 0.14, zPos);
    g.add(bowl);

    [-0.65 * bodyScale, 0.65 * bodyScale].forEach((fx) => {
      [-0.25, 0.45].forEach((fy) => {
        const bowlBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 6), alumMat);
        bowlBolt.rotation.x = Math.PI / 2;
        bowlBolt.position.set(fx, fy, zPos + (idx === 0 && !isTwoBbl ? -0.32 : 0.32));
        g.add(bowlBolt);
      });
    });

    const sightPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 6), brassMat);
    sightPlug.rotation.z = Math.PI / 2;
    sightPlug.position.set(-0.84 * bodyScale, 0.18, zPos);
    g.add(sightPlug);

    const anInlet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.34, 6),
      idx === 0 ? redMat : blueMat
    );
    anInlet.rotation.z = Math.PI / 2;
    anInlet.position.set(0.95 * bodyScale, 0.26, zPos);
    g.add(anInlet);
  });

  if (!isTwoBbl) {
    // Braided Dual-Feed Fuel Log linking Front & Rear Bowls + Inline Pressure Gauge
    const logCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.12 * bodyScale, 0.26, -1.46 * bodyScale),
      new THREE.Vector3(1.22 * bodyScale, 0.26, 0),
      new THREE.Vector3(1.12 * bodyScale, 0.26, 1.46 * bodyScale)
    ]);
    const fuelLog = new THREE.Mesh(new THREE.TubeGeometry(logCurve, 16, 0.085, 8, false), braidedMat);
    g.add(fuelLog);

    const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 20), alumMat);
    gaugeBody.rotation.z = Math.PI / 2;
    gaugeBody.position.set(1.36 * bodyScale, 0.36, 0);
    g.add(gaugeBody);

    const gaugeBezel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 20), darkMat);
    gaugeBezel.rotation.y = Math.PI / 2;
    gaugeBezel.position.set(1.44 * bodyScale, 0.36, 0);
    g.add(gaugeBezel);
  }

  return g;
}

/**
 * Generates a Tubular Chrome/Steel Shop Engine Display & Dyno Cradle Stand
 * resting cleanly on the studio floor (y = -5.78) and bolting to SBC side motor mount bosses.
 */
export function createEngineTestStandGroup(
  tubeMat: THREE.Material,
  bracketMat: THREE.Material,
  wheelMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // Floor-level perimeter rectangular base rails (y = -5.45, caster wheels touch y = -5.78)
  [-3.85, 3.85].forEach((sx) => {
    const baseRail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 11.4, 12), tubeMat);
    baseRail.rotation.x = Math.PI / 2;
    baseRail.position.set(sx, -5.45, -0.4);
    g.add(baseRail);

    // Caster Wheels at 4 corners (bottom at y = -5.78)
    [-5.6, 4.8].forEach((cz) => {
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.28), bracketMat);
      fork.position.set(sx, -5.56, cz);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, -5.62, cz);
      g.add(fork, wheel);
    });

    // Angled Front & Rear Uprights rising to Side Motor-Mount Cradle & Rear Bellhousing Pad
    const frontLegCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, -5.45, 4.6),
      new THREE.Vector3(sx * 0.92, -3.4, 2.6),
      new THREE.Vector3(sx * 0.86, -1.45, 0.55)
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(frontLegCurve, 12, 0.16, 10, false), tubeMat));

    const rearLegCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, -5.45, -5.4),
      new THREE.Vector3(sx * 0.85, -3.5, -5.4),
      new THREE.Vector3(sx * 0.65, -1.75, -5.4)
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(rearLegCurve, 12, 0.16, 10, false), tubeMat));

    // Side Motor Mount Cradle Bracket bolting cleanly into SBC 3-bolt side boss
    const mountPad = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 1.15), bracketMat);
    mountPad.position.set(sx * 0.84, -1.35, 0.55);
    g.add(mountPad);
  });

  // Front, Center & Rear Transverse Floor Crossbars
  [-5.2, 0.5, 4.6].forEach((tz) => {
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.7, 12), tubeMat);
    cross.rotation.z = Math.PI / 2;
    cross.position.set(0, -5.45, tz);
    g.add(cross);
  });

  // Rear Bellhousing Support Crossbar
  const rearSupport = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.34, 0.48), bracketMat);
  rearSupport.position.set(0, -1.75, -5.4);
  g.add(rearSupport);

  return g;
}

/**
 * Generates a Forged Slipper-Skirt Performance Piston with Ring Grooves, Valve Reliefs,
 * PTFE Moly Skirt Coating Pads, Hollow Wrist Pin & Spiralox Retaining Clips.
 */
export function createDetailedPistonAssembly(
  outerRadius: number,
  pistonMat: THREE.Material,
  darkMat: THREE.Material,
  topRingMat: THREE.Material,
  secondRingMat: THREE.Material,
  oilRingMat: THREE.Material,
  pinMat: THREE.Material,
  clipMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // CNC-turned stepped profile (crown chamfer, top/2nd/oil ring grooves, recessed skirt)
  const pts = [
    new THREE.Vector2(0.0, 0.72),
    new THREE.Vector2(outerRadius * 0.90, 0.72),
    new THREE.Vector2(outerRadius * 0.97, 0.65),
    new THREE.Vector2(outerRadius * 0.97, 0.50),
    new THREE.Vector2(outerRadius * 0.87, 0.49),
    new THREE.Vector2(outerRadius * 0.87, 0.43),
    new THREE.Vector2(outerRadius * 0.97, 0.42),
    new THREE.Vector2(outerRadius * 0.97, 0.30),
    new THREE.Vector2(outerRadius * 0.87, 0.29),
    new THREE.Vector2(outerRadius * 0.87, 0.23),
    new THREE.Vector2(outerRadius * 0.97, 0.22),
    new THREE.Vector2(outerRadius * 0.97, 0.12),
    new THREE.Vector2(outerRadius * 0.85, 0.11),
    new THREE.Vector2(outerRadius * 0.85, -0.02),
    new THREE.Vector2(outerRadius * 0.95, -0.04),
    new THREE.Vector2(outerRadius * 0.94, -0.62),
    new THREE.Vector2(outerRadius * 0.81, -0.66),
    new THREE.Vector2(outerRadius * 0.78, -0.18),
    new THREE.Vector2(0.0, -0.12)
  ];

  const bodyGeo = new THREE.LatheGeometry(pts, 40);
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, pistonMat);
  g.add(body);

  // Dual Forged Intake & Exhaust Valve Eyebrow Pockets on Piston Crown
  [-outerRadius * 0.42, outerRadius * 0.42].forEach((vx, idx) => {
    const pocket = new THREE.Mesh(
      new THREE.CylinderGeometry(outerRadius * (idx === 0 ? 0.34 : 0.29), outerRadius * (idx === 0 ? 0.32 : 0.27), 0.06, 22),
      darkMat
    );
    pocket.position.set(vx, 0.71, outerRadius * 0.16);
    pocket.rotation.x = 0.08;
    g.add(pocket);
  });

  // Top Plasma-Moly Ring, 2nd Napier Scraper Ring, and 3-Piece Oil Control Ring Pack
  const ringSpecs = [
    { y: 0.46, r: outerRadius * 0.985, tube: 0.032, mat: topRingMat },
    { y: 0.26, r: outerRadius * 0.985, tube: 0.034, mat: secondRingMat },
    { y: 0.08, r: outerRadius * 0.980, tube: 0.024, mat: topRingMat },
    { y: 0.045, r: outerRadius * 0.955, tube: 0.028, mat: oilRingMat },
    { y: 0.01, r: outerRadius * 0.980, tube: 0.024, mat: topRingMat }
  ];
  ringSpecs.forEach((rs) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rs.r, rs.tube, 10, 40, Math.PI * 1.96),
      rs.mat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = rs.y;
    g.add(ring);
  });

  // Pin Boss Side Window Pockets + Full-Floating Hollow Chrome-Moly Wrist Pin + Twin Spiralox Clips
  const pinLen = outerRadius * 1.62;
  const pinOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius * 0.24, outerRadius * 0.24, pinLen, 24, 1, true),
    pinMat
  );
  pinOuter.rotation.z = Math.PI / 2;
  pinOuter.position.y = -0.28;
  g.add(pinOuter);

  [-pinLen * 0.48, pinLen * 0.48].forEach((px) => {
    const endRim = new THREE.Mesh(
      new THREE.TorusGeometry(outerRadius * 0.19, 0.045, 8, 20),
      pinMat
    );
    endRim.rotation.y = Math.PI / 2;
    endRim.position.set(px, -0.28, 0);
    g.add(endRim);

    const spiralox = new THREE.Mesh(
      new THREE.TorusGeometry(outerRadius * 0.25, 0.02, 6, 18),
      clipMat
    );
    spiralox.rotation.y = Math.PI / 2;
    spiralox.position.set(px * 1.05, -0.28, 0);
    g.add(spiralox);
  });

  return g;
}

/**
 * Generates an Axial Splined Shaft Segment for Crank Snouts & Transmission Output/Input Splines
 */
export function createSplineShaftGeometry(
  outerRadius: number,
  length: number,
  splines = 24
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const rootR = outerRadius * 0.87;
  const step = (Math.PI * 2) / splines;
  for (let i = 0; i < splines; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.28;
    const a2 = a0 + step * 0.62;
    const a3 = a0 + step * 0.90;
    if (i === 0) shape.moveTo(Math.cos(a0) * rootR, Math.sin(a0) * rootR);
    else shape.lineTo(Math.cos(a0) * rootR, Math.sin(a0) * rootR);
    shape.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * rootR, Math.sin(a3) * rootR);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 12
  });
  geo.translate(0, 0, -length / 2);
  return geo;
}



