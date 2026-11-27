import * as THREE from 'three';
import { AEROSPACE_MATERIALS, ASSEMBLY_PROFILES } from '../data/materials';
import {
  AssemblyId,
  CadEnvelopeMm,
  CamStrategyId,
  MaterialId,
  SubsystemMaterials,
} from '../types/aerospace';

export interface CamStrategyMeta {
  id: CamStrategyId;
  label: string;
  toolSpec: string;
  toolDiameterMm: number;
  stepoverPct: number;
  docMm: number;
  raUm: number;
  baseSfmMultiplier: number;
}

export const CAM_STRATEGIES: Record<CamStrategyId, CamStrategyMeta> = {
  adaptive_roughing: {
    id: 'adaptive_roughing',
    label: '5-Axis Adaptive Roughing',
    toolSpec: 'Ø16mm 5-Flute AlTiN Carbide Bullnose',
    toolDiameterMm: 16,
    stepoverPct: 18,
    docMm: 14.0,
    raUm: 3.2,
    baseSfmMultiplier: 1.0,
  },
  helical_bore: {
    id: 'helical_bore',
    label: 'Helical Bore & Deck Mill',
    toolSpec: 'Ø12mm 4-Flute Helical Interpolation Mill',
    toolDiameterMm: 12,
    stepoverPct: 24,
    docMm: 6.5,
    raUm: 1.4,
    baseSfmMultiplier: 0.92,
  },
  swarf_finishing: {
    id: 'swarf_finishing',
    label: '5-Axis Swarf Contour Finish',
    toolSpec: 'Ø8mm Tapered Ball-Nose Carbide (R4)',
    toolDiameterMm: 8,
    stepoverPct: 7,
    docMm: 1.2,
    raUm: 0.45,
    baseSfmMultiplier: 1.18,
  },
  lpbf_additive: {
    id: 'lpbf_additive',
    label: 'LPBF Laser Scan + Datum Mill',
    toolSpec: '400W Yb-Fiber Laser (30µm Layer) + Ø6mm Probe',
    toolDiameterMm: 6,
    stepoverPct: 12,
    docMm: 0.03,
    raUm: 6.8,
    baseSfmMultiplier: 1.35,
  },
};

const MATERIAL_BASE_VC_MPM: Record<MaterialId, number> = {
  ti_6al4v: 68,
  al_7075: 320,
  al_6061_t6: 350,
  al_356_t6: 290,
  magnesium_az91d: 410,
  cast_iron_gray: 145,
  chromoly_4130: 115,
  forged_4340: 92,
  carburized_9310: 76,
  inconel_718: 38,
  cfrp_t800: 210,
  forged_carbon_smc: 195,
  carbon_ceramic_sic: 32,
  peek_cf30: 260,
  kevlar_aramid: 180,
  automotive_paint_gloss: 130,
  chevy_orange_enamel: 145,
  polished_billet_al: 340,
  vulcanized_rubber: 220,
  sapphire_glass: 45,
};

export interface CamTelemetrySummary {
  spindleRpm: number;
  feedRateMmMin: number;
  mrrCm3Min: number;
  raUm: number;
  toolSpec: string;
  estCycleMin: number;
  gcodeProgram: string;
  previewLines: string[];
}

