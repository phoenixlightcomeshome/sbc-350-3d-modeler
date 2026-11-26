/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EngineConfig,
  CoordinatedSpecs,
  TransmissionItem,
  TechDrawingSheet,
  TechDrawingCallout
} from '../types/engine';

export type BlueprintPaperTheme = 'blueprint' | 'vellum';

interface SchematicEngineSVGProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  sheet: TechDrawingSheet;
  selectedTarget: string | null;
  onSelectCallout: (callout: TechDrawingCallout) => void;
  paperTheme: BlueprintPaperTheme;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

interface SchematicTransmissionSVGProps {
  transmission: TransmissionItem;
  sheet: TechDrawingSheet;
  selectedTarget: string | null;
  onSelectCallout: (callout: TechDrawingCallout) => void;
  paperTheme: BlueprintPaperTheme;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

function getPalette(theme: BlueprintPaperTheme) {
  if (theme === 'vellum') {
    return {
      bg: '#f8fafc',
      gridMinor: '#e2e8f0',
      gridMajor: '#cbd5e1',
      stroke: '#0f172a',
      strokeMuted: '#475569',
      dimLine: '#0369a1',
      accent: '#c2410c',
      ok: '#15803d',
      warn: '#b45309',
      fillSubtle: '#e2e8f0',
      fillDark: '#cbd5e1',
      balloonBg: '#ffffff',
      balloonActiveBg: '#ea580c',
      balloonActiveText: '#ffffff',
      text: '#0f172a',
      textMuted: '#475569',
      hatch: '#94a3b8'
    };
  }
  return {
    bg: '#091628',
    gridMinor: '#10243e',
    gridMajor: '#183457',
    stroke: '#e2e8f0',
    strokeMuted: '#7dd3fc',
    dimLine: '#38bdf8',
    accent: '#fb923c',
    ok: '#34d399',
    warn: '#fbbf24',
    fillSubtle: '#0e223d',
    fillDark: '#132c4d',
    balloonBg: '#091628',
    balloonActiveBg: '#ea580c',
    balloonActiveText: '#ffffff',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    hatch: '#38bdf8'
  };
}

function findCalloutForTarget(sheet: TechDrawingSheet, target: string): TechDrawingCallout | undefined {
  return sheet.callouts.find((c) => c.targetSubassembly === target);
}

export const SchematicEngineSVG: React.FC<SchematicEngineSVGProps> = ({
  config,
  specs,
  sheet,
  selectedTarget,
  onSelectCallout,
  paperTheme,
  svgRef
}) => {
  const p = getPalette(paperTheme);
  const quenchOk = specs.quenchDistance >= 0.038 && specs.quenchDistance <= 0.055;

  // Dynamic pixel proportions anchored cleanly to parametric values
  const borePx = Math.max(92, Math.min(132, config.bore * 27));
  const cxLeft = 285;
  const deckY = 175;
  const gasketPx = Math.max(7, Math.min(16, config.gasketThickness * 220));
  const deckClearPx = Math.max(4, Math.min(14, config.deckClearance * 340));
  const headBottomY = deckY - gasketPx;
  const pistonCrownY = deckY + deckClearPx;
  const crankCy = 465;

  const balloons: Array<{
    target: string;
    x: number;
    y: number;
    lx: number;
    ly: number;
    fallbackCode: string;
    fallbackTitle: string;
  }> = [
    { target: 'heads', x: 350, y: 122, lx: 432, ly: 86, fallbackCode: 'C-340', fallbackTitle: 'Cylinder Head & E-I-I-E Valvetrain' },
    { target: 'rotating', x: cxLeft + borePx * 0.42, y: pistonCrownY + 34, lx: 432, ly: 205, fallbackCode: 'B-220', fallbackTitle: 'Forged Piston & H-Beam Rod' },
    { target: 'block', x: cxLeft - borePx * 0.56, y: 280, lx: 90, ly: 278, fallbackCode: 'A-101', fallbackTitle: '4-Bolt Cylinder Block Deck' },
    { target: 'crank', x: cxLeft, y: crankCy, lx: 432, ly: 465, fallbackCode: 'B-201', fallbackTitle: '4340 Forged Crankshaft' },
    { target: 'intake', x: 765, y: 125, lx: 765, ly: 66, fallbackCode: 'D-410', fallbackTitle: 'Intake & Holley 4150' },
    { target: 'ignition', x: 965, y: 158, lx: 1058, ly: 102, fallbackCode: 'D-450', fallbackTitle: 'MSD Pro-Billet HEI' },
    { target: 'cam', x: 745, y: 315, lx: 602, ly: 268, fallbackCode: 'C-305', fallbackTitle: 'Camshaft & Timing Set' },
    { target: 'timingCover', x: 640, y: 370, lx: 562, ly: 355, fallbackCode: 'A-114', fallbackTitle: 'Timing Cover & 60-2 Wheel' },
    { target: 'cooling', x: 608, y: 280, lx: 562, ly: 190, fallbackCode: 'E-540', fallbackTitle: 'Water Pump & 160A Alternator' },
    { target: 'lubrication', x: 800, y: 452, lx: 800, ly: 522, fallbackCode: 'E-510', fallbackTitle: 'M55HV Oil Pump & Baffled Pan' },
    { target: 'starter', x: 960, y: 420, lx: 1068, ly: 432, fallbackCode: 'F-605', fallbackTitle: 'Powermaster Mini Starter' }
  ];

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1180 620"
      className="w-full h-auto block select-none"
      role="img"
      aria-label={`Dimensioned CAD schematic for ${sheet.title}`}
    >
      <defs>
        <pattern id="cadGridMinor" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={p.gridMinor} strokeWidth="0.7" />
        </pattern>
        <pattern id="cadGridMajor" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#cadGridMinor)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke={p.gridMajor} strokeWidth="1.1" />
        </pattern>
        <pattern id="sectionHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke={p.hatch} strokeWidth="1.2" opacity="0.45" />
        </pattern>
        <marker id="arrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={p.dimLine} />
        </marker>
        <marker id="arrowOrange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={p.accent} />
        </marker>
      </defs>

      {/* Blueprint Paper & ASME Border Frame */}
      <rect width="1180" height="620" fill={p.bg} />
      <rect width="1180" height="620" fill="url(#cadGridMajor)" />
      <rect x="14" y="14" width="1152" height="592" fill="none" stroke={p.stroke} strokeWidth="1.6" />
      <rect x="19" y="19" width="1142" height="582" fill="none" stroke={p.strokeMuted} strokeWidth="0.7" opacity="0.75" />

      {/* Center Divider between Section A-A (Left) and Longitudinal Elevation (Right) */}
      <line x1="515" y1="24" x2="515" y2="545" stroke={p.gridMajor} strokeWidth="1.2" strokeDasharray="6 4" />

      {/* View Headers */}
      <text x="34" y="42" fill={p.stroke} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        SECTION A-A: CYLINDER, QUENCH &amp; ROTATING GEOMETRY
      </text>
      <text x="536" y="42" fill={p.stroke} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        VIEW B: LONGITUDINAL SUBSYSTEM ELEVATION (FRONT → REAR)
      </text>

      {/* ================= LEFT: SECTION A-A CYLINDER & QUENCH ================= */}
      {/* Cylinder Centerline */}
      <line x1={cxLeft} y1="62" x2={cxLeft} y2="518" stroke={p.dimLine} strokeWidth="1" strokeDasharray="12 4 2 4" opacity="0.7" />

      {/* Cylinder Head Casting Cross-Section */}
      <path
        d={`M ${cxLeft - borePx * 0.85} ${headBottomY}
            L ${cxLeft - borePx * 0.85} 78
            L ${cxLeft + borePx * 0.85} 78
            L ${cxLeft + borePx * 0.85} ${headBottomY}
            L ${cxLeft + borePx * 0.48} ${headBottomY}
            L ${cxLeft + borePx * 0.34} ${headBottomY - 38}
            L ${cxLeft - borePx * 0.16} ${headBottomY - 38}
            L ${cxLeft - borePx * 0.42} ${headBottomY} Z`}
        fill="url(#sectionHatch)"
        stroke={p.stroke}
        strokeWidth="1.8"
      />

      {/* Valves & Springs inside Section A-A */}
      <line x1={cxLeft - 24} y1="86" x2={cxLeft - 14} y2={headBottomY - 12} stroke={p.accent} strokeWidth="2.4" />
      <line x1={cxLeft - 28} y1={headBottomY - 10} x2={cxLeft + 2} y2={headBottomY - 14} stroke={p.accent} strokeWidth="3.5" />
      <line x1={cxLeft + 26} y1="86" x2={cxLeft + 18} y2={headBottomY - 18} stroke={p.dimLine} strokeWidth="2.2" />
      <line x1={cxLeft + 4} y1={headBottomY - 18} x2={cxLeft + 30} y2={headBottomY - 16} stroke={p.dimLine} strokeWidth="3.2" />

      {/* Combustion Chamber Label */}
      <text x={cxLeft + 4} y={headBottomY - 22} textAnchor="middle" fill={p.warn} fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {config.chamberCc.toFixed(1)} cc
      </text>

      {/* Fel-Pro Head Gasket Band */}
      <rect
        x={cxLeft - borePx * 0.84}
        y={headBottomY}
        width={borePx * 0.34}
        height={gasketPx}
        fill={p.accent}
        opacity="0.7"
      />
      <rect
        x={cxLeft + borePx * 0.5}
        y={headBottomY}
        width={borePx * 0.34}
        height={gasketPx}
        fill={p.accent}
        opacity="0.7"
      />

      {/* Quench Pad Highlight Zone (Piston Quench Pad to Cylinder Head Flat) */}
      <rect
        x={cxLeft - borePx * 0.49}
        y={headBottomY}
        width={borePx * 0.24}
        height={gasketPx + deckClearPx}
        fill={quenchOk ? p.ok : p.warn}
        opacity="0.32"
        stroke={quenchOk ? p.ok : p.warn}
        strokeWidth="1"
        strokeDasharray="2 2"
      />

      {/* Cylinder Block Cast Iron Walls (Left & Right Cutaway) */}
      <rect
        x={cxLeft - borePx * 0.84}
        y={deckY}
        width={borePx * 0.34}
        height="175"
        fill="url(#sectionHatch)"
        stroke={p.stroke}
        strokeWidth="1.8"
      />
      <rect
        x={cxLeft + borePx * 0.5}
        y={deckY}
        width={borePx * 0.34}
        height="175"
        fill="url(#sectionHatch)"
        stroke={p.stroke}
        strokeWidth="1.8"
      />

      {/* Piston Assembly (TDC Position) */}
      <rect
        x={cxLeft - borePx * 0.48}
        y={pistonCrownY}
        width={borePx * 0.96}
        height="68"
        rx="3"
        fill={p.fillDark}
        stroke={p.stroke}
        strokeWidth="1.8"
      />
      {/* Top / 2nd / Oil Rings */}
      <line x1={cxLeft - borePx * 0.48} y1={pistonCrownY + 12} x2={cxLeft + borePx * 0.48} y2={pistonCrownY + 12} stroke={p.accent} strokeWidth="2" />
      <line x1={cxLeft - borePx * 0.48} y1={pistonCrownY + 21} x2={cxLeft + borePx * 0.48} y2={pistonCrownY + 21} stroke={p.dimLine} strokeWidth="1.8" />
      <line x1={cxLeft - borePx * 0.48} y1={pistonCrownY + 30} x2={cxLeft + borePx * 0.48} y2={pistonCrownY + 30} stroke={p.ok} strokeWidth="1.8" />

      {/* Wrist Pin */}
      <circle cx={cxLeft} cy={pistonCrownY + 46} r="12" fill={p.bg} stroke={p.stroke} strokeWidth="2" />

      {/* H-Beam Connecting Rod */}
      <path
        d={`M ${cxLeft - 8} ${pistonCrownY + 56}
            L ${cxLeft - 11} ${crankCy - 56}
            L ${cxLeft + 11} ${crankCy - 56}
            L ${cxLeft + 8} ${pistonCrownY + 56} Z`}
        fill={p.fillSubtle}
        stroke={p.stroke}
        strokeWidth="1.7"
      />
      <line x1={cxLeft} y1={pistonCrownY + 62} x2={cxLeft} y2={crankCy - 62} stroke={p.strokeMuted} strokeWidth="1" />

      {/* Crankshaft Throw & Main Centerline */}
      <circle cx={cxLeft} cy={crankCy} r="44" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.6" strokeDasharray="4 3" />
      <circle cx={cxLeft} cy={crankCy - 46} r="17" fill={p.fillDark} stroke={p.accent} strokeWidth="2" />
      <circle cx={cxLeft} cy={crankCy} r="14" fill={p.bg} stroke={p.stroke} strokeWidth="2" />
      <line x1={cxLeft - 62} y1={crankCy} x2={cxLeft + 62} y2={crankCy} stroke={p.dimLine} strokeWidth="1" strokeDasharray="8 3 2 3" />

      {/* ASME DIMENSION LINES — SECTION A-A */}
      {/* 1. Bore Diameter across cylinder */}
      <line x1={cxLeft - borePx * 0.5} y1="186" x2={cxLeft - borePx * 0.5} y2="386" stroke={p.dimLine} strokeWidth="0.9" strokeDasharray="3 3" />
      <line x1={cxLeft + borePx * 0.5} y1="186" x2={cxLeft + borePx * 0.5} y2="386" stroke={p.dimLine} strokeWidth="0.9" strokeDasharray="3 3" />
      <line
        x1={cxLeft - borePx * 0.5}
        y1="376"
        x2={cxLeft + borePx * 0.5}
        y2="376"
        stroke={p.dimLine}
        strokeWidth="1.4"
        markerStart="url(#arrowBlue)"
        markerEnd="url(#arrowBlue)"
      />
      <rect x={cxLeft - 42} y="366" width="84" height="17" fill={p.bg} />
      <text x={cxLeft} y="378" textAnchor="middle" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        Ø {config.bore.toFixed(3)}"
      </text>

      {/* 2. Deck Height (Crank CL to Block Deck) */}
      <line x1="118" y1={deckY} x2={cxLeft - borePx * 0.84} y2={deckY} stroke={p.dimLine} strokeWidth="0.9" />
      <line x1="118" y1={crankCy} x2={cxLeft - 44} y2={crankCy} stroke={p.dimLine} strokeWidth="0.9" />
      <line
        x1="130"
        y1={deckY}
        x2="130"
        y2={crankCy}
        stroke={p.dimLine}
        strokeWidth="1.4"
        markerStart="url(#arrowBlue)"
        markerEnd="url(#arrowBlue)"
      />
      <rect x="64" y="308" width="90" height="32" fill={p.bg} stroke={p.dimLine} strokeWidth="0.8" />
      <text x="109" y="322" textAnchor="middle" fill={p.dimLine} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        DECK HEIGHT
      </text>
      <text x="109" y="335" textAnchor="middle" fill={p.stroke} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {config.deckHeight.toFixed(3)}"
      </text>

      {/* 3. Quench Stackup Callout Box (Gasket + Deck Clearance = Quench) */}
      <line x1={cxLeft - borePx * 0.37} y1={headBottomY + 4} x2="176" y2="128" stroke={quenchOk ? p.ok : p.warn} strokeWidth="1.2" />
      <rect x="34" y="88" width="168" height="62" rx="4" fill={p.bg} stroke={quenchOk ? p.ok : p.warn} strokeWidth="1.2" />
      <text x="44" y="104" fill={quenchOk ? p.ok : p.warn} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        QUENCH: {specs.quenchDistance}"
      </text>
      <text x="44" y="119" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        Gasket: {config.gasketThickness.toFixed(3)}"
      </text>
      <text x="44" y="133" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        Deck Clr: {config.deckClearance.toFixed(3)}"
      </text>
      <text x="44" y="145" fill={p.stroke} fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        SCR {specs.staticCR}:1 / DCR {specs.dynamicCR}:1
      </text>

      {/* 4. Rod Length C-to-C & Stroke Spec */}
      <line x1={cxLeft + 18} y1={pistonCrownY + 46} x2="404" y2={pistonCrownY + 46} stroke={p.dimLine} strokeWidth="0.9" />
      <line x1={cxLeft + 24} y1={crankCy - 46} x2="404" y2={crankCy - 46} stroke={p.dimLine} strokeWidth="0.9" />
      <line
        x1="394"
        y1={pistonCrownY + 46}
        x2="394"
        y2={crankCy - 46}
        stroke={p.dimLine}
        strokeWidth="1.4"
        markerStart="url(#arrowBlue)"
        markerEnd="url(#arrowBlue)"
      />
      <rect x="348" y="294" width="128" height="46" fill={p.bg} stroke={p.dimLine} strokeWidth="0.8" />
      <text x="412" y="309" textAnchor="middle" fill={p.dimLine} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        ROD: {config.rodLength.toFixed(3)}"
      </text>
      <text x="412" y="322" textAnchor="middle" fill={p.stroke} fontSize="10" fontFamily="JetBrains Mono, monospace">
        STROKE: {config.stroke.toFixed(3)}"
      </text>
      <text x="412" y="334" textAnchor="middle" fill={p.textMuted} fontSize="9" fontFamily="JetBrains Mono, monospace">
        R/S {specs.rodStrokeRatio}:1 · {specs.maxRodAngleDeg}°
      </text>

      {/* 5. Ring Gap & PTW Callout Box */}
      <rect x="34" y="428" width="174" height="62" rx="4" fill={p.bg} stroke={p.strokeMuted} strokeWidth="1" />
      <text x="44" y="444" fill={p.stroke} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        RING GAPS &amp; VALVE LIFT
      </text>
      <text x="44" y="458" fill={p.dimLine} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        Top {specs.topRingGap}" / 2nd {specs.secondRingGap}"
      </text>
      <text x="44" y="471" fill={p.dimLine} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        Oil {specs.oilRingGap.toFixed(3)}" · Lift {specs.totalValveLift}"
      </text>
      <text x="44" y="484" fill={p.ok} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        Alloys: {config.pistonAlloy.toUpperCase()}
      </text>

      {/* ================= RIGHT: LONGITUDINAL ENGINE ELEVATION ================= */}
      {/* Datum Centerline Crank */}
      <line x1="540" y1="365" x2="1130" y2="365" stroke={p.dimLine} strokeWidth="1" strokeDasharray="12 4 2 4" opacity="0.7" />
      {/* Datum Tag -A- */}
      <rect x="540" y="354" width="22" height="22" fill={p.bg} stroke={p.dimLine} strokeWidth="1.2" />
      <text x="551" y="369" textAnchor="middle" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        A
      </text>

      {/* Main Engine Block Silhouette */}
      <rect x="655" y="232" width="320" height="156" rx="4" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.8" />
      {/* Cylinder Head + Finned Valve Cover */}
      <rect x="665" y="168" width="300" height="64" rx="2" fill="url(#sectionHatch)" stroke={p.stroke} strokeWidth="1.6" />
      <rect x="672" y="138" width="270" height="30" rx="4" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.6" />
      {/* Exhaust Header Flanges (4 ports scaled with headerPrimaryIn) */}
      {[700, 775, 850, 925].map((px) => (
        <circle
          key={px}
          cx={px}
          cy="206"
          r={Math.round(12 + ((config.headerPrimaryIn ?? 1.625) - 1.5) * 9)}
          fill={p.bg}
          stroke={p.accent}
          strokeWidth="1.6"
        />
      ))}

      {/* Intake & Carburetor */}
      <rect x="720" y="110" width="145" height="28" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.5" />
      <rect x="742" y="76" width="96" height="34" rx="2" fill={p.fillDark} stroke={p.accent} strokeWidth="1.6" />
      <text x="790" y="92" textAnchor="middle" fill={p.stroke} fontSize="9" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {config.carbCfm} CFM · {(config.carbVenturiIn ?? 1.375).toFixed(2)}"
      </text>
      <text x="790" y="104" textAnchor="middle" fill={p.dimLine} fontSize="8" fontFamily="JetBrains Mono, monospace">
        {config.intakePortCc ?? 185}cc / {config.exhaustPortCc ?? 68}cc
      </text>

      {/* MSD HEI Distributor (Rear Right) */}
      <rect x="945" y="128" width="36" height="44" rx="3" fill={p.fillDark} stroke={p.accent} strokeWidth="1.6" />
      <line x1="963" y1="172" x2="963" y2="232" stroke={p.stroke} strokeWidth="2.5" />

      {/* Timing Cover, 60-2 Trigger & Harmonic Damper (Front Left of Engine) */}
      <rect x="628" y="255" width="27" height="125" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.6" />
      <rect x="596" y="328" width="32" height="74" rx="3" fill={p.fillSubtle} stroke={p.dimLine} strokeWidth="1.6" />
      {/* Water Pump & Alternator */}
      <rect x="590" y="252" width="38" height="48" rx="3" fill={p.fillDark} stroke={p.dimLine} strokeWidth="1.5" />
      <circle cx="628" cy="215" r="24" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.5" />

      {/* Deep Sump Oil Pan */}
      <path d="M 655 388 L 975 388 L 975 462 L 800 462 L 775 426 L 655 426 Z" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.8" />
      {/* Mini Starter */}
      <rect x="920" y="395" width="76" height="38" rx="4" fill={p.fillSubtle} stroke={p.accent} strokeWidth="1.5" />
      {/* Rear Bellhousing Flange & Flywheel */}
      <rect x="975" y="245" width="22" height="145" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.8" />

      {/* Overall Engine Length & Clearance Callouts */}
      <line x1="596" y1="490" x2="997" y2="490" stroke={p.dimLine} strokeWidth="1.4" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
      <line x1="596" y1="405" x2="596" y2="500" stroke={p.dimLine} strokeWidth="0.9" />
      <line x1="997" y1="395" x2="997" y2="500" stroke={p.dimLine} strokeWidth="0.9" />
      <rect x="708" y="480" width="180" height="18" fill={p.bg} />
      <text x="798" y="493" textAnchor="middle" fill={p.dimLine} fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        SBC ASSEMBLY 28.00" OAL
      </text>

      {/* Interactive Balloon Callouts across both views */}
      {balloons.map((b) => {
        const callout = findCalloutForTarget(sheet, b.target);
        const code = callout?.indexCode || b.fallbackCode;
        const isSel = selectedTarget === b.target;
        const handleClick = () => {
          if (callout) {
            onSelectCallout(callout);
          } else {
            onSelectCallout({
              row: code.charAt(0) || 'A',
              indexCode: code,
              partName: b.fallbackTitle,
              category: 'Engine Assembly',
              targetSubassembly: b.target
            });
          }
        };
        return (
          <g
            key={b.target}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
            <line
              x1={b.x}
              y1={b.y}
              x2={b.lx}
              y2={b.ly}
              stroke={isSel ? p.accent : p.strokeMuted}
              strokeWidth={isSel ? 2 : 1.1}
              markerStart={isSel ? 'url(#arrowOrange)' : undefined}
            />
            <circle cx={b.x} cy={b.y} r="3.5" fill={isSel ? p.accent : p.dimLine} />
            <rect
              x={b.lx - 29}
              y={b.ly - 12}
              width="58"
              height="24"
              rx="12"
              fill={isSel ? p.balloonActiveBg : p.balloonBg}
              stroke={isSel ? p.accent : p.dimLine}
              strokeWidth={isSel ? 2 : 1.3}
            />
            <text
              x={b.lx}
              y={b.ly + 4}
              textAnchor="middle"
              fill={isSel ? p.balloonActiveText : p.stroke}
              fontSize="10"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {code}
            </text>
          </g>
        );
      })}

      {/* ASME Technical Title Block (Bottom Strip) */}
      <rect x="19" y="545" width="1142" height="56" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.4" />
      <line x1="390" y1="545" x2="390" y2="601" stroke={p.stroke} strokeWidth="1.2" />
      <line x1="780" y1="545" x2="780" y2="601" stroke={p.stroke} strokeWidth="1.2" />
      <line x1="990" y1="545" x2="990" y2="601" stroke={p.stroke} strokeWidth="1.2" />

      <text x="34" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        TITLE / ENGINE ASSEMBLY
      </text>
      <text x="34" y="587" fill={p.stroke} fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
        {sheet.title.slice(0, 44)}
      </text>

      <text x="406" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        CONFIRMED DIMENSIONS &amp; OUTPUT
      </text>
      <text x="406" y="587" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {specs.displacementCi} CID · {specs.staticCR}:1 CR · {specs.peakHp} HP / {specs.peakTq} TQ
      </text>

      <text x="796" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        DRAWING NUMBER
      </text>
      <text x="796" y="587" fill={p.accent} fontSize="11.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {sheet.drawingNumber}
      </text>

      <text x="1006" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        TOLERANCE STD
      </text>
      <text x="1006" y="587" fill={p.stroke} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        ASME Y14.5 · IN / CC
      </text>
    </svg>
  );
};

