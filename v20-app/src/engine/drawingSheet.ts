/**
 * Quantum Aerospace Drawing Sheet Renderer
 * Browser-Functional Live SVG Orthographic Plan & Section Views, Datum Reference Frame, and Title Block
 */
import { ParametricPartConfig } from './cadEngine';
import { formatDimension, FABRICATION_TIERS } from './standards';

export function renderDrawingSheetSvg(
  config: ParametricPartConfig,
  displayMetric: boolean,
  signOffEngineer: string = 'R. RAYS'
): string {
  const widthIn = config.widthIn;
  const heightIn = config.heightIn;
  const thicknessIn = config.thicknessIn;
  const tier = FABRICATION_TIERS[config.tierId] || FABRICATION_TIERS.tier2_jobshop;

  // SVG Sheet Dimensions: 900 x 600 px (Engineering Landscape)
  const svgW = 900;
  const svgH = 600;

  // Formatting strings
  const wStr = formatDimension(widthIn, displayMetric);
  const hStr = formatDimension(heightIn, displayMetric);
  const tStr = formatDimension(thicknessIn, displayMetric);
  const tolStr = displayMetric ? `±${(tier.toleranceIn * 25.4).toFixed(3)} mm` : `±${tier.toleranceIn.toFixed(4)} in`;

  // Scale part to fit nicely in 320x300 box
  const maxPartDim = Math.max(widthIn, heightIn, 0.1);
  const scale = 220 / maxPartDim;
  const partPxW = widthIn * scale;
  const partPxH = heightIn * scale;

  // Plan view center
  const planCx = 260;
  const planCy = 230;

  // Section view center
  const secCx = 640;
  const secCy = 230;
  const secPxH = Math.max(16, thicknessIn * scale * 2.5);

  let holesSvg = '';
  // Corner holes
  if (config.hasCornerHoles) {
    const margin = config.cornerHoleMarginIn * scale;
    const rad = (config.cornerHoleDiaIn / 2) * scale;
    const cxOffset = partPxW / 2 - margin;
    const cyOffset = partPxH / 2 - margin;
    const corners = [
      [planCx - cxOffset, planCy - cyOffset],
      [planCx + cxOffset, planCy - cyOffset],
      [planCx + cxOffset, planCy + cyOffset],
      [planCx - cxOffset, planCy + cyOffset],
    ];
    for (const [x, y] of corners) {
      holesSvg += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />`;
      // Center mark
      holesSvg += `<line x1="${x - rad - 4}" y1="${y}" x2="${x + rad + 4}" y2="${y}" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="2,2"/>`;
      holesSvg += `<line x1="${x}" y1="${y - rad - 4}" x2="${x}" y2="${y + rad + 4}" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="2,2"/>`;
    }
  }

  // Bolt circle
  if (config.hasBoltCircle && config.boltCircleCount > 0) {
    const pcdRad = (config.boltCirclePcdIn / 2) * scale;
    const hRad = (config.boltCircleHoleDiaIn / 2) * scale;
    // PCD centerline circle
    holesSvg += `<circle cx="${planCx}" cy="${planCy}" r="${pcdRad}" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3" />`;
    for (let i = 0; i < config.boltCircleCount; i++) {
      const ang = (i * 2 * Math.PI) / config.boltCircleCount;
      const x = planCx + Math.cos(ang) * pcdRad;
      const y = planCy + Math.sin(ang) * pcdRad;
      holesSvg += `<circle cx="${x}" cy="${y}" r="${hRad}" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />`;
    }
  }

  // Slot
  if (config.hasCenterSlot) {
    const sLen = config.slotLengthIn * scale;
    const sWid = config.slotWidthIn * scale;
    const sRad = sWid / 2;
    holesSvg += `<rect x="${planCx - sLen / 2}" y="${planCy - sWid / 2}" width="${sLen}" height="${sWid}" rx="${sRad}" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />`;
    holesSvg += `<line x1="${planCx - sLen / 2 - 6}" y1="${planCy}" x2="${planCx + sLen / 2 + 6}" y2="${planCy}" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="3,3" />`;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background:#090d16; font-family:'JetBrains Mono', monospace, sans-serif;">
  <defs>
    <!-- Crosshatch pattern for section cut -->
    <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" stroke-width="1" opacity="0.6"/>
    </pattern>
    <!-- Arrow marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8"/>
    </marker>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#38bdf8"/>
    </marker>
  </defs>

  <!-- Sheet Border & Engineering Margin -->
  <rect x="15" y="15" width="${svgW - 30}" height="${svgH - 30}" fill="#060911" stroke="#1e293b" stroke-width="2"/>
  <rect x="25" y="25" width="${svgW - 50}" height="${svgH - 50}" fill="none" stroke="#334155" stroke-width="1.5"/>

  <!-- Grid Reference Markers (A-D, 1-6) -->
  <g fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">
    <text x="${svgW / 2}" y="20">QUANTUM AEROSPACE DESIGN STUDIO — ASME Y14.5 / ISO 10303-242 DRAFTING BASELINE</text>
    <text x="20" y="150">A</text>
    <text x="20" y="300">B</text>
    <text x="20" y="450">C</text>
    <text x="150" y="${svgH - 18}">1</text>
    <text x="350" y="${svgH - 18}">2</text>
    <text x="550" y="${svgH - 18}">3</text>
    <text x="750" y="${svgH - 18}">4</text>
  </g>

  <!-- Title Block (Bottom Right) -->
  <g transform="translate(${svgW - 390}, ${svgH - 165})">
    <rect x="0" y="0" width="365" height="140" fill="#0b1120" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="0" y1="28" x2="365" y2="28" stroke="#1e293b" stroke-width="1"/>
    <line x1="0" y1="56" x2="365" y2="56" stroke="#1e293b" stroke-width="1"/>
    <line x1="0" y1="84" x2="365" y2="84" stroke="#1e293b" stroke-width="1"/>
    <line x1="0" y1="112" x2="365" y2="112" stroke="#1e293b" stroke-width="1"/>
    <line x1="180" y1="56" x2="180" y2="140" stroke="#1e293b" stroke-width="1"/>

    <!-- Title text -->
    <text x="12" y="19" fill="#38bdf8" font-size="12" font-weight="bold">QUANTUM AEROSPACE DESIGN STUDIO</text>
    <text x="350" y="19" fill="#94a3b8" font-size="9" text-anchor="end">SBC 350 v20.0.0</text>

    <text x="12" y="46" fill="#f8fafc" font-size="13" font-weight="bold">${config.name.toUpperCase()}</text>
    <text x="350" y="46" fill="#0284c7" font-size="10" font-weight="bold" text-anchor="end">STAGE: 3D EXTRUDE</text>

    <text x="12" y="73" fill="#94a3b8" font-size="9">MATERIAL: <tspan fill="#f8fafc" font-weight="bold">${config.materialName}</tspan></text>
    <text x="190" y="73" fill="#94a3b8" font-size="9">TOL: <tspan fill="#38bdf8" font-weight="bold">${tolStr}</tspan></text>

    <text x="12" y="101" fill="#94a3b8" font-size="9">SUBSYSTEM: <tspan fill="#f8fafc">${config.subsystem}</tspan></text>
    <text x="190" y="101" fill="#94a3b8" font-size="9">SCALE: <tspan fill="#f8fafc">${scale > 20 ? '1:1' : '1:2'}</tspan> UNITS: <tspan fill="#38bdf8">${displayMetric ? 'MM' : 'INCH'}</tspan></text>

    <text x="12" y="129" fill="#94a3b8" font-size="9">ENGINEER: <tspan fill="#f8fafc">${signOffEngineer}</tspan></text>
    <text x="190" y="129" fill="#f59e0b" font-size="9" font-weight="bold">STATUS: DRAFT</text>
  </g>

  <!-- VIEW 1: Orthographic Plan View (Top) -->
  <g id="planView">
    <text x="${planCx}" y="65" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">VIEW A: PLAN VIEW (TOP)</text>
    <text x="${planCx}" y="80" fill="#64748b" font-size="9" text-anchor="middle">PRIMARY DATUMS [A] [B] [C]</text>

    <!-- Part Boundary (Plan) -->
    <rect x="${planCx - partPxW / 2}" y="${planCy - partPxH / 2}" width="${partPxW}" height="${partPxH}" rx="${config.cornerRadiusIn * scale}" fill="#091424" stroke="#38bdf8" stroke-width="2"/>

    <!-- Cutout Holes and Features -->
    ${holesSvg}

    <!-- Centerlines -->
    <line x1="${planCx - partPxW / 2 - 20}" y1="${planCy}" x2="${planCx + partPxW / 2 + 20}" y2="${planCy}" stroke="#475569" stroke-width="1" stroke-dasharray="8,3,2,3"/>
    <line x1="${planCx}" y1="${planCy - partPxH / 2 - 20}" x2="${planCx}" y2="${planCy + partPxH / 2 + 20}" stroke="#475569" stroke-width="1" stroke-dasharray="8,3,2,3"/>

    <!-- Dimension: Width (Horizontal Bottom) -->
    <g transform="translate(0, ${planCy + partPxH / 2 + 25})">
      <line x1="${planCx - partPxW / 2}" y1="0" x2="${planCx + partPxW / 2}" y2="0" stroke="#38bdf8" stroke-width="1.2" marker-start="url(#arrow-start)" marker-end="url(#arrow)"/>
      <line x1="${planCx - partPxW / 2}" y1="-18" x2="${planCx - partPxW / 2}" y2="5" stroke="#475569" stroke-width="1"/>
      <line x1="${planCx + partPxW / 2}" y1="-18" x2="${planCx + partPxW / 2}" y2="5" stroke="#475569" stroke-width="1"/>
      <rect x="${planCx - 40}" y="-10" width="80" height="18" fill="#060911"/>
      <text x="${planCx}" y="3" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle">${wStr}</text>
    </g>

    <!-- Dimension: Height (Vertical Left) -->
    <g transform="translate(${planCx - partPxW / 2 - 25}, 0)">
      <line x1="0" y1="${planCy - partPxH / 2}" x2="0" y2="${planCy + partPxH / 2}" stroke="#38bdf8" stroke-width="1.2" marker-start="url(#arrow-start)" marker-end="url(#arrow)"/>
      <line x1="5" y1="${planCy - partPxH / 2}" x2="-18" y2="${planCy - partPxH / 2}" stroke="#475569" stroke-width="1"/>
      <line x1="5" y1="${planCy + partPxH / 2}" x2="-18" y2="${planCy + partPxH / 2}" stroke="#475569" stroke-width="1"/>
      <rect x="-10" y="${planCy - 15}" width="20" height="30" fill="#060911"/>
      <text x="-4" y="${planCy + 4}" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle" transform="rotate(-90 -4 ${planCy + 4})">${hStr}</text>
    </g>

    <!-- Datum Feature Symbols [A] and [B] -->
    <g transform="translate(${planCx - partPxW / 2 - 35}, ${planCy + partPxH / 2})">
      <rect x="0" y="0" width="18" height="18" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="9" y="13" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">A</text>
    </g>
    <g transform="translate(${planCx - partPxW / 2}, ${planCy - partPxH / 2 - 35})">
      <rect x="0" y="0" width="18" height="18" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="9" y="13" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">B</text>
    </g>

    <!-- Cutting Plane Line A-A -->
    <line x1="${planCx - partPxW / 2 - 15}" y1="${planCy}" x2="${planCx + partPxW / 2 + 15}" y2="${planCy}" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="12,4,4,4"/>
    <text x="${planCx - partPxW / 2 - 20}" y="${planCy - 6}" fill="#f59e0b" font-size="11" font-weight="bold">A</text>
    <text x="${planCx + partPxW / 2 + 15}" y="${planCy - 6}" fill="#f59e0b" font-size="11" font-weight="bold">A</text>
  </g>

  <!-- VIEW 2: Orthographic Section View A-A -->
  <g id="sectionView">
    <text x="${secCx}" y="65" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">SECTION A-A (CROSS SECTION)</text>
    <text x="${secCx}" y="80" fill="#64748b" font-size="9" text-anchor="middle">FLANGE THICKNESS &amp; CORE RELIEF</text>

    <!-- Cross Section Rect with Hatching -->
    <rect x="${secCx - partPxW / 2}" y="${secCy - secPxH / 2}" width="${partPxW}" height="${secPxH}" fill="url(#hatch)" stroke="#38bdf8" stroke-width="2"/>

    <!-- Center cut hole relief in section -->
    ${
      config.hasBoltCircle || config.hasCenterSlot
        ? `<rect x="${secCx - 30}" y="${secCy - secPxH / 2}" width="60" height="${secPxH}" fill="#060911" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2,2"/>`
        : ''
    }

    <!-- Dimension: Thickness -->
    <g transform="translate(${secCx + partPxW / 2 + 25}, 0)">
      <line x1="0" y1="${secCy - secPxH / 2}" x2="0" y2="${secCy + secPxH / 2}" stroke="#38bdf8" stroke-width="1.2" marker-start="url(#arrow-start)" marker-end="url(#arrow)"/>
      <line x1="-15" y1="${secCy - secPxH / 2}" x2="8" y2="${secCy - secPxH / 2}" stroke="#475569" stroke-width="1"/>
      <line x1="-15" y1="${secCy + secPxH / 2}" x2="8" y2="${secCy + secPxH / 2}" stroke="#475569" stroke-width="1"/>
      <text x="25" y="${secCy + 4}" fill="#38bdf8" font-size="10" font-weight="bold">THK ${tStr}</text>
    </g>

    <!-- Datum Feature Symbol [C] -->
    <g transform="translate(${secCx + partPxW / 2 + 10}, ${secCy - secPxH / 2 - 25})">
      <rect x="0" y="0" width="18" height="18" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="9" y="13" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">C</text>
    </g>
  </g>

  <!-- Engineering Notes Block (Bottom Left) -->
  <g transform="translate(45, ${svgH - 150})">
    <text x="0" y="0" fill="#94a3b8" font-size="10" font-weight="bold">GENERAL FABRICATION NOTES:</text>
    <text x="0" y="18" fill="#64748b" font-size="9">1. INTERPRET DIMENSIONS AND TOLERANCES PER ASME Y14.5-2018.</text>
    <text x="0" y="32" fill="#64748b" font-size="9">2. REMOVE ALL BURRS AND SHARP EDGES (R 0.015 IN. MAX).</text>
    <text x="0" y="46" fill="#64748b" font-size="9">3. ALL UNITS IN ${displayMetric ? 'MILLIMETERS' : 'INCHES'}. TOLERANCE CLASS: ${tier.label.split(':')[0]}.</text>
    <text x="0" y="60" fill="#f59e0b" font-size="9" font-weight="bold">4. UNCALIBRATED VALUES REMAIN FLAGGED NEEDING RAY'S MEASUREMENT.</text>
    <text x="0" y="74" fill="#64748b" font-size="9">5. ENGINE BASELINE: GM SBC 350 (4.400 IN BORE SPACING, 17 HEAD BOLTS).</text>
  </g>
</svg>
  `.trim();
}