export function computeCamMachiningData(
  assemblyId: AssemblyId,
  materials: SubsystemMaterials,
  strategy: CamStrategyId,
  feedOverridePct: number,
  envelopeMm: CadEnvelopeMm
): CamTelemetrySummary {
  const matId = materials.airframe;
  const mat = AEROSPACE_MATERIALS[matId];
  const strat = CAM_STRATEGIES[strategy];
  const profile = ASSEMBLY_PROFILES[assemblyId];

  const vc = MATERIAL_BASE_VC_MPM[matId] * strat.baseSfmMultiplier;
  const rawRpm = Math.round((vc * 1000) / (Math.PI * strat.toolDiameterMm));
  const spindleRpm = Math.min(24000, Math.max(1800, rawRpm));

  const flutes = strategy === 'adaptive_roughing' ? 5 : strategy === 'helical_bore' ? 4 : 3;
  const chipLoadMm =
    matId === 'al_7075' ||
    matId === 'al_6061_t6' ||
    matId === 'al_356_t6' ||
    matId === 'magnesium_az91d' ||
    matId === 'peek_cf30'
      ? 0.085
      : matId === 'cfrp_t800' || matId === 'forged_carbon_smc' || matId === 'kevlar_aramid'
      ? 0.06
      : matId === 'cast_iron_gray' || matId === 'chromoly_4130'
      ? 0.055
      : 0.042;
  const baseFeed = spindleRpm * flutes * chipLoadMm;
  const feedRateMmMin = Math.round(baseFeed * (feedOverridePct / 100));

  const ae = strat.toolDiameterMm * (strat.stepoverPct / 100);
  const mrrCm3Min =
    strategy === 'lpbf_additive'
      ? Number((28 * (feedOverridePct / 100)).toFixed(1))
      : Number(((ae * strat.docMm * feedRateMmMin) / 1000).toFixed(1));

  const volumeCm3 = Math.max(
    450,
    (envelopeMm.x * envelopeMm.y * envelopeMm.z) / 1000 * 0.22
  );
  const estCycleMin = Math.max(
    12,
    Math.round(volumeCm3 / Math.max(8, mrrCm3Min) + (strategy === 'swarf_finishing' ? 28 : 14))
  );

  const halfX = (envelopeMm.x * 0.5).toFixed(2);
  const halfZ = (envelopeMm.z * 0.5).toFixed(2);
  const topY = envelopeMm.y.toFixed(2);
  const cutDepth1 = (envelopeMm.y * 0.72).toFixed(2);
  const cutDepth2 = (envelopeMm.y * 0.44).toFixed(2);

  const programLines = [
    `%`,
    `O0350 (${profile.code} - ${strat.label.toUpperCase()})`,
    `(MATERIAL: ${mat.name} | ${mat.designation})`,
    `(TOOL: ${strat.toolSpec})`,
    `(ENVELOPE: ${envelopeMm.x.toFixed(0)} x ${envelopeMm.y.toFixed(0)} x ${envelopeMm.z.toFixed(0)} MM)`,
    `G90 G21 G17 G40 G49 G80`,
    `G54 (WORK OFFSET DATUM CENTER-BASE)`,
    `T01 M06`,
    `S${spindleRpm} M03`,
    `G43 H01 Z${(envelopeMm.y + 45).toFixed(1)} M08`,
    `G00 X-${halfX} Y-${halfZ} A0.0 B0.0`,
    `G01 Z${topY} F${Math.round(feedRateMmMin * 0.45)}`,
    `(PASS 1 - ADAPTIVE ENTRY & CONTOUR)`,
    `G01 X${halfX} Y-${halfZ} Z${cutDepth1} A12.5 B-4.2 F${feedRateMmMin}`,
    `G02 X${halfX} Y${halfZ} I0.0 J${halfZ} A18.0 B6.5`,
    `G01 X-${halfX} Y${halfZ} Z${cutDepth2} A-14.2 B3.8`,
    `G03 X-${halfX} Y-${halfZ} I0.0 J-${halfZ} A0.0 B0.0`,
    `(PASS 2 - 5-AXIS SWARF DATUM PASS)`,
    `G01 X0.00 Y0.00 Z${(envelopeMm.y * 0.25).toFixed(2)} A22.0 B-11.5 F${Math.round(feedRateMmMin * 0.8)}`,
    `G00 Z${(envelopeMm.y + 60).toFixed(1)} M09`,
    `G28 G91 Z0.0 A0.0 B0.0`,
    `M05`,
    `M30`,
    `%`,
  ];

  return {
    spindleRpm,
    feedRateMmMin,
    mrrCm3Min,
    raUm: strat.raUm,
    toolSpec: strat.toolSpec,
    estCycleMin,
    gcodeProgram: programLines.join('\n'),
    previewLines: programLines.slice(5, 16),
  };
}

interface TriangleBucket {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  n: [number, number, number];
}

