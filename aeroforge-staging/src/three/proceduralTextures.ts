import * as THREE from 'three';
import { AEROSPACE_MATERIALS } from '../data/materials';
import { MaterialId } from '../types/aerospace';

export interface MaterialTextureBundle {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

const bundleCache = new Map<string, MaterialTextureBundle>();
let floorGridCache: THREE.CanvasTexture | null = null;
let contactShadowCache: THREE.CanvasTexture | null = null;
let spinnerSpiralCache: THREE.CanvasTexture | null = null;
let solarCellCache: THREE.CanvasTexture | null = null;

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function getProceduralMaterialTextures(
  materialId: MaterialId,
  maxAnisotropy: number
): MaterialTextureBundle {
  const key = `${materialId}_${maxAnisotropy}`;
  const cached = bundleCache.get(key);
  if (cached) return cached;

  const spec = AEROSPACE_MATERIALS[materialId];
  const size = 512;

  const [albedoCanvas, aCtx] = createCanvas(size);
  const [bumpCanvas, bCtx] = createCanvas(size);
  const [roughCanvas, rCtx] = createCanvas(size);

  // Base fills
  aCtx.fillStyle = spec.colorHex;
  aCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const baseRoughByte = Math.round(spec.roughness * 255);
  rCtx.fillStyle = `rgb(${baseRoughByte},${baseRoughByte},${baseRoughByte})`;
  rCtx.fillRect(0, 0, size, size);

  if (spec.pattern === 'carbon') {
    const cell = 16;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const idx = (x / cell + y / cell) % 4;
        const isWarp = idx < 2;
        aCtx.fillStyle = isWarp ? '#1b2028' : '#2e3541';
        aCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        aCtx.fillStyle = isWarp ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.18)';
        aCtx.fillRect(x, y, cell, 2);

        bCtx.fillStyle = isWarp ? '#9c9c9c' : '#646464';
        bCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2);