export const SchematicTransmissionSVG: React.FC<SchematicTransmissionSVGProps> = ({
  transmission,
  sheet,
  selectedTarget,
  onSelectCallout,
  paperTheme,
  svgRef
}) => {
  const p = getPalette(paperTheme);
  const isAuto = transmission.type === 'Automatic';
  const clY = 268;

  const balloons: Array<{
    target: string;
    x: number;
    y: number;
    lx: number;
    ly: number;
    fallbackCode: string;
    fallbackTitle: string;
  }> = [
    { target: 'bellhousing', x: 195, y: 205, lx: 120, ly: 105, fallbackCode: 'C-700', fallbackTitle: 'Bellhousing Flange' },
    { target: 'converter', x: 300, y: 215, lx: 292, ly: 105, fallbackCode: 'A-001', fallbackTitle: isAuto ? 'Torque Converter' : 'Flywheel & Clutch' },
    { target: 'frontPump', x: 422, y: 212, lx: 432, ly: 105, fallbackCode: 'A-500', fallbackTitle: isAuto ? 'Front Oil Pump' : 'Input Retainer' },
    { target: 'clutchPack', x: 545, y: 222, lx: 568, ly: 105, fallbackCode: 'B-554', fallbackTitle: isAuto ? 'Multi-Disc Clutch Pack' : 'Synchro Hub Pack' },
    { target: 'mainCase', x: 660, y: 200, lx: 718, ly: 105, fallbackCode: 'C-582', fallbackTitle: 'Planetary / Helical Main Case' },
    { target: 'valveBody', x: 605, y: 368, lx: 485, ly: 452, fallbackCode: 'D-740', fallbackTitle: isAuto ? 'Valve Body & Filter' : 'Countershaft Cluster' },
    { target: 'pan', x: 625, y: 405, lx: 675, ly: 452, fallbackCode: 'D-765', fallbackTitle: 'Deep Sump Pan' },
    { target: 'tailhousing', x: 845, y: 235, lx: 882, ly: 105, fallbackCode: 'F-770', fallbackTitle: 'Overdrive Tailhousing' },
    { target: 'slipYoke', x: 1020, y: 268, lx: 1045, ly: 148, fallbackCode: 'F-790', fallbackTitle: '1350 Output Slip Yoke' }
  ];

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1180 620"
      className="w-full h-auto block select-none"
      role="img"
      aria-label={`Dimensioned transmission schematic for ${transmission.name}`}
    >
      <defs>
        <pattern id="transGridMinor" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={p.gridMinor} strokeWidth="0.7" />
        </pattern>
        <pattern id="transGridMajor" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#transGridMinor)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke={p.gridMajor} strokeWidth="1.1" />
        </pattern>
        <pattern id="transHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke={p.hatch} strokeWidth="1.2" opacity="0.4" />
        </pattern>
        <marker id="tArrowBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={p.dimLine} />
        </marker>
      </defs>

      <rect width="1180" height="620" fill={p.bg} />
      <rect width="1180" height="620" fill="url(#transGridMajor)" />
      <rect x="14" y="14" width="1152" height="592" fill="none" stroke={p.stroke} strokeWidth="1.6" />
      <rect x="19" y="19" width="1142" height="582" fill="none" stroke={p.strokeMuted} strokeWidth="0.7" opacity="0.75" />

      {/* Sheet Heading */}
      <text x="34" y="42" fill={p.stroke} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        EXPLODED &amp; SECTIONED DRIVELINE SCHEMATIC — {transmission.type.toUpperCase()} ({transmission.ratios.length}-SPEED)
      </text>
      <text x="1146" y="42" textAnchor="end" fill={p.dimLine} fontSize="11.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        PATTERN: {transmission.nativePattern} · OAL {transmission.lengthInches.toFixed(1)}"
      </text>

      {/* Main Driveline Centerline */}
      <line x1="55" y1={clY} x2="1125" y2={clY} stroke={p.dimLine} strokeWidth="1.1" strokeDasharray="14 4 2 4" opacity="0.75" />
      {/* Datum Flange -A- */}
      <rect x="122" y="162" width="22" height="22" fill={p.bg} stroke={p.dimLine} strokeWidth="1.2" />
      <text x="133" y="177" textAnchor="middle" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        A
      </text>

      {/* 1. Bellhousing Flange */}
      <path
        d={`M 148 164 L 222 184 L 245 204 L 245 332 L 222 352 L 148 372 Z`}
        fill="url(#transHatch)"
        stroke={selectedTarget === 'bellhousing' ? p.accent : p.stroke}
        strokeWidth={selectedTarget === 'bellhousing' ? 2.6 : 1.8}
      />

      {/* 2. Torque Converter OR Flywheel & Clutch */}
      <rect
        x="262"
        y="196"
        width="76"
        height="144"
        rx={isAuto ? '28' : '4'}
        fill={p.fillDark}
        stroke={selectedTarget === 'converter' ? p.accent : p.warn}
        strokeWidth={selectedTarget === 'converter' ? 2.6 : 1.8}
      />
      <text x="300" y={clY + 4} textAnchor="middle" fill={p.stroke} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {isAuto ? `${transmission.defaultStall || 2400} STALL` : 'CLUTCH'}
      </text>

      {/* 3. Front Oil Pump / Bearing Retainer */}
      <rect
        x="388"
        y="206"
        width="64"
        height="124"
        rx="4"
        fill={p.fillSubtle}
        stroke={selectedTarget === 'frontPump' ? p.accent : p.dimLine}
        strokeWidth={selectedTarget === 'frontPump' ? 2.6 : 1.6}
      />
      <rect x="350" y="252" width="38" height="32" fill={p.fillDark} stroke={p.stroke} strokeWidth="1.4" />

      {/* 4. Multi-Disc Clutch Pack / Synchro Stack */}
      <g>
        {[0, 1, 2, 3, 4].map((idx) => (
          <rect
            key={idx}
            x={488 + idx * 18}
            y="214"
            width="10"
            height="108"
            rx="2"
            fill={idx % 2 === 0 ? p.accent : p.dimLine}
            opacity="0.72"
            stroke={selectedTarget === 'clutchPack' ? p.accent : p.stroke}
            strokeWidth="1"
          />
        ))}
      </g>

      {/* 5. Ribbed Aluminum Main Case & Planetary / Helical Gearset */}
      <rect
        x="595"
        y="188"
        width="178"
        height="160"
        rx="6"
        fill="url(#transHatch)"
        stroke={selectedTarget === 'mainCase' ? p.accent : p.stroke}
        strokeWidth={selectedTarget === 'mainCase' ? 2.6 : 1.8}
      />
      {/* Internal Stepped Gears */}
      {[626, 668, 710, 744].map((gx, gi) => (
        <rect
          key={gx}
          x={gx}
          y={clY - (48 - gi * 8)}
          width="24"
          height={(48 - gi * 8) * 2}
          rx="2"
          fill={p.fillDark}
          stroke={p.dimLine}
          strokeWidth="1.4"
        />
      ))}
      <rect x="580" y="257" width="210" height="22" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.2" />

      {/* 6. Valve Body / Filter (or Manual Countershaft) */}
      <rect
        x="568"
        y="355"
        width="186"
        height="28"
        rx="2"
        fill={p.fillDark}
        stroke={selectedTarget === 'valveBody' ? p.accent : p.dimLine}
        strokeWidth={selectedTarget === 'valveBody' ? 2.4 : 1.5}
      />
      {/* 7. Deep Sump Pan */}
      <path
        d="M 556 392 L 766 392 L 752 422 L 570 422 Z"
        fill={p.fillSubtle}
        stroke={selectedTarget === 'pan' ? p.accent : p.stroke}
        strokeWidth={selectedTarget === 'pan' ? 2.4 : 1.6}
      />

      {/* 8. Extension Tailhousing / Overdrive Unit */}
      <path
        d="M 792 204 L 936 238 L 936 298 L 792 332 Z"
        fill="url(#transHatch)"
        stroke={selectedTarget === 'tailhousing' ? p.accent : p.stroke}
        strokeWidth={selectedTarget === 'tailhousing' ? 2.6 : 1.8}
      />

      {/* 9. Output Slip Yoke & 1350 U-Joint */}
      <rect
        x="964"
        y="248"
        width="76"
        height="40"
        rx="4"
        fill={p.fillDark}
        stroke={selectedTarget === 'slipYoke' ? p.accent : p.stroke}
        strokeWidth={selectedTarget === 'slipYoke' ? 2.6 : 1.6}
      />
      <circle cx="1055" cy={clY} r="18" fill={p.fillSubtle} stroke={p.accent} strokeWidth="1.8" />

      {/* Overall Length Dimension Line (Bellhousing Face -> Tailshaft Output) */}
      <line x1="148" y1="376" x2="148" y2="512" stroke={p.dimLine} strokeWidth="0.9" />
      <line x1="936" y1="302" x2="936" y2="512" stroke={p.dimLine} strokeWidth="0.9" />
      <line x1="148" y1="500" x2="936" y2="500" stroke={p.dimLine} strokeWidth="1.5" markerStart="url(#tArrowBlue)" markerEnd="url(#tArrowBlue)" />
      <rect x="444" y="490" width="196" height="20" fill={p.bg} />
      <text x="542" y="504" textAnchor="middle" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        OAL LENGTH: {transmission.lengthInches.toFixed(1)}"
      </text>

      {/* Ratio Schedule Box */}
      <rect x="34" y="424" width="330" height="58" rx="4" fill={p.bg} stroke={p.dimLine} strokeWidth="1" />
      <text x="46" y="442" fill={p.stroke} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        GEAR RATIO SCHEDULE (REV {transmission.reverse.toFixed(2)}:1)
      </text>
      <text x="46" y="460" fill={p.dimLine} fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {transmission.ratios.map((r, i) => `G${i + 1} ${r.toFixed(2)}`).join(' · ')}
      </text>
      <text x="46" y="475" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        {transmission.clutch}
      </text>

      {/* Interactive Balloon Callouts */}
      {balloons.map((b) => {
        const callout = findCalloutForTarget(sheet, b.target);
        const code = callout?.indexCode || b.fallbackCode;
        const isSel = selectedTarget === b.target;
        const handleClick = () => {
          if (callout) {
            onSelectCallout(callout);
          } else {
            onSelectCallout({
              row: code.charAt(0) || 'A',
              indexCode: code,
              partName: b.fallbackTitle,
              category: 'Transmission Assembly',
              targetSubassembly: b.target
            });
          }
        };
        return (
          <g key={b.target} onClick={handleClick} style={{ cursor: 'pointer' }}>
            <line
              x1={b.x}
              y1={b.y}
              x2={b.lx}
              y2={b.ly}
              stroke={isSel ? p.accent : p.strokeMuted}
              strokeWidth={isSel ? 2 : 1.1}
            />
            <circle cx={b.x} cy={b.y} r="3.5" fill={isSel ? p.accent : p.dimLine} />
            <rect
              x={b.lx - 38}
              y={b.ly - 12}
              width="76"
              height="24"
              rx="12"
              fill={isSel ? p.balloonActiveBg : p.balloonBg}
              stroke={isSel ? p.accent : p.dimLine}
              strokeWidth={isSel ? 2 : 1.3}
            />
            <text
              x={b.lx}
              y={b.ly + 4}
              textAnchor="middle"
              fill={isSel ? p.balloonActiveText : p.stroke}
              fontSize="9.5"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {code.slice(0, 10)}
            </text>
          </g>
        );
      })}

      {/* ASME Technical Title Block */}
      <rect x="19" y="545" width="1142" height="56" fill={p.fillSubtle} stroke={p.stroke} strokeWidth="1.4" />
      <line x1="430" y1="545" x2="430" y2="601" stroke={p.stroke} strokeWidth="1.2" />
      <line x1="805" y1="545" x2="805" y2="601" stroke={p.stroke} strokeWidth="1.2" />
      <line x1="1005" y1="545" x2="1005" y2="601" stroke={p.stroke} strokeWidth="1.2" />

      <text x="34" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        TITLE / TRANSMISSION UNIT
      </text>
      <text x="34" y="587" fill={p.stroke} fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
        {sheet.title.slice(0, 48)}
      </text>

      <text x="446" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        BELLHOUSING &amp; LENGTH SPEC
      </text>
      <text x="446" y="587" fill={p.dimLine} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {transmission.nativePattern} · {transmission.lengthInches.toFixed(1)}" OAL
      </text>

      <text x="820" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        DRAWING NUMBER
      </text>
      <text x="820" y="587" fill={p.accent} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {sheet.drawingNumber.slice(0, 22)}
      </text>

      <text x="1020" y="566" fill={p.textMuted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
        STANDARD
      </text>
      <text x="1020" y="587" fill={p.stroke} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        SAE J617 / IN
      </text>
    </svg>
  );
};