function collectMeshTriangles(root: THREE.Object3D): {
  triangles: TriangleBucket[];
  groups: Array<{ name: string; startTri: number; triCount: number }>;
} {
  root.updateMatrixWorld(true);
  const triangles: TriangleBucket[] = [];
  const groups: Array<{ name: string; startTri: number; triCount: number }> = [];

  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const instanceMat = new THREE.Matrix4();
  const worldMat = new THREE.Matrix4();

  const pushTri = (m: THREE.Matrix4) => {
    va.applyMatrix4(m);
    vb.applyMatrix4(m);
    vc.applyMatrix4(m);

    cb.subVectors(vc, vb);
    ab.subVectors(va, vb);
    cb.cross(ab).normalize();

    // Scale from scene units (1 unit ~ 1m for aero, ~0.25m for auto) into mm for CAD export
    const scale = 1000;
    triangles.push({
      v0: [va.x * scale, va.y * scale, va.z * scale],
      v1: [vb.x * scale, vb.y * scale, vb.z * scale],
      v2: [vc.x * scale, vc.y * scale, vc.z * scale],
      n: [cb.x || 0, cb.y || 1, cb.z || 0],
    });
  };

  root.traverse((obj) => {
    if (!obj.visible) return;
    if (obj.userData?.isExhaustPlume) return;

    if (obj instanceof THREE.InstancedMesh) {
      const geo = obj.geometry;
      const pos = geo.getAttribute('position');
      if (!pos) return;
      const index = geo.getIndex();
      const startTri = triangles.length;

      for (let inst = 0; inst < obj.count; inst++) {
        obj.getMatrixAt(inst, instanceMat);
        worldMat.multiplyMatrices(obj.matrixWorld, instanceMat);

        if (index) {
          for (let i = 0; i < index.count; i += 3) {
            va.fromBufferAttribute(pos, index.getX(i));
            vb.fromBufferAttribute(pos, index.getX(i + 1));
            vc.fromBufferAttribute(pos, index.getX(i + 2));
            pushTri(worldMat);
          }
        } else {
          for (let i = 0; i < pos.count; i += 3) {
            va.fromBufferAttribute(pos, i);
            vb.fromBufferAttribute(pos, i + 1);
            vc.fromBufferAttribute(pos, i + 2);
            pushTri(worldMat);
          }
        }
      }

      groups.push({
        name: String(obj.userData?.partCode || obj.name || 'INSTANCED_PART'),
        startTri,
        triCount: triangles.length - startTri,
      });
    } else if (obj instanceof THREE.Mesh) {
      const geo = obj.geometry;
      const pos = geo.getAttribute('position');
      if (!pos) return;
      const index = geo.getIndex();
      const startTri = triangles.length;

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          va.fromBufferAttribute(pos, index.getX(i));
          vb.fromBufferAttribute(pos, index.getX(i + 1));
          vc.fromBufferAttribute(pos, index.getX(i + 2));
          pushTri(obj.matrixWorld);
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          va.fromBufferAttribute(pos, i);
          vb.fromBufferAttribute(pos, i + 1);
          vc.fromBufferAttribute(pos, i + 2);
          pushTri(obj.matrixWorld);
        }
      }

      groups.push({
        name: String(obj.userData?.partCode || obj.name || 'CAD_PART'),
        startTri,
        triCount: triangles.length - startTri,
      });
    }
  });

  return { triangles, groups };
}

export function exportAssemblyToBinaryStl(
  root: THREE.Object3D,
  filename: string
): { triangleCount: number } {
  const { triangles } = collectMeshTriangles(root);
  const bufferLength = 84 + triangles.length * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  const header = 'AeroForge Studio CAD/CAM Binary STL Export (mm)';
  for (let i = 0; i < Math.min(80, header.length); i++) {
    view.setUint8(i, header.charCodeAt(i));
  }
  view.setUint32(80, triangles.length, true);

  let offset = 84;
  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    view.setFloat32(offset, tri.n[0], true);
    view.setFloat32(offset + 4, tri.n[1], true);
    view.setFloat32(offset + 8, tri.n[2], true);

    view.setFloat32(offset + 12, tri.v0[0], true);
    view.setFloat32(offset + 16, tri.v0[1], true);
    view.setFloat32(offset + 20, tri.v0[2], true);

    view.setFloat32(offset + 24, tri.v1[0], true);
    view.setFloat32(offset + 28, tri.v1[1], true);
    view.setFloat32(offset + 32, tri.v1[2], true);

    view.setFloat32(offset + 36, tri.v2[0], true);
    view.setFloat32(offset + 40, tri.v2[1], true);
    view.setFloat32(offset + 44, tri.v2[2], true);

    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  triggerDownload(blob, filename.endsWith('.stl') ? filename : `${filename}.stl`);
  return { triangleCount: triangles.length };
}

export function exportAssemblyToObj(
  root: THREE.Object3D,
  filename: string
): { triangleCount: number } {
  const { triangles, groups } = collectMeshTriangles(root);
  const lines: string[] = [
    '# AeroForge Studio CAD/CAM Wavefront OBJ Export (Units: mm)',
    `# Triangles: ${triangles.length}`,
  ];

  let vIdx = 1;
  let vnIdx = 1;

  groups.forEach((grp) => {
    if (grp.triCount === 0) return;
    lines.push(`o ${grp.name.replace(/\s+/g, '_')}`);
    for (let i = grp.startTri; i < grp.startTri + grp.triCount; i++) {
      const t = triangles[i];
      lines.push(`v ${t.v0[0].toFixed(3)} ${t.v0[1].toFixed(3)} ${t.v0[2].toFixed(3)}`);
      lines.push(`v ${t.v1[0].toFixed(3)} ${t.v1[1].toFixed(3)} ${t.v1[2].toFixed(3)}`);
      lines.push(`v ${t.v2[0].toFixed(3)} ${t.v2[1].toFixed(3)} ${t.v2[2].toFixed(3)}`);
      lines.push(`vn ${t.n[0].toFixed(4)} ${t.n[1].toFixed(4)} ${t.n[2].toFixed(4)}`);
      lines.push(`f ${vIdx}//${vnIdx} ${vIdx + 1}//${vnIdx} ${vIdx + 2}//${vnIdx}`);
      vIdx += 3;
      vnIdx += 1;
    }
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.obj') ? filename : `${filename}.obj`);
  return { triangleCount: triangles.length };
}

export function exportGCodeFile(gcode: string, filename: string): void {
  const blob = new Blob([gcode], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.nc') ? filename : `${filename}.nc`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
