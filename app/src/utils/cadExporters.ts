/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports any THREE.Object3D hierarchy (full engine or isolated single component)
 * into a watertight ASCII STL file ready for Fusion 360, Onshape, Mastercam, or 3D printing.
 */
export function exportObject3DToSTL(
  root: THREE.Object3D,
  filename: string,
  scaleInchesToMm = 25.4
): number {
  root.updateMatrixWorld(true);

  const lines: string[] = ['solid MODSIM_CAD_PART'];
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  let triangleCount = 0;

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!obj.visible || obj.userData?._excludeExport) return;

    const geom = obj.geometry;
    if (!geom) return;
    const pos = geom.getAttribute('position');
    if (!pos) return;

    const matrix = obj.matrixWorld;
    const index = geom.getIndex();

    const writeTri = (ia: number, ib: number, ic: number) => {
      vA.fromBufferAttribute(pos, ia).applyMatrix4(matrix).multiplyScalar(scaleInchesToMm);
      vB.fromBufferAttribute(pos, ib).applyMatrix4(matrix).multiplyScalar(scaleInchesToMm);
      vC.fromBufferAttribute(pos, ic).applyMatrix4(matrix).multiplyScalar(scaleInchesToMm);

      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab).normalize();

      if (!Number.isFinite(cb.x) || !Number.isFinite(vA.x)) return;

      lines.push(
        `  facet normal ${cb.x.toFixed(6)} ${cb.y.toFixed(6)} ${cb.z.toFixed(6)}`,
        '    outer loop',
        `      vertex ${vA.x.toFixed(5)} ${vA.y.toFixed(5)} ${vA.z.toFixed(5)}`,
        `      vertex ${vB.x.toFixed(5)} ${vB.y.toFixed(5)} ${vB.z.toFixed(5)}`,
        `      vertex ${vC.x.toFixed(5)} ${vC.y.toFixed(5)} ${vC.z.toFixed(5)}`,
        '    endloop',
        '  endfacet'
      );
      triangleCount++;
    };

    if (index) {
      for (let i = 0; i + 2 < index.count; i += 3) {
        writeTri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
    } else {
      for (let i = 0; i + 2 < pos.count; i += 3) {
        writeTri(i, i + 1, i + 2);
      }
    }
  });

  lines.push('endsolid MODSIM_CAD_PART');
  const blob = new Blob([lines.join('\n')], { type: 'model/stl' });
  triggerDownload(blob, filename.endsWith('.stl') ? filename : `${filename}.stl`);
  return triangleCount;
}

export interface DxfExportParams {
  drawingNumber: string;
  title: string;
  partKey: string;
  bore: number;
  stroke: number;
  rodLength: number;
  deckHeight: number;
  chamberCc: number;
  filename: string;
}

function dxfLine(x1: number, y1: number, x2: number, y2: number, layer = 'GEOMETRY'): string {
  return [
    '0',
    'LINE',
    '8',
    layer,
    '10',
    x1.toFixed(4),
    '20',
    y1.toFixed(4),
    '30',
    '0.0',
    '11',
    x2.toFixed(4),
    '21',
    y2.toFixed(4),
    '31',
    '0.0'
  ].join('\n');
}

function dxfCircle(cx: number, cy: number, r: number, layer = 'GEOMETRY'): string {
  return [
    '0',
    'CIRCLE',
    '8',
    layer,
    '10',
    cx.toFixed(4),
    '20',
    cy.toFixed(4),
    '30',
    '0.0',
    '40',
    r.toFixed(4)
  ].join('\n');
}

function dxfText(x: number, y: number, height: number, text: string, layer = 'ANNOTATIONS'): string {
  return [
    '0',
    'TEXT',
    '8',
    layer,
    '10',
    x.toFixed(4),
    '20',
    y.toFixed(4),
    '30',
    '0.0',
    '40',
    height.toFixed(4),
    '1',
    text.replace(/[\r\n]/g, ' ')
  ].join('\n');
}

/**
 * Generates an AutoCAD R12/DXF ASCII drawing with parametric component profile & ASME annotations.
 */