        rCtx.fillStyle = isWarp ? 'rgb(45,45,45)' : 'rgb(85,85,85)';
        rCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
  } else if (spec.pattern === 'forged_carbon') {
    for (let i = 0; i < 650; i++) {
      const rx = (i * 89) % size;
      const ry = (i * 151) % size;
      const w = 14 + (i % 18);
      const h = 6 + ((i * 7) % 12);
      const rot = ((i * 37) % 180) * (Math.PI / 180);
      const shade = 24 + ((i * 19) % 34);
      aCtx.save();
      aCtx.translate(rx, ry);
      aCtx.rotate(rot);
      aCtx.fillStyle = `rgb(${shade},${shade + 4},${shade + 9})`;
      aCtx.fillRect(-w / 2, -h / 2, w, h);
      aCtx.restore();

      bCtx.save();
      bCtx.translate(rx, ry);
      bCtx.rotate(rot);
      const bVal = 100 + (i % 60);
      bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      bCtx.fillRect(-w / 2, -h / 2, w, h);
      bCtx.restore();
    }
  } else if (spec.pattern === 'kevlar') {
    const cell = 14;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const isWarp = ((x / cell + y / cell) % 2) === 0;
        aCtx.fillStyle = isWarp ? '#c89b3c' : '#9c7524';
        aCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        bCtx.fillStyle = isWarp ? '#a2a2a2' : '#686868';
        bCtx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
  } else if (spec.pattern === 'cast_iron') {
    for (let i = 0; i < 3600; i++) {
      const rx = (i * 97) % size;
      const ry = (i * 193) % size;
      const sz = 1 + (i % 3);
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.08)';
      aCtx.fillRect(rx, ry, sz, sz);
      bCtx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#585858';
      bCtx.fillRect(rx, ry, sz, sz);
      rCtx.fillStyle = i % 2 === 0 ? 'rgb(165,165,165)' : 'rgb(135,135,135)';
      rCtx.fillRect(rx, ry, sz, sz);
    }
  } else if (spec.pattern === 'ceramic_brake') {
    for (let i = 0; i < 2400; i++) {
      const rx = (i * 67) % size;
      const ry = (i * 139) % size;
      aCtx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,20,28,0.16)';
      aCtx.fillRect(rx, ry, 5, 2);
      bCtx.fillStyle = i % 2 === 0 ? '#9e9e9e' : '#656565';
      bCtx.fillRect(rx, ry, 4, 2);
    }
    // Subtle cross-drilled micro cooling array look
    aCtx.fillStyle = 'rgba(10,12,16,0.35)';
    bCtx.fillStyle = '#303030';
    for (let y = 48; y < size; y += 96) {
      for (let x = 48; x < size; x += 96) {
        aCtx.beginPath();
        aCtx.arc(x, y, 5, 0, Math.PI * 2);
        aCtx.fill();
        bCtx.beginPath();
        bCtx.arc(x, y, 5, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  } else if (spec.pattern === 'brushed' || spec.pattern === 'heat_tinted' || spec.pattern === 'machined_steel') {
    const streakCount = spec.pattern === 'machined_steel' ? 2100 : 1600;
    for (let i = 0; i < streakCount; i++) {
      const y = (i * 19) % size;
      const alpha = 0.03 + ((i * 37) % 10) * 0.005;
      aCtx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      aCtx.fillRect(0, y, size, 1);
      bCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      bCtx.fillRect(0, y, size, 1);
    }
    if (spec.pattern === 'heat_tinted') {
      const grad = aCtx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, 'rgba(180, 115, 65, 0.22)');
      grad.addColorStop(0.45, 'rgba(110, 95, 145, 0.16)');
      grad.addColorStop(1, 'rgba(75, 115, 140, 0.2)');
      aCtx.fillStyle = grad;
      aCtx.fillRect(0, 0, size, size);
    }
    aCtx.strokeStyle = 'rgba(0,0,0,0.28)';
    aCtx.lineWidth = 2;
    aCtx.strokeRect(8, 8, size - 16, size - 16);
    aCtx.beginPath();
    aCtx.moveTo(0, size / 2);
    aCtx.lineTo(size, size / 2);
    aCtx.stroke();

    bCtx.strokeStyle = '#383838';
    bCtx.lineWidth = 2;
    bCtx.strokeRect(8, 8, size - 16, size - 16);
  } else if (spec.pattern === 'riveted') {
    for (let i = 0; i < 600; i++) {
      const y = (i * 23) % size;
      aCtx.fillStyle = 'rgba(255,255,255,0.025)';
      aCtx.fillRect(0, y, size, 1);
    }
    aCtx.strokeStyle = 'rgba(30,40,55,0.35)';
    aCtx.lineWidth = 2;
    bCtx.strokeStyle = '#404040';
    bCtx.lineWidth = 2;
    const step = 128;
    for (let p = 0; p <= size; p += step) {
      aCtx.beginPath();
      aCtx.moveTo(p, 0);
      aCtx.lineTo(p, size);
      aCtx.moveTo(0, p);
      aCtx.lineTo(size, p);
      aCtx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(p, 0);
      bCtx.lineTo(p, size);
      bCtx.moveTo(0, p);
      bCtx.lineTo(size, p);
      bCtx.stroke();
    }
    for (let y = 16; y < size; y += 32) {
      for (let x = 12; x < size; x += step) {
        aCtx.fillStyle = 'rgba(255,255,255,0.22)';
        aCtx.beginPath();
        aCtx.arc(x, y, 2, 0, Math.PI * 2);
        aCtx.fill();

        bCtx.fillStyle = '#b4b4b4';
        bCtx.beginPath();
        bCtx.arc(x, y, 2, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  } else if (spec.pattern === 'paint_metallic') {
    for (let i = 0; i < 1800; i++) {
      const rx = (i * 53) % size;
      const ry = (i * 113) % size;
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(120,20,20,0.08)';
      aCtx.fillRect(rx, ry, 2, 2);
    }
  } else if (spec.pattern === 'rubber') {
    for (let y = 0; y < size; y += 32) {
      aCtx.fillStyle = 'rgba(0,0,0,0.3)';
      aCtx.fillRect(0, y, size, 4);
      bCtx.fillStyle = '#404040';
      bCtx.fillRect(0, y, size, 4);
    }
    for (let i = 0; i < 1400; i++) {
      const rx = (i * 71) % size;
      const ry = (i * 131) % size;
      aCtx.fillStyle = 'rgba(255,255,255,0.02)';
      aCtx.fillRect(rx, ry, 2, 2);
    }
  } else if (spec.pattern === 'polymer') {
    for (let i = 0; i < 2400; i++) {
      const rx = (i * 73) % size;
      const ry = (i * 137) % size;
      aCtx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      aCtx.fillRect(rx, ry, 4, 1);
      rCtx.fillStyle = i % 2 === 0 ? 'rgb(95,95,95)' : 'rgb(75,75,75)';
      rCtx.fillRect(rx, ry, 3, 2);
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAnisotropy;

  const bundle = { map, bumpMap, roughnessMap };
  bundleCache.set(key, bundle);
  return bundle;
}

export function createMaterialFromSpec(
  materialId: MaterialId,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): THREE.MeshPhysicalMaterial {
  const spec = AEROSPACE_MATERIALS[materialId] || AEROSPACE_MATERIALS.al_7075;
  const textures = getProceduralMaterialTextures(spec.id, maxAnisotropy);

  if (spec.id === 'sapphire_glass') {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#b6daf8'),
      metalness: 0.05,
      roughness: 0.06,
      ior: 1.56,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transmission: isSoftwareGl ? 0 : 0.88,
      thickness: 0.4,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 1.0,
      depthWrite: false,
      envMapIntensity: 1.4,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    map: textures.map,
    bumpMap: textures.bumpMap,
    bumpScale:
      spec.pattern === 'carbon' || spec.pattern === 'forged_carbon' || spec.pattern === 'kevlar'
        ? 0.012
        : spec.pattern === 'cast_iron' || spec.pattern === 'ceramic_brake'
        ? 0.015
        : 0.008,
    roughnessMap: textures.roughnessMap,
    metalness: spec.metalness,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.pattern === 'paint_metallic' ? 0.06 : 0.14,
    anisotropy: spec.anisotropy,
    iridescence: spec.iridescence,
    iridescenceIOR: 1.35,
    envMapIntensity: 1.15,
  });
}

export function getCalibratedFloorGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  if (floorGridCache) return floorGridCache;
  const size = 1024;
  const [canvas, ctx] = createCanvas(size);

  ctx.fillStyle = '#0e141d';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  const minor = size / 16;
  for (let i = 0; i <= 16; i++) {
    const p = i * minor;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.18)';
  ctx.lineWidth = 2;
  const major = size / 4;
  for (let i = 0; i <= 4; i++) {
    const p = i * major;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.anisotropy = maxAnisotropy;
  floorGridCache = tex;
  return tex;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (contactShadowCache) return contactShadowCache;
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  contactShadowCache = tex;
  return tex;
}

export function getSpinnerSpiralTexture(maxAnisotropy: number): THREE.CanvasTexture {
  if (spinnerSpiralCache) return spinnerSpiralCache;
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#181c22';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const cx = size / 2;
  const cy = size / 2;
  for (let t = 0; t < Math.PI * 4.5; t += 0.08) {
    const r = 10 + t * 14;
    const x = cx + Math.cos(t) * r;
    const y = cy + Math.sin(t) * r;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  spinnerSpiralCache = tex;
  return tex;
}

export function getSolarArrayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  if (solarCellCache) return solarCellCache;
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#0e2240';
  ctx.fillRect(0, 0, size, size);

  const cols = 8;
  const rows = 16;
  const w = size / cols;
  const h = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#112a52' : '#14315e';
      ctx.fillRect(c * w + 2, r * h + 2, w - 4, h - 4);
      ctx.strokeStyle = 'rgba(180, 210, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(c * w + 2, r * h + 2, w - 4, h - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  solarCellCache = tex;
  return tex;
}

export type EngineFinishKind =
  | 'chevy_orange'
  | 'polished_billet'
  | 'anodized_black'
  | 'copper_coil'
  | 'radiator_core';

const engineFinishTexCache = new Map<
  string,
  { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }
>();

function getEngineFinishTextures(kind: EngineFinishKind, maxAnisotropy: number) {
  const key = `${kind}_${maxAnisotropy}`;
  const cached = engineFinishTexCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [albedoCanvas, aCtx] = createCanvas(size);
  const [bumpCanvas, bCtx] = createCanvas(size);
  const [roughCanvas, rCtx] = createCanvas(size);

  if (kind === 'chevy_orange') {
    aCtx.fillStyle = '#e04612';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(64,64,64)';
    rCtx.fillRect(0, 0, size, size);

    // Subtle cast-iron block grain beneath glossy Chevy-orange enamel
    for (let i = 0; i < 3200; i++) {
      const rx = (i * 97) % size;
      const ry = (i * 193) % size;
      const sz = 1 + (i % 3);
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,140,80,0.06)' : 'rgba(90,20,4,0.09)';
      aCtx.fillRect(rx, ry, sz, sz);
      bCtx.fillStyle = i % 2 === 0 ? '#969696' : '#6a6a6a';
      bCtx.fillRect(rx, ry, sz, sz);
    }
  } else if (kind === 'polished_billet') {
    aCtx.fillStyle = '#dfe6ef';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(34,34,34)';
    rCtx.fillRect(0, 0, size, size);

    // Fine CNC fly-cut / brushed billet streaks (no dark panel lines or rivets)
    for (let i = 0; i < 2400; i++) {
      const y = (i * 17) % size;
      const alpha = 0.02 + ((i * 29) % 8) * 0.004;
      aCtx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(140,155,175,${alpha})`;
      aCtx.fillRect(0, y, size, 1);
      bCtx.fillStyle = i % 2 === 0 ? '#888888' : '#787878';
      bCtx.fillRect(0, y, size, 1);
    }
  } else if (kind === 'anodized_black') {
    aCtx.fillStyle = '#191e26';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(68,68,68)';
    rCtx.fillRect(0, 0, size, size);

    for (let i = 0; i < 1400; i++) {
      const y = (i * 23) % size;
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
      aCtx.fillRect(0, y, size, 1);
    }
  } else if (kind === 'copper_coil') {
    aCtx.fillStyle = '#c86932';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(58,58,58)';
    rCtx.fillRect(0, 0, size, size);

    // Tight copper wire winding ribs
    for (let y = 0; y < size; y += 6) {
      aCtx.fillStyle = '#e0864d';
      aCtx.fillRect(0, y, size, 3);
      aCtx.fillStyle = '#8c4119';
      aCtx.fillRect(0, y + 3, size, 3);
      bCtx.fillStyle = '#b4b4b4';
      bCtx.fillRect(0, y, size, 3);
      bCtx.fillStyle = '#4c4c4c';
      bCtx.fillRect(0, y + 3, size, 3);
    }
  } else {
    // radiator_core
    aCtx.fillStyle = '#a8b2be';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(95,95,95)';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 8) {
      aCtx.fillStyle = '#4f5864';
      aCtx.fillRect(0, y + 4, size, 3);
      bCtx.fillStyle = '#383838';
      bCtx.fillRect(0, y + 4, size, 3);
    }
    for (let x = 0; x < size; x += 24) {
      aCtx.fillStyle = '#cfd7e2';
      aCtx.fillRect(x, 0, 3, size);
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAnisotropy;

  const bundle = { map, bumpMap, roughnessMap };
  engineFinishTexCache.set(key, bundle);
  return bundle;
}

export function createEngineFinishMaterial(
  kind: EngineFinishKind,
  maxAnisotropy: number,
  clippingPlanes: THREE.Plane[]
): THREE.MeshPhysicalMaterial {
  const tex = getEngineFinishTextures(kind, maxAnisotropy);
  const common = {
    map: tex.map,
    bumpMap: tex.bumpMap,
    roughnessMap: tex.roughnessMap,
    clippingPlanes,
    clipShadows: true,
    side: THREE.DoubleSide,
  };

  switch (kind) {
    case 'chevy_orange':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: new THREE.Color('#ffffff'),
        bumpScale: 0.008,
        metalness: 0.18,
        roughness: 0.25,
        clearcoat: 0.92,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.25,
      });
    case 'polished_billet':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: new THREE.Color('#ffffff'),
        bumpScale: 0.003,
        metalness: 0.96,
        roughness: 0.14,
        clearcoat: 0.35,
        clearcoatRoughness: 0.08,
        anisotropy: 0.72,
        envMapIntensity: 1.38,
      });
    case 'anodized_black':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: new THREE.Color('#ffffff'),
        bumpScale: 0.003,
        metalness: 0.84,
        roughness: 0.26,
        clearcoat: 0.28,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.25,
      });
    case 'copper_coil':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: new THREE.Color('#ffffff'),
        bumpScale: 0.014,
        metalness: 0.93,
        roughness: 0.22,
        clearcoat: 0.2,
        anisotropy: 0.6,
        envMapIntensity: 1.32,
      });
    case 'radiator_core':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: new THREE.Color('#ffffff'),
        bumpScale: 0.018,
        metalness: 0.85,
        roughness: 0.36,
        envMapIntensity: 1.15,
      });
  }
}

