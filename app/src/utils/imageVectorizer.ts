export interface VectorPoint {
  x: number;
  y: number;
}
export interface VectorContour {
  points: VectorPoint[];
  holes: VectorPoint[][];
}
export interface VectorizeOptions {
  threshold?: number;
  rdpEpsilon?: number;
  minContourArea?: number;
  maxDimension?: number;
}
export interface VectorizeResult {
  contours: VectorContour[];
  width: number;
  height: number;
  thresholdUsed: number;
}
interface Segment {
  fromKey: number;
  toKey: number;
  from: VectorPoint;
  to: VectorPoint;
}
interface RawPolygon {
  points: VectorPoint[];
  areaAbs: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
const DEFAULT_RDP_EPSILON = 1.0;
const DEFAULT_MIN_CONTOUR_AREA = 16;
function downsampleImageData(
  imageData: ImageData,
  maxDimension: number
): { data: Uint8ClampedArray; width: number; height: number } {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const maxSrc = Math.max(srcW, srcH);
  if (maxSrc <= maxDimension) {
    return { data: imageData.data, width: srcW, height: srcH };
  }
  const scale = maxDimension / maxSrc;
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  const src = imageData.data;
  for (let dy = 0; dy < dstH; dy++) {
    const syStart = Math.floor((dy * srcH) / dstH);
    const syEnd = Math.min(srcH, Math.max(syStart + 1, Math.floor(((dy + 1) * srcH) / dstH)));
    for (let dx = 0; dx < dstW; dx++) {
      const sxStart = Math.floor((dx * srcW) / dstW);
      const sxEnd = Math.min(srcW, Math.max(sxStart + 1, Math.floor(((dx + 1) * srcW) / dstW)));
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      for (let sy = syStart; sy < syEnd; sy++) {
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = (sy * srcW + sx) * 4;
          rSum += src[idx] ?? 0;
          gSum += src[idx + 1] ?? 0;
          bSum += src[idx + 2] ?? 0;
          aSum += src[idx + 3] ?? 0;
          count++;
        }
      }
      const outIdx = (dy * dstW + dx) * 4;
      const denom = count > 0 ? count : 1;
      out[outIdx] = Math.round(rSum / denom);
      out[outIdx + 1] = Math.round(gSum / denom);
      out[outIdx + 2] = Math.round(bSum / denom);
      out[outIdx + 3] = Math.round(aSum / denom);
    }
  }
  return { data: out, width: dstW, height: dstH };
}
function computeGrayscale(
  data: Uint8ClampedArray,
  width: number,
  height: number
): {
  gray: Uint8Array;
  minGray: number;
  maxGray: number;
  borderMean: number;
} {
  const total = width * height;
  const gray = new Uint8Array(total);
  let minGray = 255;
  let maxGray = 0;
  let borderSum = 0;
  let borderCount = 0;
  for (let y = 0; y < height; y++) {
    const isBorderY = y === 0 || y === height - 1;
    for (let x = 0; x < width; x++) {
      const pIdx = y * width + x;
      const rgbaIdx = pIdx * 4;
      const a = (data[rgbaIdx + 3] ?? 255) / 255;
      const r = (data[rgbaIdx] ?? 0) * a + 255 * (1 - a);
      const g = (data[rgbaIdx + 1] ?? 0) * a + 255 * (1 - a);
      const b = (data[rgbaIdx + 2] ?? 0) * a + 255 * (1 - a);
      const lum = Math.min(255, Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
      gray[pIdx] = lum;
      if (lum < minGray) minGray = lum;
      if (lum > maxGray) maxGray = lum;
      if (isBorderY || x === 0 || x === width - 1) {
        borderSum += lum;
        borderCount++;
      }
    }
  }
  return {
    gray,
    minGray,
    maxGray,
    borderMean: borderCount > 0 ? borderSum / borderCount : 255,
  };
}
function computeOtsuThreshold(gray: Uint8Array): number {
  const hist = new Int32Array(256);
  const total = gray.length;
  for (let i = 0; i < total; i++) {
    const val = gray[i] ?? 0;
    hist[val] = (hist[val] ?? 0) + 1;
  }
  let sumTotal = 0;
  for (let i = 0; i < 256; i++) {
    sumTotal += i * (hist[i] ?? 0);
  }
  let wB = 0;
  let sumB = 0;
  let maxVar = -1;
  let firstBestT = 0;
  let lastBestT = 0;
  for (let t = 0; t < 256; t++) {
    const count = hist[t] ?? 0;
    wB += count;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * count;
    const mB = sumB / wB;
    const mF = (sumTotal - sumB) / wF;
    const diff = mB - mF;
    const betweenVar = wB * wF * diff * diff;
    if (betweenVar > maxVar) {
      maxVar = betweenVar;
      firstBestT = t;
      lastBestT = t;
    } else if (betweenVar === maxVar) {
      lastBestT = t;
    }
  }
  return Math.round((firstBestT + lastBestT) / 2);
}
function interpolateFraction(g0: number, g1: number, threshold: number): number {
  const denom = g1 - g0;
  if (denom === 0) return 0.5;
  const t = (threshold - g0) / denom;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}
function traceMarchingSquares(
  gray: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  darkIsForeground: boolean
): VectorPoint[][] {
  const pW = width + 2;
  const pH = height + 2;
  const bgVal = darkIsForeground ? 255 : 0;
  const sampleGray = (gx: number, gy: number): number => {
    if (gx <= 0 || gx >= pW - 1 || gy <= 0 || gy >= pH - 1) {
      return bgVal;
    }
    return gray[(gy - 1) * width + (gx - 1)] ?? bgVal;
  };
  const isForeground = (gx: number, gy: number): boolean => {
    if (gx <= 0 || gx >= pW - 1 || gy <= 0 || gy >= pH - 1) {
      return false;
    }
    const g = gray[(gy - 1) * width + (gx - 1)] ?? bgVal;
    return darkIsForeground ? g <= threshold : g >= threshold;
  };
  // Unique integer keys for horizontal and vertical edges on the (pW - 1) x (pH - 1) cell grid.
  const hStride = pW;
  const vOffset = pW * pH + 10;
  const hKey = (cx: number, cy: number): number => cy * hStride + cx;
  const vKey = (cx: number, cy: number): number => vOffset + cy * hStride + cx;
  const hPoint = (cx: number, cy: number): VectorPoint => {
    const g0 = sampleGray(cx, cy);
    const g1 = sampleGray(cx + 1, cy);
    const t = interpolateFraction(g0, g1, threshold);
    const x = Math.min(width, Math.max(0, cx - 0.5 + t));
    const y = Math.min(height, Math.max(0, cy - 0.5));
    return { x, y };
  };
  const vPoint = (cx: number, cy: number): VectorPoint => {
    const g0 = sampleGray(cx, cy);
    const g1 = sampleGray(cx, cy + 1);
    const t = interpolateFraction(g0, g1, threshold);
    const x = Math.min(width, Math.max(0, cx - 0.5));
    const y = Math.min(height, Math.max(0, cy - 0.5 + t));
    return { x, y };
  };
  const segmentsByFrom = new Map<number, Segment>();
  const allSegments: Segment[] = [];
  const addSeg = (fromKey: number, toKey: number, from: VectorPoint, to: VectorPoint): void => {
    const seg: Segment = { fromKey, toKey, from, to };
    segmentsByFrom.set(fromKey, seg);
    allSegments.push(seg);
  };
  const cellW = pW - 1;
  const cellH = pH - 1;
  for (let cy = 0; cy < cellH; cy++) {
    for (let cx = 0; cx < cellW; cx++) {
      const tl = isForeground(cx, cy) ? 1 : 0;
      const tr = isForeground(cx + 1, cy) ? 1 : 0;
      const br = isForeground(cx + 1, cy + 1) ? 1 : 0;
      const bl = isForeground(cx, cy + 1) ? 1 : 0;
      const code = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (code === 0 || code === 15) continue;
      const tKey = hKey(cx, cy);
      const rKey = vKey(cx + 1, cy);
      const bKey = hKey(cx, cy + 1);
      const lKey = vKey(cx, cy);
      const getT = () => hPoint(cx, cy);
      const getR = () => vPoint(cx + 1, cy);
      const getB = () => hPoint(cx, cy + 1);
      const getL = () => vPoint(cx, cy);
      switch (code) {
        case 1:
          addSeg(lKey, bKey, getL(), getB());
          break;
        case 2:
          addSeg(bKey, rKey, getB(), getR());
          break;
        case 3:
          addSeg(lKey, rKey, getL(), getR());
          break;
        case 4:
          addSeg(rKey, tKey, getR(), getT());
          break;
        case 5: {
          const avg =
            (sampleGray(cx, cy) +
              sampleGray(cx + 1, cy) +
              sampleGray(cx + 1, cy + 1) +
              sampleGray(cx, cy + 1)) / 4;
          const centerFg = darkIsForeground ? avg <= threshold : avg >= threshold;
          if (centerFg) {
            addSeg(lKey, tKey, getL(), getT());
            addSeg(rKey, bKey, getR(), getB());
          } else {
            addSeg(lKey, bKey, getL(), getB());
            addSeg(rKey, tKey, getR(), getT());
          }
          break;
        }
        case 6:
          addSeg(bKey, tKey, getB(), getT());
          break;
        case 7:
          addSeg(lKey, tKey, getL(), getT());
          break;
        case 8:
          addSeg(tKey, lKey, getT(), getL());
          break;
        case 9:
          addSeg(tKey, bKey, getT(), getB());
          break;
        case 10: {
          const avg =
            (sampleGray(cx, cy) +
              sampleGray(cx + 1, cy) +
              sampleGray(cx + 1, cy + 1) +
              sampleGray(cx, cy + 1)) / 4;
          const centerFg = darkIsForeground ? avg <= threshold : avg >= threshold;
          if (centerFg) {
            addSeg(tKey, rKey, getT(), getR());
            addSeg(bKey, lKey, getB(), getL());
          } else {
            addSeg(tKey, lKey, getT(), getL());
            addSeg(bKey, rKey, getB(), getR());
          }
          break;
        }
        case 11:
          addSeg(tKey, rKey, getT(), getR());
          break;
        case 12:
          addSeg(rKey, lKey, getR(), getL());
          break;
        case 13:
          addSeg(rKey, bKey, getR(), getB());
          break;
        case 14:
          addSeg(bKey, lKey, getB(), getL());
          break;
        default:
          break;
      }
    }
  }
  const visited = new Set<number>();
  const loops: VectorPoint[][] = [];
  for (let i = 0; i < allSegments.length; i++) {
    const startSeg = allSegments[i];
    if (!startSeg || visited.has(startSeg.fromKey)) continue;
    const rawLoop: VectorPoint[] = [];
    let current: Segment | undefined = startSeg;
    while (current && !visited.has(current.fromKey)) {
      visited.add(current.fromKey);
      rawLoop.push(current.from);
      if (current.toKey === startSeg.fromKey) {
        break;
      }
      current = segmentsByFrom.get(current.toKey);
    }
    const deduped: VectorPoint[] = [];
    for (let j = 0; j < rawLoop.length; j++) {
      const pt = rawLoop[j];
      if (!pt) continue;
      const prev = deduped[deduped.length - 1];
      if (!prev) {
        deduped.push(pt);
      } else {
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        if (dx * dx + dy * dy > 1e-12) {
          deduped.push(pt);
        }
      }
    }
    if (deduped.length >= 3) {
      const first = deduped[0];
      const last = deduped[deduped.length - 1];
      if (first && last) {
        const dx = first.x - last.x;
        const dy = first.y - last.y;
        if (dx * dx + dy * dy <= 1e-12) {
          deduped.pop();
        }
      }
    }
    if (deduped.length >= 3) {
      loops.push(deduped);
    }
  }
  return loops;
}
function perpendicularDistance(pt: VectorPoint, a: VectorPoint, b: VectorPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const px = pt.x - a.x;
    const py = pt.y - a.y;
    return Math.sqrt(px * px + py * py);
  }
  const area2 = Math.abs(dy * pt.x - dx * pt.y + b.x * a.y - b.y * a.x);
  return area2 / Math.sqrt(lenSq);
}
function rdpOpenChain(points: VectorPoint[], epsilon: number): VectorPoint[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const range = stack.pop();
    if (!range) continue;
    const startIdx = range[0];
    const endIdx = range[1];
    if (endIdx - startIdx <= 1) continue;
    const a = points[startIdx];
    const b = points[endIdx];
    if (!a || !b) continue;
    let maxDist = -1;
    let maxIdx = -1;
    for (let i = startIdx + 1; i < endIdx; i++) {
      const p = points[i];
      if (!p) continue;
      const d = perpendicularDistance(p, a, b);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilon && maxIdx !== -1) {
      keep[maxIdx] = 1;
      stack.push([startIdx, maxIdx]);
      stack.push([maxIdx, endIdx]);
    }
  }
  const out: VectorPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i] === 1) {
      const pt = points[i];
      if (pt) out.push(pt);
    }
  }
  return out;
}
function simplifyClosedPolygon(points: VectorPoint[], epsilon: number): VectorPoint[] {
  const n = points.length;
  if (n < 3) return [];
  if (epsilon <= 0) return points.slice();
  const p0 = points[0];
  if (!p0) return [];
  let idxA = 0;
  let maxDistA = -1;
  for (let i = 1; i < n; i++) {
    const p = points[i];
    if (!p) continue;
    const dx = p.x - p0.x;
    const dy = p.y - p0.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxDistA) {
      maxDistA = d2;
      idxA = i;
    }
  }
  const pA = points[idxA];
  if (!pA) return [];
  let idxB = idxA;
  let maxDistB = -1;
  for (let i = 0; i < n; i++) {
    if (i === idxA) continue;
    const p = points[i];
    if (!p) continue;
    const dx = p.x - pA.x;
    const dy = p.y - pA.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxDistB) {
      maxDistB = d2;
      idxB = i;
    }
  }
  if (idxA === idxB) return [];
  const chain1: VectorPoint[] = [];
  let cursor = idxA;
  while (true) {
    const pt = points[cursor];
    if (pt) chain1.push(pt);
    if (cursor === idxB) break;
    cursor = (cursor + 1) % n;
  }
  const chain2: VectorPoint[] = [];
  cursor = idxB;
  while (true) {
    const pt = points[cursor];
    if (pt) chain2.push(pt);
    if (cursor === idxA) break;
    cursor = (cursor + 1) % n;
  }
  const simp1 = rdpOpenChain(chain1, epsilon);
  const simp2 = rdpOpenChain(chain2, epsilon);
  const combined: VectorPoint[] = [];
  for (let i = 0; i < simp1.length - 1; i++) {
    const pt = simp1[i];
    if (pt) combined.push(pt);
  }
  for (let i = 0; i < simp2.length - 1; i++) {
    const pt = simp2[i];
    if (pt) combined.push(pt);
  }
  return combined;
}
function polygonSignedArea(points: VectorPoint[]): number {
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    if (!p1 || !p2) continue;
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return sum * 0.5;
}
function pointInPolygon(pt: VectorPoint, polygon: VectorPoint[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    const intersect =
      pi.y > pt.y !== pj.y > pt.y &&
      pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}
function polygonInsidePolygon(inner: RawPolygon, outer: RawPolygon): boolean {
  if (
    inner.minX < outer.minX ||
    inner.maxX > outer.maxX ||
    inner.minY < outer.minY ||
    inner.maxY > outer.maxY
  ) {
    return false;
  }
  let insideVotes = 0;
  const sampleCount = Math.min(inner.points.length, 8);
  const step = Math.max(1, Math.floor(inner.points.length / sampleCount));
  let tested = 0;
  for (let i = 0; i < inner.points.length && tested < sampleCount; i += step) {
    const p = inner.points[i];
    if (!p) continue;
    tested++;
    if (pointInPolygon(p, outer.points)) {
      insideVotes++;
    }
  }
  return tested > 0 && insideVotes * 2 > tested;
}
export function vectorizeImageData(
  imageData: ImageData,
  options?: VectorizeOptions
): VectorizeResult {
  if (
    !imageData ||
    !Number.isInteger(imageData.width) ||
    !Number.isInteger(imageData.height) ||
    imageData.width <= 0 ||
    imageData.height <= 0 ||
    !imageData.data ||
    imageData.data.length < imageData.width * imageData.height * 4
  ) {
    throw new Error('Invalid ImageData: non-empty width, height, and RGBA buffer are required.');
  }
  const rdpEpsilon = options?.rdpEpsilon ?? DEFAULT_RDP_EPSILON;
  if (!Number.isFinite(rdpEpsilon) || rdpEpsilon < 0) {
    throw new Error(`Invalid rdpEpsilon (${String(rdpEpsilon)}): must be a finite number >= 0.`);
  }
  const minContourArea = options?.minContourArea ?? DEFAULT_MIN_CONTOUR_AREA;
  if (!Number.isFinite(minContourArea) || minContourArea < 0) {
    throw new Error(`Invalid minContourArea (${String(minContourArea)}): must be a finite number >= 0.`);
  }
  if (options?.threshold !== undefined) {
    if (!Number.isFinite(options.threshold) || options.threshold < 0 || options.threshold > 255) {
      throw new Error(`Invalid threshold (${String(options.threshold)}): must be a finite number between 0 and 255.`);
    }
  }
  if (options?.maxDimension !== undefined) {
    if (!Number.isFinite(options.maxDimension) || options.maxDimension < 1) {
      throw new Error(`Invalid maxDimension (${String(options.maxDimension)}): must be a finite number >= 1.`);
    }
  }
  const sampled =
    options?.maxDimension !== undefined ? downsampleImageData(imageData, Math.floor(options.maxDimension))
      : { data: imageData.data, width: imageData.width, height: imageData.height };
  const { gray, minGray, maxGray, borderMean } = computeGrayscale(
    sampled.data,
    sampled.width,
    sampled.height
  );
  if (minGray === maxGray) {
    throw new Error('Image has uniform brightness with no foreground/background contrast; cannot trace contours.');
  }
  const thresholdUsed =
    options?.threshold !== undefined ? options.threshold : computeOtsuThreshold(gray);
  const darkIsForeground = borderMean >= 128;
  const rawLoops = traceMarchingSquares(
    gray,
    sampled.width,
    sampled.height,
    thresholdUsed,
    darkIsForeground
  );
  if (rawLoops.length === 0) {
    throw new Error(`No contours found at threshold ${thresholdUsed}. Try adjusting the threshold or uploading a higher-contrast image.`);
  }
  const filtered: RawPolygon[] = [];
  for (let i = 0; i < rawLoops.length; i++) {
    const raw = rawLoops[i];
    if (!raw || raw.length < 3) continue;
    const simplified = simplifyClosedPolygon(raw, rdpEpsilon);
    if (simplified.length < 3) continue;
    const areaAbs = Math.abs(polygonSignedArea(simplified));
    if (areaAbs < minContourArea || areaAbs <= 1e-6) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let j = 0; j < simplified.length; j++) {
      const p = simplified[j];
      if (!p) continue;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    filtered.push({
      points: simplified,
      areaAbs,
      minX,
      minY,
      maxX,
      maxY,
    });
  }
  if (filtered.length === 0) {
    throw new Error(`All traced contours were empty or smaller than minContourArea (${minContourArea} px²) at threshold ${thresholdUsed} and RDP epsilon ${rdpEpsilon}. Adjust threshold, lower RDP epsilon, or lower minimum area.`);
  }
  // Sort largest area first so enclosing contours always precede enclosed contours.
  filtered.sort((a, b) => b.areaAbs - a.areaAbs);
  const parentIndex = new Int32Array(filtered.length);
  const depth = new Int32Array(filtered.length);
  parentIndex.fill(-1);
  for (let i = 0; i < filtered.length; i++) {
    const inner = filtered[i];
    if (!inner) continue;
    // Walk backwards from i - 1 to 0 to find the smallest-area enclosing contour.
    for (let p = i - 1; p >= 0; p--) {
      const outer = filtered[p];
      if (!outer) continue;
      if (outer.areaAbs <= inner.areaAbs) continue;
      if (polygonInsidePolygon(inner, outer)) {
        parentIndex[i] = p;
        depth[i] = (depth[p] ?? 0) + 1;
        break;
      }
    }
  }
  const contourByIndex = new Map<number, VectorContour>();
  const contours: VectorContour[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const poly = filtered[i];
    if (!poly) continue;
    const d = depth[i] ?? 0;
    if (d % 2 === 0) {
      const contour: VectorContour = {
        points: poly.points,
        holes: [],
      };
      contourByIndex.set(i, contour);
      contours.push(contour);
    } else {
      const pIdx = parentIndex[i] ?? -1;
      const parentContour = contourByIndex.get(pIdx);
      if (parentContour) {
        parentContour.holes.push(poly.points);
      } else {
        contours.push({
          points: poly.points,
          holes: [],
        });
      }
    }
  }
  if (contours.length === 0) {
    throw new Error('Failed to extract any outer contours from the traced image.');
  }
  return {
    contours,
    width: sampled.width,
    height: sampled.height,
    thresholdUsed,
  };
}
function loadImageViaDataUrl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read image file "${file.name}".`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error(`Failed to decode image file "${file.name}" as data URL.`));
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Browser could not decode image "${file.name}".`));
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
export async function vectorizeImageFile(
  file: File,
  options?: VectorizeOptions
): Promise<VectorizeResult> {
  if (!file) {
    throw new Error('No image file was provided.');
  }
  const lowerName = file.name.toLowerCase();
  const isPngOrJpg =
    file.type === 'image/png' ||
    file.type === 'image/jpeg' ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg');
  if (!isPngOrJpg) {
    throw new Error(`Unsupported image format "${file.type || file.name}". Only PNG and JPG images are supported.`);
  }
  if (options?.maxDimension !== undefined) {
    if (!Number.isFinite(options.maxDimension) || options.maxDimension < 1) {
      throw new Error(`Invalid maxDimension (${String(options.maxDimension)}): must be a finite number >= 1.`);
    }
  }
  let source: CanvasImageSource;
  let srcWidth = 0;
  let srcHeight = 0;
  let bitmapToClose: ImageBitmap | null = null;
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    bitmapToClose = bitmap;
    source = bitmap;
    srcWidth = bitmap.width;
    srcHeight = bitmap.height;
  } else {
    const img = await loadImageViaDataUrl(file);
    source = img;
    srcWidth = img.naturalWidth || img.width;
    srcHeight = img.naturalHeight || img.height;
  }
  try {
    if (srcWidth <= 0 || srcHeight <= 0) {
      throw new Error(`Decoded image "${file.name}" has zero dimensions.`);
    }
    let targetWidth = srcWidth;
    let targetHeight = srcHeight;
    if (options?.maxDimension !== undefined && Math.max(srcWidth, srcHeight) > options.maxDimension) {
      const scale = options.maxDimension / Math.max(srcWidth, srcHeight);
      targetWidth = Math.max(1, Math.round(srcWidth * scale));
      targetHeight = Math.max(1, Math.round(srcHeight * scale));
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not obtain a 2D canvas context to decode the image.');
    }
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    return vectorizeImageData(imageData, {
      ...options,
      maxDimension: undefined,
    });
  } finally {
    if (bitmapToClose) {
      bitmapToClose.close();
    }
  }
}
export function scalePointsToMm(
  points: VectorPoint[],
  pixelsPerMm: number
): VectorPoint[] {
  if (!Number.isFinite(pixelsPerMm) || pixelsPerMm <= 0) {
    throw new Error(`Invalid pixelsPerMm (${String(pixelsPerMm)}): must be a finite number greater than 0.`);
  }
  const scaled: VectorPoint[] = new Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) continue;
    scaled[i] = {
      x: p.x / pixelsPerMm,
      y: p.y / pixelsPerMm,
    };
  }
  return scaled;
}