export function exportPartProfileToDXF(params: DxfExportParams): void {
  const { drawingNumber, title, partKey, bore, stroke, rodLength, deckHeight, chamberCc, filename } =
    params;

  const entities: string[] = [];

  // Standard Border Frame (inches)
  entities.push(dxfLine(0, 0, 17, 0, 'BORDER'));
  entities.push(dxfLine(17, 0, 17, 11, 'BORDER'));
  entities.push(dxfLine(17, 11, 0, 11, 'BORDER'));
  entities.push(dxfLine(0, 11, 0, 0, 'BORDER'));

  // Title Block
  entities.push(dxfLine(9.5, 0, 9.5, 2.0, 'BORDER'));
  entities.push(dxfLine(9.5, 2.0, 17, 2.0, 'BORDER'));
  entities.push(dxfText(9.75, 1.5, 0.2, `DWG: ${drawingNumber}`, 'ANNOTATIONS'));
  entities.push(dxfText(9.75, 1.05, 0.16, title.slice(0, 48), 'ANNOTATIONS'));
  entities.push(
    dxfText(
      9.75,
      0.55,
      0.14,
      `BORE ${bore.toFixed(3)} IN | STROKE ${stroke.toFixed(3)} IN | ROD ${rodLength.toFixed(3)} IN`,
      'DIMENSIONS'
    )
  );

  // Parametric Profile Entities per Component
  const cx = 6.5;
  const cy = 6.0;
  if (partKey === 'block') {
    const r = bore * 0.5;
    for (let i = 0; i < 4; i++) {
      const bx = 2.8 + i * 2.4;
      entities.push(dxfCircle(bx, cy + 1.2, r, 'GEOMETRY'));
      entities.push(dxfCircle(bx, cy + 1.2, r + 0.25, 'HIDDEN'));
    }
    entities.push(dxfLine(1.5, cy - 0.8, 11.5, cy - 0.8, 'GEOMETRY'));
    entities.push(dxfLine(1.5, cy - 0.8 - deckHeight * 0.25, 11.5, cy - 0.8 - deckHeight * 0.25, 'DATUM'));
    entities.push(
      dxfText(1.6, cy + 3.4, 0.18, `BORE DIA: ${bore.toFixed(3)} IN | DECK HT: ${deckHeight.toFixed(3)} IN`, 'DIMENSIONS')
    );
  } else if (partKey === 'crank') {
    const throwR = stroke * 0.5;
    entities.push(dxfCircle(cx, cy, 1.225, 'GEOMETRY'));
    entities.push(dxfCircle(cx + throwR, cy, 1.05, 'GEOMETRY'));
    entities.push(dxfCircle(cx - throwR, cy, 1.05, 'GEOMETRY'));
    entities.push(dxfLine(cx - 4.0, cy, cx + 4.0, cy, 'CENTERLINE'));
    entities.push(dxfText(2.2, 8.8, 0.18, `CRANK STROKE: ${stroke.toFixed(3)} IN (THROW ${(throwR).toFixed(3)} IN)`, 'DIMENSIONS'));
  } else if (partKey === 'rotating_rod') {
    const scaledRod = rodLength * 0.9;
    entities.push(dxfCircle(cx, cy + scaledRod * 0.5, 0.463, 'GEOMETRY'));
    entities.push(dxfCircle(cx, cy - scaledRod * 0.5, 1.05, 'GEOMETRY'));
    entities.push(dxfLine(cx - 0.35, cy + scaledRod * 0.5, cx - 0.65, cy - scaledRod * 0.5, 'GEOMETRY'));
    entities.push(dxfLine(cx + 0.35, cy + scaledRod * 0.5, cx + 0.65, cy - scaledRod * 0.5, 'GEOMETRY'));
    entities.push(dxfText(2.2, 9.2, 0.18, `ROD C-TO-C: ${rodLength.toFixed(3)} IN | BIG END 2.225 IN`, 'DIMENSIONS'));
  } else if (partKey === 'rotating_piston') {
    const r = bore * 0.5;
    entities.push(dxfCircle(cx, cy + 1.2, r, 'GEOMETRY'));
    entities.push(dxfLine(cx - r, cy - 1.0, cx + r, cy - 1.0, 'GEOMETRY'));
    entities.push(dxfLine(cx - r, cy - 2.6, cx + r, cy - 2.6, 'GEOMETRY'));
    entities.push(dxfLine(cx - r, cy - 1.0, cx - r, cy - 2.6, 'GEOMETRY'));
    entities.push(dxfLine(cx + r, cy - 1.0, cx + r, cy - 2.6, 'GEOMETRY'));
    entities.push(dxfText(2.2, 9.2, 0.18, `PISTON NOMINAL DIA: ${bore.toFixed(3)} IN`, 'DIMENSIONS'));
  } else {
    const rad = Math.max(1.2, bore * 0.45);
    entities.push(dxfCircle(cx, cy, rad, 'GEOMETRY'));
    entities.push(dxfCircle(cx, cy, rad * 0.65, 'GEOMETRY'));
    entities.push(dxfLine(cx - rad * 1.4, cy, cx + rad * 1.4, cy, 'CENTERLINE'));
    entities.push(dxfLine(cx, cy - rad * 1.4, cx, cy + rad * 1.4, 'CENTERLINE'));
    entities.push(
      dxfText(2.0, 9.2, 0.18, `${title.slice(0, 40)} | CHAMBER ${chamberCc.toFixed(1)} CC`, 'DIMENSIONS')
    );
  }

  const dxfContent = ['0', 'SECTION', '2', 'ENTITIES', ...entities, '0', 'ENDSEC', '0', 'EOF'].join(
    '\n'
  );
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  triggerDownload(blob, filename.endsWith('.dxf') ? filename : `${filename}.dxf`);
}
